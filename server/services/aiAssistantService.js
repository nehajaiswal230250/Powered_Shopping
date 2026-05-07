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
