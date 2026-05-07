import { useState } from "react";

const formatVoiceRequestError = (message) => {
  if (/quota|billing|429/i.test(message)) {
    return "Gemini transcription quota is exhausted. Add billing/quota to the Gemini key in server/.env, then restart the server.";
  }

  if (message === "Failed to fetch") {
    return "Voice backend is not reachable. Run npm run dev from the project root and open the client URL printed by Vite.";
  }

  return message;
};

export default function VoiceControl({
  supported,
  isListening,
  assistantAwake,
  interimText,
  recognizedText,
  error,
  continuous,
  forceFallback,
  quickCommands,
  onToggleContinuous,
  onToggleListening,
  onRunManualCommand,
  onTranscribeAudio
}) {
  const [manualCommand, setManualCommand] = useState("");
  const [isRecordingFallback, setIsRecordingFallback] = useState(false);
  const [fallbackError, setFallbackError] = useState("");
  const [fallbackStatus, setFallbackStatus] = useState("");
  const showFallbackRecorder = Boolean(onTranscribeAudio);
  const hasBrowserSpeechIssue = /(speech|network|service|unavailable)/.test(
    String(error || "").toLowerCase()
  );
  const canUseLiveSpeech = supported && !forceFallback && !hasBrowserSpeechIssue;

  const bytesToBase64 = (bytes) => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return window.btoa(binary);
  };

  const submitCommand = (event) => {
    event.preventDefault();
    const text = manualCommand.trim();
    if (!text) {
      return;
    }

    onRunManualCommand(text);
    setManualCommand("");
  };

  const recordFallbackCommand = async () => {
    if (!onTranscribeAudio) {
      return;
    }

    setFallbackError("");
    setFallbackStatus("");
    setIsRecordingFallback(true);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks = [];

      await new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        recorder.onerror = () => reject(new Error("Recording failed."));
        recorder.onstop = resolve;

        recorder.start();
        setFallbackStatus("Recording...");
        setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, 4200);
      });

      const blob = new Blob(chunks, { type: "audio/webm" });
      const arrayBuffer = await blob.arrayBuffer();
      const audioBase64 = bytesToBase64(new Uint8Array(arrayBuffer));

      setFallbackStatus("Transcribing...");
      const transcript = await onTranscribeAudio({ audioBase64, mimeType: blob.type });
      const text = String(transcript || "").trim();
      if (!text) {
        throw new Error("Could not detect clear speech.");
      }

      setFallbackStatus(`Heard: "${text}"`);
      onRunManualCommand(text);
    } catch (err) {
      setFallbackStatus("");
      setFallbackError(formatVoiceRequestError(err?.message || "Fallback voice command failed."));
    } finally {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsRecordingFallback(false);
    }
  };

  if (!supported && !showFallbackRecorder) {
    return <div className="glass status">Speech recognition is not supported in this browser.</div>;
  }

  return (
    <section className="voice-panel glass">
      <div className="voice-panel-head">
        <div>
          <p className="eyebrow">Assistant</p>
          <h2>{assistantAwake ? "Mike is active" : "Voice commands"}</h2>
          <p className="status">
            Use Record command for reliable voice input, or type a command when testing quickly.
          </p>
        </div>
        <div className={`voice-orb ${isListening ? "active" : ""}`}>
          <span />
        </div>
      </div>

      <div className="voice-toolbar">
        <button
          className={`voice-main-btn ${canUseLiveSpeech && isListening ? "active" : ""}`}
          onClick={canUseLiveSpeech ? onToggleListening : recordFallbackCommand}
          disabled={!canUseLiveSpeech && isRecordingFallback}
        >
          {canUseLiveSpeech
            ? isListening
              ? "Stop listening"
              : "Start listening"
            : isRecordingFallback
              ? "Recording..."
              : "Record command"}
        </button>

        {canUseLiveSpeech ? (
          <label className="toggle">
            <input type="checkbox" checked={continuous} onChange={onToggleContinuous} />
            Continuous mode
          </label>
        ) : (
          <p className="status">Fallback voice capture is active for this session.</p>
        )}
      </div>

      <div className="voice-transcript">
        <span className="voice-transcript-label">Transcript</span>
        <p className="recognized">{recognizedText || interimText || "Waiting for a command..."}</p>
        <p className="noise-tip">
          One command at a time. Try "show Nike shoes under 2000", then "add to cart", then "checkout now".
        </p>
      </div>

      {error && canUseLiveSpeech ? <p className={`error ${hasBrowserSpeechIssue ? "soft" : ""}`}>{error}</p> : null}

      {showFallbackRecorder ? (
        <div className={`voice-fallback ${hasBrowserSpeechIssue ? "recommended" : ""}`}>
          <p className="status">
            {hasBrowserSpeechIssue
              ? "Use fallback voice capture to record and transcribe a command."
              : "Fallback voice capture is available if browser speech recognition does not respond."}
          </p>
          <button type="button" onClick={recordFallbackCommand} disabled={isRecordingFallback}>
            {isRecordingFallback ? "Recording..." : "Record fallback command"}
          </button>
          {fallbackStatus ? <p className="status">{fallbackStatus}</p> : null}
          {fallbackError ? <p className="error">{fallbackError}</p> : null}
        </div>
      ) : null}

      <form className="manual-row" onSubmit={submitCommand}>
        <input
          value={manualCommand}
          onChange={(event) => setManualCommand(event.target.value)}
          placeholder='Type a command, for example "show shoes under 2000"'
        />
        <button type="submit">Send</button>
      </form>

      <div className="quick-cmds">
        {quickCommands.map((cmd) => (
          <button key={cmd} type="button" onClick={() => onRunManualCommand(cmd)}>
            {cmd}
          </button>
        ))}
      </div>
    </section>
  );
}
