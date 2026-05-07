import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AiActivityBanner from "../components/AiActivityBanner";
import CartPanel from "../components/CartPanel";
import CheckoutPanel from "../components/CheckoutPanel";
import FloatingMikeButton from "../components/FloatingMikeButton";
import Header from "../components/Header";
import HistoryPanel from "../components/HistoryPanel";
import Navbar from "../components/Navbar";
import ProductGrid from "../components/ProductGrid";
import RecommendationsPanel from "../components/RecommendationsPanel";
import ShowcasePanel from "../components/ShowcasePanel";
import VoiceControl from "../components/VoiceControl";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { api } from "../services/api";
import {
  readStoredJson,
  readStoredValue,
  removeStoredValue,
  writeStoredValue
} from "../services/browserStorage";
import {
  DEMO_PRODUCTS,
  filterDemoProducts,
  getDemoCategories,
  getTrendingDemoProducts
} from "../services/demoProducts";
import { detectIntent } from "../services/intentParser";

const THEME_KEY = "voice-shopping:theme";
const LAST_CATEGORY_KEY = "voice-shopping:last-category";
const SETTINGS_KEY = "voice-shopping:settings";

const QUICK_COMMANDS = [
  "show Nike shoes under 2000",
  "show top rated products",
  "hello Mike",
  "add first item",
  "checkout now"
];

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "shop", label: "Catalog" },
  { id: "cart", label: "Cart" },
  { id: "checkout", label: "Checkout" },
  { id: "assistant", label: "Assistant" },
  { id: "settings", label: "Settings" },
  { id: "faq", label: "Help" }
];

const FAQ_ITEMS = [
  {
    q: "How do I search products?",
    a: "Use the catalog filters or say commands like show shoes under 2000."
  },
  {
    q: "Can I use the app without voice input?",
    a: "Yes. Every shopping action can be done with buttons, filters, and typed commands."
  },
  {
    q: "Why do I sometimes see backup mode?",
    a: "If the backend is unavailable, the app falls back to bundled demo products."
  },
  {
    q: "What does the assistant support?",
    a: "Search, add, remove, recommendations, and checkout commands."
  }
];

let razorpayScriptPromise = null;

const loadRazorpayScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only load in the browser."));
  }

  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.Razorpay), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout.")), {
          once: true
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => reject(new Error("Failed to load Razorpay checkout."));
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
};

const DEFAULT_SETTINGS = {
  voiceReplies: true,
  aiAssistantMode: true,
  autoOpenCartOnAdd: false
};

const EMPTY_CART = {
  items: [],
  total: 0,
  count: 0
};

const CHECKOUT_FORM_DEFAULTS = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  zip: "",
  paymentMethod: "upi",
  cardName: "",
  cardLast4: ""
};

const createId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const normalizeCart = (items = []) => {
  const total = items.reduce((sum, item) => sum + item.product.priceInr * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, total, count };
};

const normalizeProductText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeProductText = (value) => normalizeProductText(value).split(" ").filter(Boolean);

const scoreProductMatch = (product, query) => {
  const normalizedQuery = normalizeProductText(query);
  const tokens = tokenizeProductText(query);

  if (!tokens.length) {
    return 0;
  }

  const searchableText = normalizeProductText(
    `${product.title} ${product.brand || ""} ${product.description || ""} ${product.category || ""}`
  );
  const titleTokens = tokenizeProductText(`${product.title} ${product.brand || ""}`);
  let score = 0;

  for (const token of tokens) {
    if (searchableText.includes(token)) {
      score += token.length >= 4 ? 3 : 2;
      continue;
    }

    if (titleTokens.some((word) => word.startsWith(token) || token.startsWith(word))) {
      score += 1;
    }
  }

  if (normalizedQuery && searchableText.includes(normalizedQuery)) {
    score += 5;
  }

  if (normalizedQuery && normalizeProductText(product.title).includes(normalizedQuery)) {
    score += 4;
  }

  return score;
};

