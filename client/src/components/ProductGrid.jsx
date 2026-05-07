import ProductCard from "./ProductCard";

export default function ProductGrid({ products, onAdd, isLoading, aiFocusProductId }) {
  if (isLoading) {
    return <div className="glass status">Loading products...</div>;
  }

  if (!products.length) {
    return <div className="glass status">No products found for this command.</div>;
  }

  return (
    <section className="grid-wrap">
      <div className="grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={onAdd}
            isAiFocus={Boolean(aiFocusProductId) && product.id === aiFocusProductId}
          />
        ))}
      </div>
    </section>
  );
}
