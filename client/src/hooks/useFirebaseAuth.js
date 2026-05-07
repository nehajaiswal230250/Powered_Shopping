import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";

const configError =
  "Firebase Auth is not configured. Add VITE_FIREBASE_* values in client/.env.";

const getCurrentHostname = () => {
  if (typeof window === "undefined") {
    return "this domain";
  }

  return window.location.hostname || "this domain";
};

const authErrorMessages = {
  "auth/unauthorized-domain": () =>
    `Firebase Auth is blocking ${getCurrentHostname()}. Add ${getCurrentHostname()} to Firebase Console > Authentication > Settings > Authorized domains.`,
  "auth/popup-closed-by-user": "Google sign-in was closed before it completed.",
  "auth/popup-blocked": "The browser blocked the Google sign-in popup. Allow popups and try again.",
  "auth/operation-not-allowed":
    "This Firebase sign-in method is disabled. Enable Email/Password or Google in Firebase Console > Authentication > Sign-in method.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/user-not-found": "No account exists for this email address.",
  "auth/wrong-password": "The email or password is incorrect.",
  "auth/email-already-in-use": "An account already exists for this email address.",
  "auth/weak-password": "Password should be at least 6 characters."
};

const toFriendlyAuthError = (error) => {
  const friendlyMessage = authErrorMessages[error?.code];
  const message =
    typeof friendlyMessage === "function"
      ? friendlyMessage()
      : friendlyMessage || error?.message || "Authentication failed.";
  const nextError = new Error(message);
  nextError.code = error?.code;
  return nextError;
};

export const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    let resolved = false;

    const timeoutId = window.setTimeout(() => {
      if (!resolved) {
        console.warn("Firebase auth state check timed out. Falling back to signed-out mode.");
        setLoading(false);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      resolved = true;
      window.clearTimeout(timeoutId);
      setUser(nextUser);
      setLoading(false);
    });

    return () => {
      resolved = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    if (!auth) {
      throw new Error(configError);
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw toFriendlyAuthError(error);
    }
  }, []);

  const register = useCallback(async ({ email, password }) => {
    if (!auth) {
      throw new Error(configError);
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw toFriendlyAuthError(error);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!auth || !googleProvider) {
      throw new Error(configError);
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      throw toFriendlyAuthError(error);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!auth) {
      return;
    }
    await signOut(auth);
  }, []);

  return useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      logout
    }),
    [loading, login, loginWithGoogle, logout, register, user]
  );
};
