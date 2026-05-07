import React from "react";
import { createRoot } from "react-dom/client";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AuthScreen from "./components/AuthScreen";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";
import HomePage from "./pages/HomePage";
import { initAnalytics } from "./services/firebase";
import "./styles/global.css";

initAnalytics().catch(() => null);

function AppRoot() {
  const { user, loading, login, register, loginWithGoogle, logout } = useFirebaseAuth();

  if (loading) {
    return (
      <main className="auth-shell">
        <section className="auth-card glass">
          <h1>Preparing your workspace</h1>
          <p className="subtext">Verifying secure session and loading preferences.</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={login} onRegister={register} onLoginWithGoogle={loginWithGoogle} />;
  }

  return <HomePage currentUser={user} onLogout={logout} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppRoot />
    </AppErrorBoundary>
  </React.StrictMode>
);