const toBase64 = (bytes) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
};

const formatVoiceError = (message) => {
  if (message === "Failed to fetch") {
    return "Voice backend is not reachable. Run the project from the root and open http://localhost:5173.";
  }

  if (/quota|billing|429/i.test(message)) {
    return "OpenAI transcription quota is exhausted. Add billing to the server key and restart the backend.";
  }

  return message;
};

const getInitialSettings = () => {
  const stored = readStoredJson(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...stored };
};

export default function HomePage({ currentUser, onLogout }) {
  const [activeView, setActiveView] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => readStoredValue(THEME_KEY, "dark"));
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [recommendations, setRecommendations] = useState(getTrendingDemoProducts());
  const [categories, setCategories] = useState(getDemoCategories());
  const [cart, setCart] = useState(EMPTY_CART);
  const [recognizedText, setRecognizedText] = useState("");
  const [history, setHistory] = useState([]);
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [settings, setSettings] = useState(getInitialSettings);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [shouldAutoStartMic, setShouldAutoStartMic] = useState(false);
  const [assistantAwake, setAssistantAwake] = useState(false);
  const [forceFallback, setForceFallback] = useState(false);
  const [isFallbackRecording, setIsFallbackRecording] = useState(false);
  const [fallbackStatus, setFallbackStatus] = useState("");
  const [fallbackError, setFallbackError] = useState("");
  const [aiActivity, setAiActivity] = useState(null);
  const [aiFocusProductId, setAiFocusProductId] = useState(null);
  const [aiCursorGhost, setAiCursorGhost] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutForm, setCheckoutForm] = useState(() => ({
    ...CHECKOUT_FORM_DEFAULTS,
    email: currentUser?.email || ""
  }));
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    brand: "",
    sort: "",
    maxPrice: "",
    minRating: ""
  });
  const [lastCategory, setLastCategory] = useState(() => readStoredValue(LAST_CATEGORY_KEY, ""));

  const { speak } = useSpeechSynthesis();
  const aiTimersRef = useRef([]);

  const clearAiTimers = useCallback(() => {
    aiTimersRef.current.forEach((id) => clearTimeout(id));
    aiTimersRef.current = [];
  }, []);

  const scheduleAiTimer = useCallback((fn, ms) => {
    const id = window.setTimeout(fn, ms);
    aiTimersRef.current.push(id);
    return id;
  }, []);

  const buildChipsFromIntent = useCallback((intent) => {
    if (!intent || typeof intent !== "object") return [];

    const chips = [];
    if (intent.brand) chips.push(`Brand: ${intent.brand}`);
    if (intent.category) chips.push(`Category: ${intent.category}`);
    if (intent.maxPrice) chips.push(`Max: ₹${Number(intent.maxPrice).toLocaleString("en-IN")}`);
    if (intent.minRating) chips.push(`Rating: ${intent.minRating}+`);
    if (intent.sort === "rating_desc") chips.push("Sort: Top rated");
    if (intent.sort === "price_asc") chips.push("Sort: Low to high");
    if (intent.sort === "price_desc") chips.push("Sort: High to low");
    if (intent.query) chips.push(`Query: ${String(intent.query).trim()}`);
    return chips.filter(Boolean).slice(0, 6);
  }, []);

  const startAiTask = useCallback(
    ({ stage, command, detail, chips = [] }) => {
      clearAiTimers();
      setAiFocusProductId(null);
      setAiActivity({ kind: "search", stage, command, detail, chips });
    },
    [clearAiTimers]
  );

  const pickFocusProduct = useCallback((items, command) => {
    if (!Array.isArray(items) || !items.length) return null;

    const scored = items
      .map((item) => ({ item, score: scoreProductMatch(item, command) }))
      .sort((a, b) => b.score - a.score || (b.item.rating?.rate || 0) - (a.item.rating?.rate || 0));

    const best = scored[0]?.item || null;
    if (!best) return null;
    if ((scored[0]?.score || 0) >= 3) return best;
    return items[0] || null;
