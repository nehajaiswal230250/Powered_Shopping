export default function Navbar({
  items,
  activeView,
  onChangeView,
  usingDemoData,
  cartCount,
  commandCount,
  mobileOpen,
  onClose
}) {
  const itemIcons = {
    overview: "⌘",
    shop: "⌕",
    cart: "◫",
    checkout: "◇",
    assistant: "◉",
    settings: "◌",
    faq: "?"
  };

  const navContent = (
    <>
      <div className="sidebar-brand">
        <span className="brand-mark">P</span>
        <div>
          <strong>Prisma Shop</strong>
          <p>Voice commerce studio</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${activeView === item.id ? "active" : ""}`}
            onClick={() => {
              onChangeView(item.id);
              onClose();
            }}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              {itemIcons[item.id] || "•"}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-summary">
        <div>
          <span>Mode</span>
          <strong>{usingDemoData ? "Backup" : "Live"}</strong>
        </div>
        <div>
          <span>Cart</span>
          <strong>{cartCount}</strong>
        </div>
        <div>
          <span>History</span>
          <strong>{commandCount}</strong>
        </div>
      </div>
    </>
  );

  return (
    <>
      {mobileOpen ? <button className="sidebar-backdrop" onClick={onClose} aria-label="Close menu" /> : null}
      <aside className="sidebar glass">{navContent}</aside>
      <section className="mobile-nav glass" aria-label="Mobile navigation">
        {navContent}
      </section>
    </>
  );
}
