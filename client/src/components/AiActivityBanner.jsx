const STAGE_COPY = {
  searching: {
    eyebrow: "AI working",
    title: "Searching the catalog…"
  },
  scrolling: {
    eyebrow: "AI guiding",
    title: "Scrolling to the best match…"
  },
  done: {
    eyebrow: "AI update",
    title: "Done."
  }
};

export default function AiActivityBanner({ activity }) {
  if (!activity) return null;

  const stage = activity.stage || "searching";
  const copy = STAGE_COPY[stage] || STAGE_COPY.searching;
  const detail = activity.detail ? String(activity.detail).trim() : "";
  const command = activity.command ? String(activity.command).trim() : "";
  const chips = Array.isArray(activity.chips) ? activity.chips.filter(Boolean).slice(0, 6) : [];

  return (
    <section className={`ai-activity glass stage-${stage}`} aria-live="polite">
      <div className="ai-orbs" aria-hidden="true">
        <span className="ai-orb orb-1" />
        <span className="ai-orb orb-2" />
        <span className="ai-orb orb-3" />
      </div>
      <div className="ai-activity-icon" aria-hidden="true">
        <span className="ai-dot" />
        <span className="ai-dot" />
        <span className="ai-dot" />
      </div>
      <div className="ai-activity-copy">
        <p className="eyebrow">{copy.eyebrow}</p>
        <div className="ai-activity-row">
          <strong>{copy.title}</strong>
          {stage === "searching" ? <span className="ai-activity-spinner" aria-hidden="true" /> : null}
        </div>
        {detail ? <p className="status">{detail}</p> : null}
        {chips.length ? (
          <div className="ai-chips" aria-hidden="true">
            {chips.map((chip, idx) => (
              <span key={`${chip}-${idx}`} className="ai-chip" style={{ "--i": idx }}>
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        {command ? <p className="ai-activity-command">“{command}”</p> : null}
      </div>
    </section>
  );
}
