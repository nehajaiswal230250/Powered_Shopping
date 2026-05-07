export default function RecommendationsPanel({ items, onAdd }) {
  return (
    <section className="glass recommendations">
      <div className="panel-head">
        <div>
          <h2>Recommendations</h2>
          <p className="status">Suggested products.</p>
        </div>
        <span className="panel-count">{items.length} picks</span>
      </div>

      {items.length ? (
        <div className="reco-list">
          {items.map((item) => (
            <button key={item.id} className="reco-chip" onClick={() => onAdd(item.id)}>
              <span>{item.title}</span>
              <strong>₹{item.priceInr.toLocaleString("en-IN")}</strong>
            </button>
          ))}
        </div>
      ) : (
        <p className="status">No recommendations available right now.</p>
      )}
    </section>
  );
}
