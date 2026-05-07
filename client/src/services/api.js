const request = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const rawText = await response.text();
  let data = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Unexpected response from server (${response.status}).`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}.`);
  }

  if (!data || !data.success) {
    throw new Error(data?.message || "Server returned an empty response.");
  }

  return data;
};

export const api = {
  health: () => request("/api/health"),
  getProducts: (params = {}) => {
    const search = new URLSearchParams(params).toString();
    return request(`/api/products${search ? `?${search}` : ""}`);
  },
  getCategories: () => request("/api/products/categories"),
  getRecommendations: (params = {}) => {
    const search = new URLSearchParams(params).toString();
    return request(`/api/products/recommendations${search ? `?${search}` : ""}`);
  },
  getCart: () => request("/api/cart"),
  addToCart: (productId) =>
    request("/api/cart/add", {
      method: "POST",
      body: JSON.stringify({ productId })
    }),
  removeFromCart: ({ productId, titleQuery }) =>
    request("/api/cart/remove", {
      method: "POST",
      body: JSON.stringify({ productId, titleQuery })
    }),
  checkout: () =>
    request("/api/cart/checkout", {
      method: "POST"
    }),
  createRazorpayOrder: ({ customerName, email, phone } = {}) =>
    request("/api/cart/razorpay/order", {
      method: "POST",
      body: JSON.stringify({ customerName, email, phone })
    }),
  verifyRazorpayPayment: ({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    customerName
  }) =>
    request("/api/cart/razorpay/verify", {
      method: "POST",
      body: JSON.stringify({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        customerName
      })
    }),
  aiChat: ({ message, history = [], cartId } = {}) =>
    request("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, history, cartId })
    }),
  transcribeAudio: ({ audioBase64, mimeType }) =>
    request("/api/ai/transcribe", {
      method: "POST",
      body: JSON.stringify({ audioBase64, mimeType })
    })
};
