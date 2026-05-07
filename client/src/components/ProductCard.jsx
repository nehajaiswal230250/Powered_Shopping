export default function ProductCard({ product, onAdd, isAiFocus = false }) {
  return (
    <article
      id={`product-${product.id}`}
      data-product-id={product.id}
      className={`product-card glass ${isAiFocus ? "ai-focus" : ""}`}
    >
      {isAiFocus ? <span className="ai-focus-tag">AI match</span> : null}
      <img src={product.image} alt={product.title} loading="lazy" />
      <div className="content">
        <div className="card-head">
          <h3>{product.title}</h3>
          <span className="category-badge">{product.category}</span>
        </div>
        {product.brand ? <p className="brand-line">{product.brand}</p> : null}
        {product.description ? <p className="desc">{product.description}</p> : null}
        <p className="meta">
          <strong>₹{product.priceInr.toLocaleString("en-IN")}</strong>
          <span>Rating {product.rating.rate} / 5</span>
          <span>{product.rating.count} reviews</span>
        </p>
        <button onClick={() => onAdd(product.id)}>Add to cart</button>
      </div>
    </article>
  );
}
