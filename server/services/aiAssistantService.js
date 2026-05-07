import { GoogleGenAI } from "@google/genai";
import { getProducts, filterProducts } from "./productService.js";
import { getTrendingProducts, getSimilarProducts } from "./recommendationService.js";
import { cartStore } from "./cartStore.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const TOOL_LOOP_LIMIT = 6;

const SYSTEM_PROMPT = `
You are AiShopping's production shopping assistant.
Rules:
- Be concise, helpful, and action-oriented.
- Use tools when the user requests product actions (search/add/remove/cart/recommendations/checkout).
- When a user says a company name such as Nike, Adidas, or Puma, pass it as the brand filter.
- Never invent product IDs, prices, cart values, or order IDs.
- If something fails, explain clearly and provide the next best action.
`.trim();

const toolSpec = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search and filter products in the catalog.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string" },
          category: { type: "string" },
          brand: { type: "string" },
          maxPrice: { type: "number" },
          minPrice: { type: "number" },
          minRating: { type: "number" },
          sort: {
            type: "string",
            enum: ["", "price_asc", "price_desc", "rating_desc"]
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recommendations",
      description: "Get recommendations by type. Use trending by default.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["trending", "similar"] },
          category: { type: "string" },
          excludeId: { type: "number" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Add a product to cart by product id.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number" }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_from_cart",
      description: "Remove item from cart by product id or title query.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number" },
          titleQuery: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_cart",
      description: "Fetch current cart summary.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "checkout",
      description: "Checkout current cart and return order result.",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string" }
        }
      }
    }
  }
];

const toNumber = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getChatModel = () => process.env.OPENAI_MODEL || "gpt-4o-mini";

const getTranscribeModel = () => process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
const getGeminiTranscribeModel = () => process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-2.5-flash";

const summarizeProduct = (p) => ({
  id: p.id,
  title: p.title,
  category: p.category,
  brand: p.brand,
  priceInr: p.priceInr,
  rating: p.rating
});

const summarizeCart = (items = []) => ({
  items,
  total: items.reduce((sum, i) => sum + i.product.priceInr * i.quantity, 0),
  count: items.reduce((sum, i) => sum + i.quantity, 0)
});

const createState = () => ({
  products: null,
  recommendations: null,
  cart: null,
  orderResult: null,
  activeView: null,
  lastCategory: null
});

const executeTool = async (name, args, context, state) => {
  const cartId = context.cartId;

  if (name === "search_products") {
    const products = await getProducts();
    const params = {
      ...(args.q ? { q: String(args.q) } : {}),
      ...(args.category ? { category: String(args.category) } : {}),
      ...(args.brand ? { brand: String(args.brand) } : {}),
      ...(toNumber(args.maxPrice) !== null ? { maxPrice: toNumber(args.maxPrice) } : {}),
      ...(toNumber(args.minPrice) !== null ? { minPrice: toNumber(args.minPrice) } : {}),
      ...(toNumber(args.minRating) !== null ? { minRating: toNumber(args.minRating) } : {}),
      ...(args.sort ? { sort: String(args.sort) } : {})
    };

    const filtered = filterProducts(products, params);
    state.products = filtered;
    state.activeView = "shop";
    if (args.category) {
      state.lastCategory = String(args.category);
    }

    return {
      success: true,
      count: filtered.length,
      items: filtered.slice(0, 12).map(summarizeProduct)
    };
  }

  if (name === "get_recommendations") {
    const products = await getProducts();
    const type = args.type === "similar" ? "similar" : "trending";
    const items =
      type === "similar"
        ? getSimilarProducts(products, args.category, toNumber(args.excludeId), 8)
        : getTrendingProducts(products, 8);

    state.recommendations = items;
    if (type === "similar") {
      state.products = items;
      state.activeView = "shop";
      if (args.category) {
        state.lastCategory = String(args.category);
      }
    }

    return {
      success: true,
      type,
      count: items.length,
      items: items.slice(0, 10).map(summarizeProduct)
    };
  }

  if (name === "add_to_cart") {
    const productId = toNumber(args.productId);
    if (!productId) {
      return { success: false, message: "productId is required." };
    }

    const products = await getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, message: "Product not found." };
    }

    await cartStore.add(cartId, product);
    const cart = summarizeCart(await cartStore.getItems(cartId));
    state.cart = cart;
    return { success: true, message: "Item added.", cart };
  }

  if (name === "remove_from_cart") {
    const productId = toNumber(args.productId);
    const titleQuery = args.titleQuery ? String(args.titleQuery) : "";

    if (!productId && !titleQuery) {
      return { success: false, message: "productId or titleQuery is required." };
    }

    if (productId) {
      await cartStore.removeByProductId(cartId, productId);
    } else {
      await cartStore.removeByTitle(cartId, titleQuery);
    }

    const cart = summarizeCart(await cartStore.getItems(cartId));
    state.cart = cart;
    return { success: true, message: "Item removed.", cart };
  }

  if (name === "get_cart") {
    const cart = summarizeCart(await cartStore.getItems(cartId));
    state.cart = cart;
    return { success: true, cart };
  }

  if (name === "checkout") {
    const cart = summarizeCart(await cartStore.getItems(cartId));
    if (!cart.count) {
      return { success: false, message: "Cart is empty." };
    }

    const orderResult = {
      orderId: `ORD-${Date.now().toString().slice(-8)}`,
      paidAmount: cart.total,
      customerName: args.customerName ? String(args.customerName) : ""
    };

    await cartStore.clear(cartId);
    state.cart = { items: [], total: 0, count: 0 };
    state.orderResult = orderResult;
    state.activeView = "checkout";
    return { success: true, orderResult };
  }

  return { success: false, message: `Unknown tool: ${name}` };
};

