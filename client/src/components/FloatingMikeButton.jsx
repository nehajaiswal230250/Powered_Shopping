export default function FloatingMikeButton({
  supported,
  isListening,
  assistantAwake,
  interimText,
  recognizedText,
  error,
  isFallbackRecording,
  fallbackStatus,
  fallbackError,
  forceFallback,
  onToggleListening,
  onRecordFallback,
  onOpenAssistant
}) {
  const errorText = String(error || "").toLowerCase();
  const hasBrowserSpeechIssue = /(speech|network|service|unavailable)/.test(errorText);
  const canUseFallback = Boolean(onRecordFallback);
  const useFallbackMode = canUseFallback && (!supported || forceFallback || hasBrowserSpeechIssue);
  const isRecording = Boolean(isListening || isFallbackRecording);
  const isProcessing = Boolean(useFallbackMode && /transcrib/i.test(String(fallbackStatus || "")));
  const status = useFallbackMode
    ? assistantAwake
      ? "Record your shopping command. Mike will transcribe it and guide the app."
      : "Click Record and say: show Nike shoes under 2000, add first item, or checkout now."
    : !supported
      ? "Voice is not supported in this browser."
      : assistantAwake
        ? "Mike is active. Speak your shopping command."
        : isListening
          ? "Listening for: hello Mike"
          : "Click once, then say: hello Mike";

  const transcript = interimText || recognizedText;
  const primaryAction = useFallbackMode ? onRecordFallback : onToggleListening;
  const primaryDisabled = useFallbackMode ? isFallbackRecording : !supported;
  const primaryLabel = useFallbackMode
    ? isFallbackRecording
      ? "Recording..."
      : "Record"
    : isListening
      ? "Stop"
      : "Listen";

  return (
    <aside
      className={`floating-mike ${isRecording ? "listening" : ""} ${assistantAwake ? "awake" : ""} ${
        isProcessing ? "processing" : ""
      }`}
      aria-live="polite"
    >
      <div className="floating-mike-card glass">
        <div>
          <p className="eyebrow">Voice assistant</p>
          <strong>{assistantAwake ? "Mike is awake" : "Wake Mike"}</strong>
          <p className="status">{status}</p>
        </div>
        {transcript ? <p className="floating-transcript">"{transcript}"</p> : null}
        {fallbackStatus ? <p className="status">{fallbackStatus}</p> : null}
        {useFallbackMode && forceFallback && error ? <p className="status">{error}</p> : null}
        {fallbackError ? <p className="error">{fallbackError}</p> : null}
        {!useFallbackMode && error ? <p className="error">{error}</p> : null}
        <div className="floating-actions">
          <button type="button" onClick={onOpenAssistant}>
            Open panel
          </button>
          <button type="button" onClick={primaryAction} disabled={primaryDisabled}>
            {primaryLabel}
          </button>
        </div>
      </div>

      <button
        type="button"
        className="mike-orb-button"
        onClick={primaryAction}
        disabled={primaryDisabled}
        aria-label={
          useFallbackMode
            ? "Record Mike voice command"
            : isListening
              ? "Stop Mike voice assistant"
              : "Start Mike voice assistant"
        }
      >
        <span className="mike-pulse" />
        <span className="mike-wave" aria-hidden="true" />
        <span className="mike-shimmer" aria-hidden="true" />
        <span className="mike-name">{useFallbackMode ? "Rec" : "Mike"}</span>
      </button>
    </aside>
  );
}
