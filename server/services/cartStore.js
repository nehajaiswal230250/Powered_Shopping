import { getFirestoreDb, getServerTimestamp } from "../config/firebase.js";

const cartsCollection = "carts";
const inMemoryCarts = new Map();
let warnedFirestoreFallback = false;

const clone = (value) => JSON.parse(JSON.stringify(value));

const ensureItems = (items) => (Array.isArray(items) ? items : []);

const getMemoryItems = (cartId) => ensureItems(inMemoryCarts.get(cartId) || []);

const saveMemoryItems = (cartId, items) => {
  inMemoryCarts.set(cartId, clone(items));
};

const getCartRef = (db, cartId) => db.collection(cartsCollection).doc(cartId);

const shouldFallbackToMemory = (error) => {
  const message = String(error?.message || "");
  return (
    error?.code === 5 ||
    error?.code === "5" ||
    error?.code === "NOT_FOUND" ||
    /NOT_FOUND|5 NOT_FOUND|permission|firestore/i.test(message)
  );
};

const logFirestoreFallback = (error) => {
  if (warnedFirestoreFallback) {
    return;
  }

  console.warn(
    `Firestore cart storage is unavailable. Falling back to in-memory cart storage. ${error?.message || ""}`.trim()
  );
  warnedFirestoreFallback = true;
};

const readFirestoreItems = async (db, cartId) => {
  const snapshot = await getCartRef(db, cartId).get();
  if (!snapshot.exists) {
    return [];
  }
  return ensureItems(snapshot.data()?.items);
};

const writeFirestoreItems = async (db, cartId, items) => {
  const updatedAt = getServerTimestamp();
  await getCartRef(db, cartId).set(
    {
      items,
      ...(updatedAt ? { updatedAt } : {})
    },
    { merge: true }
  );
};

const addItem = (items, product) => {
  const nextItems = clone(items);
  const existing = nextItems.find((item) => item.product.id === product.id);
  if (existing) {
    existing.quantity += 1;
    return nextItems;
  }
  nextItems.push({ product, quantity: 1 });
  return nextItems;
};

const removeByProductId = (items, productId) =>
  items.filter((item) => item.product.id !== productId);

const removeByTitle = (items, query) => {
  const q = query.toLowerCase();
  return items.filter((item) => !item.product.title.toLowerCase().includes(q));
};

export const cartStore = {
  async getItems(cartId = "default") {
    try {
      const db = await getFirestoreDb();
      if (!db) {
        return getMemoryItems(cartId);
      }
      return readFirestoreItems(db, cartId);
    } catch (error) {
      if (!shouldFallbackToMemory(error)) {
        throw error;
      }
      logFirestoreFallback(error);
      return getMemoryItems(cartId);
    }
  },

  async add(cartId = "default", product) {
    try {
      const db = await getFirestoreDb();
      if (!db) {
        const nextItems = addItem(getMemoryItems(cartId), product);
        saveMemoryItems(cartId, nextItems);
        return nextItems;
      }

      const nextItems = addItem(await readFirestoreItems(db, cartId), product);
      await writeFirestoreItems(db, cartId, nextItems);
      return nextItems;
    } catch (error) {
      if (!shouldFallbackToMemory(error)) {
        throw error;
      }
      logFirestoreFallback(error);
      const nextItems = addItem(getMemoryItems(cartId), product);
      saveMemoryItems(cartId, nextItems);
      return nextItems;
    }
  },

  async removeByProductId(cartId = "default", productId) {
    try {
      const db = await getFirestoreDb();
      if (!db) {
        const nextItems = removeByProductId(getMemoryItems(cartId), productId);
        saveMemoryItems(cartId, nextItems);
        return nextItems;
      }

      const nextItems = removeByProductId(await readFirestoreItems(db, cartId), productId);
      await writeFirestoreItems(db, cartId, nextItems);
      return nextItems;
    } catch (error) {
      if (!shouldFallbackToMemory(error)) {
        throw error;
      }
      logFirestoreFallback(error);
      const nextItems = removeByProductId(getMemoryItems(cartId), productId);
      saveMemoryItems(cartId, nextItems);
      return nextItems;
    }
  },

  async removeByTitle(cartId = "default", query) {
    try {
      const db = await getFirestoreDb();
      if (!db) {
        const nextItems = removeByTitle(getMemoryItems(cartId), query);
        saveMemoryItems(cartId, nextItems);
        return nextItems;
      }

      const nextItems = removeByTitle(await readFirestoreItems(db, cartId), query);
      await writeFirestoreItems(db, cartId, nextItems);
      return nextItems;
    } catch (error) {
      if (!shouldFallbackToMemory(error)) {
        throw error;
      }
      logFirestoreFallback(error);
      const nextItems = removeByTitle(getMemoryItems(cartId), query);
      saveMemoryItems(cartId, nextItems);
      return nextItems;
    }
  },

  async clear(cartId = "default") {
    try {
      const db = await getFirestoreDb();
      if (!db) {
        inMemoryCarts.set(cartId, []);
        return;
      }
      await writeFirestoreItems(db, cartId, []);
    } catch (error) {
      if (!shouldFallbackToMemory(error)) {
        throw error;
      }
      logFirestoreFallback(error);
      inMemoryCarts.set(cartId, []);
    }
  }
};