const openAiCall = async (messages) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI assistant is not configured.");
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: getChatModel(),
      temperature: 0.2,
      messages,
      tools: toolSpec,
      tool_choice: "auto"
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status}).`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message || null;
};

const normalizeHistory = (history = []) =>
  history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && item.content)
    .slice(-8)
    .map((item) => ({ role: item.role, content: String(item.content) }));

const readOpenAiError = async (response) => {
  const rawText = await response.text();
  if (!rawText) {
    return "";
  }

  try {
    const data = JSON.parse(rawText);
    return data?.error?.message || data?.message || rawText;
  } catch {
    return rawText;
  }
};

export const runAiAssistant = async ({ message, history = [], cartId }) => {
  const userMessage = String(message || "").trim();
  if (!userMessage) {
    throw new Error("Message is required.");
  }

  const state = createState();
  const context = { cartId: cartId || "default" };

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...normalizeHistory(history),
    { role: "user", content: userMessage }
  ];

  let finalReply = "";

  for (let i = 0; i < TOOL_LOOP_LIMIT; i += 1) {
    const assistantMessage = await openAiCall(messages);
    if (!assistantMessage) {
      break;
    }

    if (assistantMessage.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: assistantMessage.tool_calls
      });

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function?.name;
        let args = {};
        try {
          args = JSON.parse(toolCall.function?.arguments || "{}");
        } catch {
          args = {};
        }

        const result = await executeTool(toolName, args, context, state);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }

      continue;
    }

    finalReply = assistantMessage.content || "";
    break;
  }

  if (!finalReply) {
    finalReply = "I can help with search, cart updates, recommendations, and checkout. What should I do?";
  }

  if (!state.cart) {
    state.cart = summarizeCart(await cartStore.getItems(context.cartId));
  }

  return {
    reply: finalReply,
    ui: {
      ...(state.products ? { products: state.products } : {}),
      ...(state.recommendations ? { recommendations: state.recommendations } : {}),
      ...(state.cart ? { cart: state.cart } : {}),
      ...(state.orderResult ? { orderResult: state.orderResult } : {}),
      ...(state.activeView ? { activeView: state.activeView } : {}),
      ...(state.lastCategory ? { lastCategory: state.lastCategory } : {})
    }
  };
};

export const transcribeAudio = async ({ audioBase64, mimeType = "audio/webm" }) => {
  if (!audioBase64 || typeof audioBase64 !== "string") {
    throw new Error("audioBase64 is required.");
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");
  if (!audioBuffer.length) {
    throw new Error("Audio payload is empty.");
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey && !geminiApiKey.includes("your_")) {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model: getGeminiTranscribeModel(),
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64
              }
            },
            {
              text: [
                "Transcribe this shopping voice command into plain text.",
                "Return only the spoken words.",
                "Do not add quotes, labels, markdown, or explanation."
              ].join(" ")
            }
          ]
        }
      ]
    });

    const text = String(response?.text || "").trim();
    if (text) {
      return { text };
    }
  }

  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey || openAiApiKey.includes("your_")) {
    throw new Error("AI transcription is not configured. Add GEMINI_API_KEY to server/.env.");
  }

  const ext = inferFileExt(mimeType);
  const formData = new FormData();
  formData.append("model", getTranscribeModel());
  formData.append(
    "file",
    new Blob([audioBuffer], { type: mimeType }),
    `voice-command.${ext}`
  );

  const response = await fetch(OPENAI_TRANSCRIBE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const detail = await readOpenAiError(response);
    throw new Error(
      detail
        ? `Transcription failed (${response.status}): ${detail}`
        : `Transcription failed (${response.status}).`
    );
  }

  const data = await response.json();
  const text = String(data?.text || "").trim();
  if (!text) {
    throw new Error("Could not transcribe speech.");
  }

  return { text };
};
const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";

const inferFileExt = (mimeType = "") => {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
};
