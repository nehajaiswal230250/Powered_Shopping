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
  }, []);

  useEffect(() => () => clearAiTimers(), [clearAiTimers]);

  useEffect(() => {
    if (!aiFocusProductId || activeView !== "shop") {
      return;
    }

    const handle = window.setTimeout(() => {
      const source =
        document.querySelector(".mike-orb-button") ||
        document.querySelector(".ai-activity-icon") ||
        document.querySelector(".voice-orb");
      const target = document.getElementById(`product-${aiFocusProductId}`);

      if (source && target) {
        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const x0 = sourceRect.left + sourceRect.width / 2;
        const y0 = sourceRect.top + sourceRect.height / 2;

        // Scroll first so the end point is where the user actually sees the card.
        if (target?.scrollIntoView) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        window.setTimeout(() => {
          const rectAfter = target.getBoundingClientRect();
          const x1 = rectAfter.left + rectAfter.width / 2;
          const y1 = rectAfter.top + Math.min(42, rectAfter.height / 2);
          const dx = x1 - x0;
          const dy = y1 - y0;
          const dist = Math.max(20, Math.hypot(dx, dy));
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

          setAiCursorGhost({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            x0,
            y0,
            x1,
            y1,
            dist,
            angle
          });

          scheduleAiTimer(() => setAiCursorGhost(null), 950);
        }, 240);
      } else if (target?.scrollIntoView) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);

    return () => clearTimeout(handle);
  }, [activeView, aiFocusProductId, scheduleAiTimer]);

  useEffect(() => {
    if (!currentUser?.email) {
      return;
    }

    setCheckoutForm((prev) => (prev.email ? prev : { ...prev, email: currentUser.email }));
  }, [currentUser?.email]);

  const appendHistory = useCallback((command, response) => {
    setHistory((prev) =>
      [
        {
          id: createId(),
          command,
          response,
          createdAt: Date.now()
        },
        ...prev
      ].slice(0, 20)
    );
  }, []);

  const replyToUser = useCallback(
    (command, response) => {
      if (settings.voiceReplies) {
        speak(response);
      }
      appendHistory(command, response);
    },
    [appendHistory, settings.voiceReplies, speak]
  );

  const loadCart = useCallback(async () => {
    try {
      const response = await api.getCart();
      setCart({ items: response.items, total: response.total, count: response.count });
      setUsingDemoData(false);
    } catch {
      setUsingDemoData(true);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.getCategories();
      setCategories(response.items);
      setUsingDemoData(false);
    } catch {
      setCategories(getDemoCategories());
      setUsingDemoData(true);
    }
  }, []);

  const loadProducts = useCallback(async (params = {}) => {
    setIsLoadingProducts(true);
    try {
      const response = await api.getProducts(params);
      setProducts(response.items);
      setUsingDemoData(false);
      return response.items;
    } catch {
      const fallback = filterDemoProducts(params);
      setProducts(fallback);
      setUsingDemoData(true);
      return fallback;
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const loadRecommendations = useCallback(async (params = {}) => {
    try {
      const response = await api.getRecommendations(params);
      setRecommendations(response.items);
      setUsingDemoData(false);
    } catch {
      setRecommendations(getTrendingDemoProducts());
      setUsingDemoData(true);
    }
  }, []);

  const addToCart = useCallback(
    async (productId, sourceCommand = "manual add") => {
      setOrderResult(null);

      try {
        const response = await api.addToCart(productId);
        setCart({ items: response.items, total: response.total, count: response.count });
        setUsingDemoData(false);
      } catch {
        setUsingDemoData(true);
        const fallbackProduct = [...products, ...DEMO_PRODUCTS].find((item) => item.id === productId);
        if (!fallbackProduct) {
          if (sourceCommand !== "manual add") {
            replyToUser(sourceCommand, "I could not find that item.");
          }
          return;
        }

        setCart((prev) => {
          const existing = prev.items.find((item) => item.product.id === productId);
          const items = existing
            ? prev.items.map((item) =>
                item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item
              )
            : [...prev.items, { product: fallbackProduct, quantity: 1 }];
          return normalizeCart(items);
        });
      }

      const reply = "Item added to cart.";
      if (settings.voiceReplies) {
        speak(reply);
      }
      if (settings.autoOpenCartOnAdd) {
        setActiveView("cart");
      }
      if (sourceCommand !== "manual add") {
        appendHistory(sourceCommand, reply);
      }
    },
    [appendHistory, products, replyToUser, settings.autoOpenCartOnAdd, settings.voiceReplies, speak]
  );

  const resolveProductFromCommand = useCallback(
    (intent) => {
      const normalizedItemName = String(intent.itemName || "")
        .trim()
        .toLowerCase();
      const refersToCurrentItem =
        !normalizedItemName ||
        ["this", "this item", "it", "that", "that item", "selected", "selected item"].includes(
          normalizedItemName
        );

      if (Number.isInteger(intent.index) && products[intent.index]) {
        return products[intent.index];
      }

      if (refersToCurrentItem) {
        return products[0] || null;
      }

      const uniqueProducts = [
        ...new Map([...products, ...DEMO_PRODUCTS].map((item) => [item.id, item])).values()
      ];

      const scoredMatches = uniqueProducts
        .map((item) => ({
          item,
          score: scoreProductMatch(item, intent.itemName)
        }))
        .filter((entry) => entry.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            (b.item.rating?.rate || 0) - (a.item.rating?.rate || 0) ||
            a.item.priceInr - b.item.priceInr
        );

      return scoredMatches[0]?.item || null;
    },
    [products]
  );

  const removeFromCart = useCallback(
    async (productId) => {
      setOrderResult(null);

      try {
        const response = await api.removeFromCart({ productId });
        setCart({ items: response.items, total: response.total, count: response.count });
        setUsingDemoData(false);
      } catch {
        setUsingDemoData(true);
        setCart((prev) => normalizeCart(prev.items.filter((item) => item.product.id !== productId)));
      }

      if (settings.voiceReplies) {
        speak("Item removed from cart.");
      }
    },
    [settings.voiceReplies, speak]
  );

  const completeCheckout = useCallback(
    async ({ customerName } = {}) => {
      setIsCheckoutProcessing(true);
      setCheckoutError("");
      const shippingFee = cart.total > 4999 ? 0 : 199;
      const taxAmount = Math.round(cart.total * 0.05);
      const payable = cart.total + shippingFee + taxAmount;

      try {
        const response = await api.checkout();
        setCart(EMPTY_CART);
        setCheckoutForm((prev) => ({ ...CHECKOUT_FORM_DEFAULTS, email: prev.email }));
        setOrderResult({
          orderId: response.orderId || `ORD-${Date.now().toString().slice(-8)}`,
          paidAmount: response.paidAmount,
          customerName: customerName || ""
        });
        setUsingDemoData(false);
        if (settings.voiceReplies) {
          speak(`Checkout complete. Your total was ${response.paidAmount} rupees.`);
        }
        return response;
      } catch {
        setCheckoutError("");
        setUsingDemoData(true);
        const paidAmount = payable;
        setCart(EMPTY_CART);
        setCheckoutForm((prev) => ({ ...CHECKOUT_FORM_DEFAULTS, email: prev.email }));
        const backupResult = {
          orderId: `ORD-${Date.now().toString().slice(-8)}`,
          paidAmount,
          customerName: customerName || ""
        };
        setOrderResult(backupResult);
        if (settings.voiceReplies) {
          speak(`Checkout completed in backup mode. Your total was ${paidAmount} rupees.`);
        }
        return backupResult;
      } finally {
        setIsCheckoutProcessing(false);
      }
    },
    [cart.total, settings.voiceReplies, speak]
  );

  const completeRazorpayUpiCheckout = useCallback(
    async ({ form, summary }) => {
      setIsCheckoutProcessing(true);
      setCheckoutError("");

      try {
        const Razorpay = await loadRazorpayScript();
        const order = await api.createRazorpayOrder({
          customerName: form.fullName,
          email: form.email,
          phone: form.phone
        });

        const verificationResult = await new Promise((resolve, reject) => {
          let settled = false;

          const instance = new Razorpay({
            key: order.keyId,
            order_id: order.orderId,
            amount: order.amount,
            currency: order.currency,
            name: "Prisma Shop",
            description: "UPI checkout",
            method: {
              upi: true,
              card: false,
              netbanking: false,
              wallet: false,
              emi: false,
              paylater: false
            },
            prefill: {
              name: form.fullName,
              email: form.email,
              contact: form.phone
            },
            notes: {
              address: [form.address, form.city, form.zip].filter(Boolean).join(", ")
            },
            theme: {
              color: "#f15464"
            },
            modal: {
              ondismiss: () => {
                if (!settled) {
                  settled = true;
                  reject(new Error("Razorpay checkout was closed before payment completed."));
                }
              }
            },
            handler: async (response) => {
              try {
                const verified = await api.verifyRazorpayPayment({
                  ...response,
                  customerName: form.fullName
                });
                if (!settled) {
                  settled = true;
                  resolve(verified);
                }
              } catch (error) {
                if (!settled) {
                  settled = true;
                  reject(error);
                }
              }
            }
          });

          instance.open();
        });

        setCart(EMPTY_CART);
        setCheckoutForm((prev) => ({ ...CHECKOUT_FORM_DEFAULTS, email: prev.email }));
        setOrderResult({
          orderId: verificationResult.orderId,
          paidAmount: verificationResult.paidAmount || summary.payable,
          customerName: form.fullName
        });
        setUsingDemoData(false);

        if (settings.voiceReplies) {
          speak(`UPI payment complete. Your total was ${verificationResult.paidAmount} rupees.`);
        }

        return verificationResult;
      } catch (error) {
        const message = error?.message || "Failed to complete Razorpay UPI payment.";
        setCheckoutError(
          /Razorpay is not configured/i.test(message)
            ? `${message} Then restart the server and try the payment again.`
            : /Failed to create Razorpay order/i.test(message)
              ? `${message} Check that your server has valid Razorpay keys and working internet access.`
            : message
        );
        throw error;
      } finally {
        setIsCheckoutProcessing(false);
      }
    },
    [settings.voiceReplies, speak]
  );

  const openAssistant = useCallback(() => {
    setAssistantAwake(true);
    setActiveView("assistant");
    setShouldAutoStartMic(true);
  }, []);

  const runManualCommand = useCallback(
    async (input) => {
      const text = input.trim();
      if (!text) {
        return;
