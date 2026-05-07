import React from "react";
import { clearStoredValues } from "../services/browserStorage";

const UI_STATE_KEYS = [
  "voice-shopping:theme",
  "voice-shopping:settings",
  "voice-shopping:last-category"
];

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App render failed.", error, errorInfo);
  }

  handleReset = () => {
    clearStoredValues(UI_STATE_KEYS);
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <main className="auth-shell">
          <section className="auth-card glass" style={{ width: "min(560px, 94vw)" }}>
            <p className="eyebrow">Recovery Mode</p>
            <h1>App failed to render</h1>
            <p className="subtext">
              A browser setting or cached local UI state interrupted the initial render.
            </p>
            <p className="error">
              {this.state.error?.message || "Unexpected client error."}
            </p>
            <div className="settings-actions">
              <button type="button" className="theme-btn" onClick={this.handleReload}>
                Reload App
              </button>
              <button type="button" className="theme-btn" onClick={this.handleReset}>
                Reset Local UI State
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
