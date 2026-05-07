import { cartStore } from "../services/cartStore.js";
import { getProducts } from "../services/productService.js";
import crypto from "node:crypto";

const resolveCartId = (req) =>
  req.headers["x-cart-id"] ||
  req.query.cartId ||
  req.body?.cartId ||
  process.env.DEFAULT_CART_ID ||
  "default";

const summarizeCart = async (cartId) => {
  const items = await cartStore.getItems(cartId);
  const total = items.reduce((sum, i) => sum + i.product.priceInr * i.quantity, 0);
  return {
    items,
    total,
    count: items.reduce((sum, i) => sum + i.quantity, 0)
  };
};

const summarizeCheckout = async (cartId) => {
  const cart = await summarizeCart(cartId);
  const shippingFee = cart.total > 4999 ? 0 : 199;
  const taxAmount = Math.round(cart.total * 0.05);
  const payable = cart.total + shippingFee + taxAmount;

  return {
    ...cart,
    shippingFee,
    taxAmount,
    payable
  };
};

const getRazorpayAuthHeader = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
};

const getRazorpayConfigStatus = () => ({
  hasKeyId: Boolean(process.env.RAZORPAY_KEY_ID),
  hasKeySecret: Boolean(process.env.RAZORPAY_KEY_SECRET)
});

export const getCart = async (req, res) => {
  try {
    const cartId = resolveCartId(req);
    const summary = await summarizeCart(cartId);
    res.json({ success: true, cartId, ...summary });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch cart." });
  }
};

export const addToCart = async (req, res) => {
  try {
    const cartId = resolveCartId(req);
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required." });
    }

    const products = await getProducts();
    const product = products.find((p) => p.id === Number(productId));
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    await cartStore.add(cartId, product);
    const summary = await summarizeCart(cartId);
    return res.json({ success: true, message: "Item added to cart.", cartId, ...summary });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to add item." });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const cartId = resolveCartId(req);
    const { productId, titleQuery } = req.body;

    if (!productId && !titleQuery) {
      return res
        .status(400)
        .json({ success: false, message: "productId or titleQuery is required." });
    }

    if (productId) {
      await cartStore.removeByProductId(cartId, Number(productId));
    } else {
      await cartStore.removeByTitle(cartId, titleQuery);
    }

    const summary = await summarizeCart(cartId);
    return res.json({ success: true, message: "Item removed from cart.", cartId, ...summary });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to remove item." });
  }
};

export const checkout = async (req, res) => {
  try {
    const cartId = resolveCartId(req);
    const summary = await summarizeCheckout(cartId);

    if (!summary.count) {
      return res.status(400).json({ success: false, message: "Cart is empty." });
    }

    const orderId = `ORD-${Date.now().toString().slice(-8)}`;
    await cartStore.clear(cartId);

    return res.json({
      success: true,
      message: "Checkout successful.",
      cartId,
      orderId,
      paidAmount: summary.payable
    });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to checkout." });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const cartId = resolveCartId(req);
    const summary = await summarizeCheckout(cartId);

    if (!summary.count) {
      return res.status(400).json({ success: false, message: "Cart is empty." });
    }

    const authHeader = getRazorpayAuthHeader();
    if (!authHeader) {
      const status = getRazorpayConfigStatus();
      return res.status(400).json({
        success: false,
        message:
          "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.",
        configStatus: status
      });
    }

    const receipt = `rcpt_${Date.now().toString().slice(-10)}`;
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Math.round(summary.payable * 100),
        currency: "INR",
        receipt,
        notes: {
          cartId
        }
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.id) {
      return res.status(500).json({
        success: false,
        message: data?.error?.description || "Failed to create Razorpay order."
      });
    }

    return res.json({
      success: true,
      cartId,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      payable: summary.payable
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error?.message && /fetch failed|network|timed out|ECONN|ENOTFOUND/i.test(error.message)
          ? `Unable to reach Razorpay from the server. ${error.message}`
          : error?.message || "Failed to create Razorpay order."
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const cartId = resolveCartId(req);
    const summary = await summarizeCheckout(cartId);
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      customerName
    } = req.body || {};

    if (!summary.count) {
      return res.status(400).json({ success: false, message: "Cart is empty." });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay payment details." });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(400).json({
        success: false,
        message: "Razorpay secret is not configured in server/.env."
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Razorpay signature verification failed." });
    }

    const orderId = `ORD-${Date.now().toString().slice(-8)}`;
    await cartStore.clear(cartId);

    return res.json({
      success: true,
      cartId,
      orderId,
      paidAmount: summary.payable,
      paymentId: razorpayPaymentId,
      customerName: customerName || ""
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to verify Razorpay payment."
    });
  }
};
