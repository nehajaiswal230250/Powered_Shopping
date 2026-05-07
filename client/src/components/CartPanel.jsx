export default function CartPanel({ cart, onRemove, onProceedCheckout }) {
  return (
    <aside className="glass cart-panel">
      <div className="cart-head">
        <div>
          <h2>Cart</h2>
          <p className="status">Items selected for checkout.</p>
        </div>
        <p>{cart.count} items</p>
      </div>

      <div className="cart-items">
        {cart.items.length ? (
          cart.items.map((item) => (
            <div key={item.product.id} className="cart-item">
              <p>{item.product.title}</p>
              <p>
                {item.quantity} x Rs {item.product.priceInr.toLocaleString("en-IN")}
              </p>
              <button onClick={() => onRemove(item.product.id)}>Remove</button>
            </div>
          ))
        ) : (
          <p className="status">Cart is empty.</p>
        )}
      </div>

      <div className="cart-foot">
        <p>Total: Rs {cart.total.toLocaleString("en-IN")}</p>
        <button disabled={!cart.count} onClick={onProceedCheckout}>
          Add details and pay
        </button>
      </div>
    </aside>
  );
}
