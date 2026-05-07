export default function ShowcasePanel({ items }) {
  return (
    <section className="showcase glass">
      <div className="showcase-head">
        <div>
          <h2>Featured Showcase</h2>
          <p className="status">Curated product cards used to preview the visual system.</p>
        </div>
        <span className="panel-count">Curated</span>
      </div>

      <div className="showcase-grid">
        {items.map((item) => (
          <article key={item.id} className="showcase-card">
            <img src={item.image} alt={item.title} loading="lazy" />
            <div>
              <h3>{item.title}</h3>
              <p>{item.category}</p>
              <p>
                ₹{item.priceInr.toLocaleString("en-IN")} • ⭐ {item.rating.rate}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
