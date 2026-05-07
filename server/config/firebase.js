let cachedDb = null;
let warned = false;
let warnedMissingPackage = false;
let firestoreModule = null;

const formatPrivateKey = (value = "") => value.replace(/\\n/g, "\n");

const getFirebaseConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: formatPrivateKey(privateKey)
  };
};

const loadFirebaseModules = async () => {
  try {
    const appModule = await import("firebase-admin/app");
    const firestore = await import("firebase-admin/firestore");
    firestoreModule = firestore;
    return appModule;
  } catch {
    if (!warnedMissingPackage) {
      console.warn(
        "firebase-admin is not installed. Falling back to in-memory cart storage."
      );
      warnedMissingPackage = true;
    }
    return null;
  }
};

export const getFirestoreDb = async () => {
  if (cachedDb) {
    return cachedDb;
  }

  const firebaseConfig = getFirebaseConfig();
  if (!firebaseConfig) {
    if (!warned) {
      console.warn(
        "Firebase is not configured. Falling back to in-memory cart storage."
      );
      warned = true;
    }
    return null;
  }

  const appModule = await loadFirebaseModules();
  if (!appModule || !firestoreModule) {
    return null;
  }

  const { cert, getApps, initializeApp } = appModule;
  const { getFirestore } = firestoreModule;

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(firebaseConfig)
    });

  cachedDb = getFirestore(app);
  return cachedDb;
};

export const getServerTimestamp = () => {
  if (!firestoreModule) {
    return null;
  }
  return firestoreModule.FieldValue.serverTimestamp();
};
