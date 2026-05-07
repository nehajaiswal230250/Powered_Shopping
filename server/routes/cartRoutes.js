import { Router } from "express";
import {
  getCart,
  addToCart,
  removeFromCart,
  checkout,
  createRazorpayOrder,
  verifyRazorpayPayment
} from "../controllers/cartController.js";

const router = Router();

router.get("/", getCart);
router.post("/add", addToCart);
router.post("/remove", removeFromCart);
router.post("/checkout", checkout);
router.post("/razorpay/order", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);

export default router;
