const cartState = {
  items: []
};

const findItem = (productId) => cartState.items.find((i) => i.product.id === productId);

export const cartModel = {
  getItems() {
    return cartState.items;
  },

  add(product) {
    const existing = findItem(product.id);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    cartState.items.push({ product, quantity: 1 });
  },

  removeByProductId(productId) {
    cartState.items = cartState.items.filter((item) => item.product.id !== productId);
  },

  removeByTitle(query) {
    const q = query.toLowerCase();
    cartState.items = cartState.items.filter(
      (item) => !item.product.title.toLowerCase().includes(q)
    );
  },

  clear() {
    cartState.items = [];
  }
};
