import { useMemo, useState } from "react";

export default function CheckoutPanel({
  cart,
  form,
  isProcessing,
  orderResult,
  onPlaceOrder,
  onBackToCart,
  onContinueShopping,
  checkoutError = "",
  onFormChange
}) {
  const [step, setStep] = useState(1);

  const subtotal = cart.total;
  const shippingFee = useMemo(() => (subtotal > 4999 ? 0 : 199), [subtotal]);
  const taxAmount = useMemo(() => Math.round(subtotal * 0.05), [subtotal]);
  const payable = subtotal + shippingFee + taxAmount;

  const canGoStep2 =
    form.fullName.trim() && form.email.trim() && form.phone.trim() && form.address.trim() && form.city.trim();

  const canPlaceOrder =
    canGoStep2 &&
    (form.paymentMethod !== "card" || (form.cardName.trim() && form.cardLast4.trim().length === 4));

  const updateField = (key, value) => {
    onFormChange(key, value);
  };

  const handlePlaceOrder = async () => {
    if (!canPlaceOrder) {
      return;
    }

    await onPlaceOrder({
      form,
      summary: {
        subtotal,
        shippingFee,
        taxAmount,
        payable
      }
    });
  };

  if (orderResult) {
    return (
      <section className="glass checkout-shell">
        <div className="checkout-success">
          <p className="success-badge">Order Confirmed</p>
          <h2>Thank you, {orderResult.customerName || "Shopper"}</h2>
          <p>
            Order ID: <strong>{orderResult.orderId}</strong>
          </p>
          <p>
            Amount Paid: <strong>Rs {orderResult.paidAmount.toLocaleString("en-IN")}</strong>
          </p>
          <p className="status">Delivery ETA: 3-5 business days</p>
          <button type="button" onClick={onContinueShopping}>
            Continue Shopping
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="glass checkout-shell">
      <div className="checkout-head">
        <div>
          <p className="eyebrow">Protected Flow</p>
          <h2>Secure Checkout</h2>
          <p className="status">Review delivery, payment, and order confirmation in one place.</p>
        </div>
        <div className="checkout-head-meta">
          <span>Step {step} of 3</span>
          <strong>Rs {payable.toLocaleString("en-IN")}</strong>
        </div>
      </div>

      <div className="checkout-steps">
        <span className={step >= 1 ? "active" : ""}>1. Delivery</span>
        <span className={step >= 2 ? "active" : ""}>2. Payment</span>
        <span className={step >= 3 ? "active" : ""}>3. Review</span>
      </div>

      <div className="checkout-grid">
        <div className="checkout-form">
          {step === 1 ? (
            <div className="checkout-section">
              <h3>Delivery Information</h3>
              <p className="status">Use the shipping address where you want the order delivered.</p>
              <div className="checkout-fields">
                <label>
                  Full Name
                  <input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} />
                </label>
                <label>
                  Email
                  <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                </label>
                <label>
                  Phone
                  <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                </label>
                <label>
                  Address
                  <input value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                </label>
                <label>
                  City
                  <input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                </label>
                <label>
                  ZIP
                  <input value={form.zip} onChange={(e) => updateField("zip", e.target.value)} />
                </label>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="checkout-section">
              <h3>Payment Method</h3>
              <p className="status">Choose a payment option and confirm your checkout preference.</p>
              <div className="payment-methods">
                <button
                  type="button"
                  className={form.paymentMethod === "card" ? "active" : ""}
                  onClick={() => updateField("paymentMethod", "card")}
                >
                  Card
                </button>
                <button
                  type="button"
                  className={form.paymentMethod === "upi" ? "active" : ""}
                  onClick={() => updateField("paymentMethod", "upi")}
                >
                  UPI
                </button>
                <button
                  type="button"
                  className={form.paymentMethod === "cod" ? "active" : ""}
                  onClick={() => updateField("paymentMethod", "cod")}
                >
                  Cash on Delivery
                </button>
              </div>

              {form.paymentMethod === "card" ? (
                <div className="checkout-fields">
                  <label>
                    Name on Card
                    <input value={form.cardName} onChange={(e) => updateField("cardName", e.target.value)} />
                  </label>
                  <label>
                    Card Last 4 Digits
                    <input
                      maxLength={4}
                      value={form.cardLast4}
                      onChange={(e) => updateField("cardLast4", e.target.value.replace(/\D/g, ""))}
                    />
                  </label>
                </div>
              ) : (
                <p className="status">
                  {form.paymentMethod === "upi"
                    ? "You selected UPI. Razorpay will open on the next step for payment."
                    : `You selected ${form.paymentMethod.toUpperCase()} payment.`}
                </p>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="checkout-section">
              <h3>Review and Place Order</h3>
              <div className="review-grid">
                <div className="review-card">
                  <span>Ship to</span>
                  <strong>{form.fullName || "Pending details"}</strong>
                  <p>{[form.address, form.city, form.zip].filter(Boolean).join(", ") || "Address not added yet"}</p>
                </div>
                <div className="review-card">
                  <span>Contact</span>
                  <strong>{form.email || "Pending email"}</strong>
                  <p>{form.phone || "Phone number not added yet"}</p>
                </div>
                <div className="review-card">
                  <span>Payment</span>
                  <strong>{form.paymentMethod.toUpperCase()}</strong>
                  <p>{form.paymentMethod === "card" ? "Card verification ready" : "Alternative payment selected"}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="checkout-actions">
            {checkoutError ? <p className="error">{checkoutError}</p> : null}
            <button type="button" className="secondary" onClick={onBackToCart}>
              Back to Cart
            </button>
            {step > 1 ? (
              <button type="button" className="secondary" onClick={() => setStep((s) => s - 1)}>
                Previous
              </button>
            ) : null}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !canGoStep2) || isProcessing}
              >
                Next
              </button>
            ) : (
              <button type="button" onClick={handlePlaceOrder} disabled={!canPlaceOrder || isProcessing}>
                {isProcessing
                  ? "Processing..."
                  : form.paymentMethod === "upi"
                    ? "Pay with Razorpay UPI"
                    : "Place Order"}
              </button>
            )}
          </div>
        </div>

        <aside className="checkout-summary glass">
          <div className="checkout-summary-head">
            <div>
              <h3>Order Summary</h3>
              <p className="status">Final pricing and items in this checkout.</p>
            </div>
            <span>{cart.count} items</span>
          </div>

          <div className="summary-rows">
            <p><span>Subtotal</span><strong>Rs {subtotal.toLocaleString("en-IN")}</strong></p>
            <p><span>Shipping</span><strong>{shippingFee ? `Rs ${shippingFee.toLocaleString("en-IN")}` : "Free"}</strong></p>
            <p><span>Tax</span><strong>Rs {taxAmount.toLocaleString("en-IN")}</strong></p>
          </div>

          <p className="payable">Payable: Rs {payable.toLocaleString("en-IN")}</p>

          <div className="summary-items">
            {cart.items.map((item) => (
              <div key={item.product.id} className="summary-item">
                <span>{item.product.title}</span>
                <strong>
                  {item.quantity} x Rs {item.product.priceInr.toLocaleString("en-IN")}
                </strong>
              </div>
            ))}
          </div>

          <div className="checkout-trust">
            <span>Protected checkout</span>
            <p>Encrypted order flow with guided review before confirmation.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
