export default function Header({
  lastCategory,
  productCount,
  cartCount,
  isListening,
  recognizedText,
  aiAssistantMode
}) {
  return (
    <header className="header glass">
      <div className="header-copy">
        <p className="eyebrow">Liquid command center</p>
        <h1>Shop by voice, refine by touch.</h1>
        <p className="subtext">
          A glassy workspace for discovering products, running commands, and moving from cart to checkout.
        </p>
        <div className="header-command-preview">
          <span>Last command</span>
          <strong>{recognizedText || "No command yet"}</strong>
        </div>
      </div>

      <div className="header-stats">
        <div className="stat-chip">
          <span>Products</span>
          <strong>{productCount}</strong>
        </div>
        <div className="stat-chip">
          <span>Cart</span>
          <strong>{cartCount}</strong>
        </div>
        <div className="stat-chip">
          <span>Voice</span>
          <strong>{isListening ? "Active" : "Idle"}</strong>
        </div>
        <div className="stat-chip">
          <span>AI mode</span>
          <strong>{aiAssistantMode ? "Online" : "Fallback"}</strong>
        </div>
      </div>

      {lastCategory ? (
        <p className="memory">
          <span>Last category</span>
          <strong>{lastCategory}</strong>
        </p>
      ) : null}
    </header>
  );
}
