const getLocalStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const readStoredValue = (key, fallback = "") => {
  const storage = getLocalStorage();
  if (!storage) {
    return fallback;
  }

  try {
    const value = storage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

export const readStoredJson = (key, fallback) => {
  const raw = readStoredValue(key, null);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const writeStoredValue = (key, value) => {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const removeStoredValue = (key) => {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const clearStoredValues = (keys = []) => {
  keys.forEach((key) => {
    removeStoredValue(key);
  });
};
