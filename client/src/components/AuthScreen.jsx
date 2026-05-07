import { useEffect, useState } from "react";
import { readStoredValue, writeStoredValue } from "../services/browserStorage";
import { firebaseAuthDomain, firebaseProjectId } from "../services/firebase";

const THEME_KEY = "voice-shopping:theme";

const getCurrentDomain = () => {
  if (typeof window === "undefined") {
    return "unknown";
  }

  return window.location.hostname || "unknown";
};

export default function AuthScreen({ onLogin, onRegister, onLoginWithGoogle }) {
  const [mode, setMode] = useState("login");
  const [theme, setTheme] = useState(() => readStoredValue(THEME_KEY, "dark"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [currentDomain] = useState(getCurrentDomain);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    writeStoredValue(THEME_KEY, theme);
  }, [theme]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (mode === "login") {
        await onLogin({ email, password });
      } else {
        await onRegister({ email, password });
      }
    } catch (err) {
      setError(err?.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const submitGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      await onLoginWithGoogle();
    } catch (err) {
      setError(err?.message || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-compact glass">
        <div className="auth-head-row">
          <button
            type="button"
            className="theme-btn"
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <div className="auth-head">
          <p className="eyebrow">Powered Shopping</p>
          <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
          <p className="subtext">
            Enter the glass workspace for voice-guided browsing, cart control, and checkout.
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              placeholder="Minimum 6 characters"
              required
            />
          </label>
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button type="button" className="auth-google" onClick={submitGoogle} disabled={busy}>
          Continue with Google
        </button>

        <details className="auth-diagnostics">
          <summary>Auth diagnostics</summary>
          <p className="status">
            Current domain: {currentDomain}. Firebase project: {firebaseProjectId || "missing"}.
            Auth domain: {firebaseAuthDomain || "missing"}.
          </p>
        </details>

        {error ? <p className="error auth-error">{error}</p> : null}
      </section>
    </main>
  );
}
