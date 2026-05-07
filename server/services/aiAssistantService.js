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
