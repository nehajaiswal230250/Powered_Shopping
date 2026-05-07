export default function HistoryPanel({ history }) {
  return (
    <section className="glass history-panel">
      <div className="panel-head">
        <div>
          <h2>Recent commands</h2>
          <p className="status">Latest commands and responses.</p>
        </div>
        <span className="panel-count">{history.length} items</span>
      </div>

      <div className="history-list">
        {history.length ? (
          history.map((entry) => (
            <div key={entry.id} className="history-item">
              <p className="user">
                <span className="history-label">You</span>
                {entry.command}
              </p>
              <p className="assistant">
                <span className="history-label">App</span>
                {entry.response}
              </p>
              <p className="history-time">{new Date(entry.createdAt).toLocaleTimeString()}</p>
            </div>
          ))
        ) : (
          <p className="status">No commands yet.</p>
        )}
      </div>
    </section>
  );
}
