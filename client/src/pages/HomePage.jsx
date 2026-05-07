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
      }

      setRecognizedText(text);
      const intent = detectIntent(text);

      try {
        if (intent.wake) {
          openAssistant();
        }

        if (intent.type === "WAKE_MIC") {
          openAssistant();
          replyToUser(
            text,
            assistantAwake ? "Mike is already awake. Say your shopping command." : "Mike is awake. Say your shopping command."
          );
          return;
        }

        if (intent.type === "GREETING") {
          replyToUser(
            text,
            assistantAwake
              ? "Hi! Tell me what to shop for, like “show Nike shoes under 2000”."
              : "Hi! Say “hello Mike” to wake me, or tell me what to shop for."
          );
          return;
        }

        if (intent.type === "SEARCH") {
          const params = {};
          if (intent.query) params.q = intent.query;
          if (intent.category) params.category = intent.category;
          if (intent.brand) params.brand = intent.brand;
          if (intent.maxPrice) params.maxPrice = intent.maxPrice;
          if (intent.minRating) params.minRating = intent.minRating;
          if (intent.sort) params.sort = intent.sort;

          const chips = buildChipsFromIntent(intent);
          startAiTask({
            stage: "searching",
            command: text,
            detail: "Filtering products and ranking matches…",
            chips
          });

          const found = await loadProducts(params);

          if (intent.query) {
            setFilters((prev) => ({ ...prev, q: intent.query }));
          }
          if (intent.category) {
            setLastCategory(intent.category);
            writeStoredValue(LAST_CATEGORY_KEY, intent.category);
            setFilters((prev) => ({ ...prev, category: intent.category }));
          }
          if (intent.brand) {
            setFilters((prev) => ({ ...prev, brand: intent.brand }));
          }
          if (intent.maxPrice) {
            setFilters((prev) => ({ ...prev, maxPrice: String(intent.maxPrice) }));
          }
          if (intent.minRating) {
            setFilters((prev) => ({ ...prev, minRating: String(intent.minRating) }));
          }
          if (intent.sort) {
            setFilters((prev) => ({ ...prev, sort: intent.sort }));
          }

          setActiveView("shop");

          if (found.length) {
            const focusProduct = pickFocusProduct(found, text);
            if (focusProduct?.id) {
              setAiActivity({
                kind: "search",
                stage: "scrolling",
                command: text,
                detail: `Scrolling to: ${focusProduct.title}`,
                chips
              });
              setAiFocusProductId(focusProduct.id);
              scheduleAiTimer(() => setAiFocusProductId(null), 2600);
              scheduleAiTimer(() => setAiActivity(null), 2300);
            } else {
              setAiActivity({ kind: "search", stage: "done", command: text, detail: "Results ready.", chips });
              scheduleAiTimer(() => setAiActivity(null), 1400);
            }
          } else {
            setAiActivity({ kind: "search", stage: "done", command: text, detail: "No matches found.", chips });
            scheduleAiTimer(() => setAiActivity(null), 1500);
          }

          replyToUser(
            text,
            found.length
              ? `Found ${found.length} matching product${found.length > 1 ? "s" : ""}.`
              : "No matching products found."
          );
          return;
        }

        if (intent.type === "TRENDING") {
          await loadRecommendations({ type: "trending" });
          replyToUser(text, "Showing recommended products.");
          return;
        }

        if (intent.type === "SIMILAR") {
          if (!lastCategory) {
            replyToUser(text, "Search a category first so I know what to compare.");
            return;
          }

          try {
            const response = await api.getRecommendations({ type: "similar", category: lastCategory });
            setProducts(response.items);
            setUsingDemoData(false);
          } catch {
            setProducts(filterDemoProducts({ category: lastCategory }));
            setUsingDemoData(true);
          }

          setActiveView("shop");
          replyToUser(text, `Showing products in ${lastCategory}.`);
          return;
        }

        if (intent.type === "ADD") {
          const product = resolveProductFromCommand(intent);

          if (!product) {
            replyToUser(
              text,
              "I could not identify which item to add. Try saying the product name, like add Nike SwiftLite Street Shoe to cart."
            );
            return;
          }

          await addToCart(product.id, text);
          return;
        }

        if (intent.type === "REMOVE") {
          if (!intent.itemName) {
            replyToUser(text, "Please say the product name to remove.");
            return;
          }

          try {
            const response = await api.removeFromCart({ titleQuery: intent.itemName });
            setCart({ items: response.items, total: response.total, count: response.count });
            setUsingDemoData(false);
          } catch {
            setUsingDemoData(true);
            setCart((prev) =>
              normalizeCart(
                prev.items.filter(
                  (item) => !item.product.title.toLowerCase().includes(intent.itemName.toLowerCase())
                )
              )
            );
          }

          replyToUser(text, "Item removed from cart.");
          return;
        }

        if (intent.type === "CHECKOUT") {
          if (!cart.count) {
            replyToUser(text, "Your cart is empty.");
            return;
          }

          setActiveView("checkout");
          replyToUser(text, "Checkout is ready.");
          return;
        }

        if (intent.type === "HELP") {
          replyToUser(
            text,
            "Try commands like show shoes under 2000, add first item, remove item, or checkout now."
          );
          return;
        }

        if (settings.aiAssistantMode) {
          try {
            const aiHistory = history
              .slice(0, 6)
              .reverse()
              .flatMap((entry) => [
                { role: "user", content: entry.command },
                { role: "assistant", content: entry.response }
              ]);

            const intentGuess = detectIntent(text);
            const shouldShowSearchFx = intentGuess?.type === "SEARCH";
            if (shouldShowSearchFx) {
              const chips = buildChipsFromIntent(intentGuess);
              startAiTask({
                stage: "searching",
                command: text,
                detail: "AI is searching and applying filters…",
                chips
              });
            }

            const response = await api.aiChat({ message: text, history: aiHistory });
            if (response?.reply) {
              if (Array.isArray(response.ui?.products)) {
                setProducts(response.ui.products);
              }
              if (Array.isArray(response.ui?.recommendations)) {
                setRecommendations(response.ui.recommendations);
              }
              if (response.ui?.cart) {
                setCart(response.ui.cart);
              }
              if (response.ui?.orderResult) {
                setOrderResult(response.ui.orderResult);
              }
              if (typeof response.ui?.activeView === "string") {
                setActiveView(response.ui.activeView);
              }
              if (response.ui?.lastCategory) {
                setLastCategory(response.ui.lastCategory);
                writeStoredValue(LAST_CATEGORY_KEY, response.ui.lastCategory);
              }

              if (shouldShowSearchFx && Array.isArray(response.ui?.products)) {
                const chips = buildChipsFromIntent(intentGuess);
                const focusProduct = pickFocusProduct(response.ui.products, text);
                if (focusProduct?.id) {
                  setAiActivity({
                    kind: "search",
                    stage: "scrolling",
                    command: text,
                    detail: `Scrolling to: ${focusProduct.title}`,
                    chips
                  });
                  setAiFocusProductId(focusProduct.id);
                  scheduleAiTimer(() => setAiFocusProductId(null), 2600);
                  scheduleAiTimer(() => setAiActivity(null), 2300);
                } else {
                  setAiActivity({ kind: "search", stage: "done", command: text, detail: "Results ready.", chips });
                  scheduleAiTimer(() => setAiActivity(null), 1400);
                }
              } else if (shouldShowSearchFx) {
                scheduleAiTimer(() => setAiActivity(null), 900);
              }

              setUsingDemoData(false);
              replyToUser(text, response.reply);
              return;
            }
          } catch {
            // Fall through to local reply below.
          }
        }

        replyToUser(text, "I did not understand that command.");
      } catch (error) {
        replyToUser(text, `Something went wrong: ${error.message}`);
      }
    },
    [
      activeView,
      addToCart,
      assistantAwake,
      buildChipsFromIntent,
      cart.count,
      history,
      lastCategory,
      loadProducts,
      loadRecommendations,
      openAssistant,
      pickFocusProduct,
      replyToUser,
      resolveProductFromCommand,
      scheduleAiTimer,
      settings.aiAssistantMode,
      startAiTask
    ]
  );

  const {
    supported,
    isListening,
    interimText,
    error,
    startListening,
    stopListening
  } = useSpeechRecognition({
    onFinalResult: runManualCommand,
    continuous
  });

  const toggleListening = () => {
    if (forceFallback) {
      recordFallbackCommand();
      return;
    }

    if (isListening) {
      stopListening();
      setAssistantAwake(false);
    } else {
      startListening();
    }
  };

  const recordFallbackCommand = useCallback(async () => {
    if (isFallbackRecording) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setFallbackError("Fallback recording is not supported in this browser.");
      return;
    }

    setFallbackError("");
    setFallbackStatus("");
    setIsFallbackRecording(true);

    let stream;
    try {
      setFallbackStatus("Checking voice backend...");
      await api.health();
      setFallbackStatus("Recording...");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = window.MediaRecorder.isTypeSupported?.("audio/webm") ? "audio/webm" : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];

      await new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        recorder.onerror = () => reject(new Error("Recording failed."));
        recorder.onstop = resolve;
        recorder.start();

        setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, 4500);
      });

      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (!blob.size) {
        throw new Error("No audio was recorded. Please try again.");
      }

      const arrayBuffer = await blob.arrayBuffer();
      const audioBase64 = toBase64(new Uint8Array(arrayBuffer));
      setFallbackStatus("Transcribing...");

      const response = await api.transcribeAudio({ audioBase64, mimeType: blob.type });
      const transcript = String(response?.text || "").trim();
      if (!transcript) {
        throw new Error("Could not detect clear speech.");
      }

      setFallbackStatus(`Heard: "${transcript}"`);
      await runManualCommand(transcript);
    } catch (err) {
      setFallbackStatus("");
      setFallbackError(formatVoiceError(err?.message || "Fallback voice command failed."));
    } finally {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsFallbackRecording(false);
    }
  }, [isFallbackRecording, runManualCommand]);

  useEffect(() => {
    if (/(speech|network|service|unavailable)/.test(String(error || "").toLowerCase())) {
      setForceFallback(true);
      if (isListening) {
        stopListening();
      }
    }
  }, [error, isListening, stopListening]);

  useEffect(() => {
    if (shouldAutoStartMic) {
      if (supported && !isListening && !forceFallback) {
        startListening();
      }
      setShouldAutoStartMic(false);
    }
  }, [forceFallback, isListening, shouldAutoStartMic, startListening, supported]);

  useEffect(() => {
    loadCategories();
    loadCart();
    loadRecommendations({ type: "trending" });
    loadProducts();
  }, [loadCart, loadCategories, loadProducts, loadRecommendations]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    writeStoredValue(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    writeStoredValue(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const applyFilters = async () => {
    const params = {};
    if (filters.q) params.q = filters.q;
    if (filters.category) params.category = filters.category;
    if (filters.brand) params.brand = filters.brand;
    if (filters.sort) params.sort = filters.sort;
    if (filters.maxPrice) params.maxPrice = Number(filters.maxPrice);
    if (filters.minRating) params.minRating = Number(filters.minRating);

    const found = await loadProducts(params);
    if (filters.category) {
      setLastCategory(filters.category);
      writeStoredValue(LAST_CATEGORY_KEY, filters.category);
    }
    return found;
  };

  const resetFilters = async () => {
    setFilters({
      q: "",
      category: "",
      brand: "",
      sort: "",
      maxPrice: "",
      minRating: ""
    });
    await loadProducts();
  };

  const jumpToCategory = async (category) => {
    setFilters((prev) => ({ ...prev, category }));
    setLastCategory(category);
    writeStoredValue(LAST_CATEGORY_KEY, category);
    await loadProducts({ category });
    setActiveView("shop");
  };

  const stats = useMemo(() => {
    if (!products.length) {
      return { averagePrice: 0, budgetCount: 0, topRated: "-" };
    }

    const averagePrice = Math.round(
      products.reduce((sum, product) => sum + product.priceInr, 0) / products.length
    );
    const budgetCount = products.filter((product) => product.priceInr <= 3000).length;
    const topRated =
      [...products].sort((a, b) => b.rating.rate - a.rating.rate)[0]?.title || "-";

    return { averagePrice, budgetCount, topRated };
  }, [products]);

  const statusLine = useMemo(
    () => `${products.length} products${isLoadingProducts ? " - loading" : ""}`,
    [isLoadingProducts, products.length]
  );

  const recentHistory = useMemo(() => history.slice(0, 4), [history]);

  const placeOrder = async ({ form, summary }) => {
    try {
      const result =
        form.paymentMethod === "upi"
          ? await completeRazorpayUpiCheckout({ form, summary })
          : await completeCheckout({ customerName: form.fullName });

      appendHistory(
        "checkout",
        `Order placed. Amount paid: Rs ${Number(result.paidAmount).toLocaleString("en-IN")}.`
      );
    } catch {
      // Error already surfaced in checkout UI.
    }
  };

  const openCheckoutView = useCallback(() => {
    if (!cart.count) {
      return;
    }

    setOrderResult(null);
    setCheckoutError("");
    setActiveView("checkout");
  }, [cart.count]);

  const voiceControlProps = {
    supported,
    isListening,
    assistantAwake,
    interimText,
    recognizedText,
    error,
    continuous,
    forceFallback,
    quickCommands: QUICK_COMMANDS,
    onToggleContinuous: () => setContinuous((prev) => !prev),
    onToggleListening: toggleListening,
    onRunManualCommand: runManualCommand,
    onTranscribeAudio: async ({ audioBase64, mimeType }) =>
      (await api.transcribeAudio({ audioBase64, mimeType })).text
  };

  return (
    <main
      className={`app-shell ${mobileOpen ? "nav-open" : ""} ${
        aiActivity?.kind === "search" && aiActivity?.stage === "searching" ? "ai-shake" : ""
      }`}
    >
      <div className="app-layout">
        <Navbar
          items={NAV_ITEMS}
          activeView={activeView}
          onChangeView={(view) => {
            setActiveView(view);
            setMobileOpen(false);
          }}
          usingDemoData={usingDemoData}
          cartCount={cart.count}
          commandCount={history.length}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        <section className="main-content">
          <div className="topbar glass">
            <button className="menu-btn" onClick={() => setMobileOpen((prev) => !prev)}>
              Menu
            </button>

            <div className="topbar-copy">
              <strong>Data source</strong>
              <p>{usingDemoData ? "Using backup demo data" : "Connected to live data"}</p>
            </div>

            <div className="topbar-right">
              <span className="topbar-status">{usingDemoData ? "Backup catalog" : "Live catalog"}</span>
              {currentUser ? (
                <div className="auth-user-chip">
                  <span>{currentUser.email || "Signed in"}</span>
                  <button type="button" className="theme-btn" onClick={onLogout}>
                    Logout
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                className="theme-btn"
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </div>

          <Header
            lastCategory={lastCategory}
            productCount={products.length}
            cartCount={cart.count}
            isListening={isListening}
            recognizedText={recognizedText}
            aiAssistantMode={settings.aiAssistantMode}
          />

          {activeView === "overview" ? (
            <>
              <section className="simple-grid">
                <article className="glass summary-card">
                  <span>Total products</span>
                  <strong>{products.length}</strong>
                  <p>{usingDemoData ? "Backup catalog active" : "Live catalog loaded"}</p>
                </article>
                <article className="glass summary-card">
                  <span>Cart total</span>
                  <strong>Rs {cart.total.toLocaleString("en-IN")}</strong>
                  <p>{cart.count ? `${cart.count} item(s) selected` : "Cart is empty"}</p>
                </article>
                <article className="glass summary-card">
                  <span>Recent commands</span>
                  <strong>{history.length}</strong>
                  <p>{recognizedText || "No command used yet"}</p>
                </article>
              </section>

              <section className="layout">
                <section className="glass simple-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Quick actions</h2>
                      <p className="status">Launch the most-used flows from one control cluster.</p>
                    </div>
                  </div>
                  <div className="simple-actions">
                    <button type="button" onClick={() => setActiveView("shop")}>
                      Open catalog
                    </button>
                    <button type="button" onClick={() => setActiveView("assistant")}>
                      Open assistant
                    </button>
                    <button type="button" onClick={() => loadRecommendations({ type: "trending" })}>
                      Refresh recommendations
                    </button>
                    <button
                      type="button"
                      onClick={openCheckoutView}
                      disabled={!cart.count}
                    >
                      Open checkout
                    </button>
                  </div>
                </section>

                <HistoryPanel history={recentHistory} />
              </section>

              <section className="layout">
                <section className="glass simple-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Categories</h2>
                      <p className="status">Jump straight into category results.</p>
                    </div>
                  </div>
                  <div className="category-list">
                    {categories.map((category) => (
                      <button type="button" key={category} onClick={() => jumpToCategory(category)}>
                        {category}
                      </button>
                    ))}
                  </div>
                </section>

                <ShowcasePanel items={recommendations} />
              </section>
            </>
          ) : null}

          {activeView === "shop" ? (
            <>
              <VoiceControl {...voiceControlProps} />

              <AiActivityBanner activity={aiActivity} />

              <section
                className={`filters glass ${
                  aiActivity?.kind === "search" && aiActivity?.stage === "searching" ? "ai-scanning" : ""
                }`}
              >
                <div className="filter-head">
                  <div>
                    <h2>Filters</h2>
                    <p className="status">Use filters or commands to update the product list.</p>
                  </div>
                  <div className="filter-actions">
                    <button type="button" onClick={applyFilters}>
                      Apply
                    </button>
                    <button type="button" onClick={resetFilters}>
                      Reset
                    </button>
                  </div>
                </div>

                <div className="filter-grid">
                  <label>
                    Search
                    <input
                      value={filters.q}
                      onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                      placeholder="Search title or category"
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={filters.category}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, category: event.target.value }))
                      }
                    >
                      <option value="">All</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Brand
                    <input
                      value={filters.brand}
                      onChange={(event) => setFilters((prev) => ({ ...prev, brand: event.target.value }))}
                      placeholder="Nike, Adidas, Puma"
                    />
                  </label>
                  <label>
                    Sort
                    <select
                      value={filters.sort}
                      onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value }))}
                    >
                      <option value="">Default</option>
                      <option value="price_asc">Price: Low to high</option>
                      <option value="price_desc">Price: High to low</option>
                      <option value="rating_desc">Highest rated</option>
                    </select>
                  </label>
                  <label>
                    Max price
                    <input
                      type="number"
                      min="0"
                      value={filters.maxPrice}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))
                      }
                      placeholder="3000"
                    />
                  </label>
                  <label>
                    Min rating
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={filters.minRating}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, minRating: event.target.value }))
                      }
                      placeholder="4"
                    />
                  </label>
                </div>
              </section>

              <p className="status-line">{statusLine}</p>

              <section className="simple-grid">
                <article className="glass summary-card">
                  <span>Average price</span>
                  <strong>Rs {stats.averagePrice.toLocaleString("en-IN")}</strong>
                </article>
                <article className="glass summary-card">
                  <span>Under Rs 3000</span>
                  <strong>{stats.budgetCount}</strong>
                </article>
                <article className="glass summary-card">
                  <span>Top rated</span>
                  <strong>{stats.topRated}</strong>
                </article>
              </section>

              <section className="layout">
                <div>
                  <ProductGrid
                    products={products}
                    onAdd={addToCart}
                    isLoading={isLoadingProducts}
                    aiFocusProductId={aiFocusProductId}
                  />
                </div>
                <div className="stack">
                  <CartPanel
                    cart={cart}
                    onRemove={removeFromCart}
                    onProceedCheckout={openCheckoutView}
                  />
                  <RecommendationsPanel items={recommendations} onAdd={addToCart} />
                </div>
              </section>
            </>
          ) : null}

          {activeView === "cart" ? (
            <section className="layout">
              <CartPanel
                cart={cart}
                onRemove={removeFromCart}
                onProceedCheckout={openCheckoutView}
              />
              <div className="stack">
                <RecommendationsPanel items={recommendations} onAdd={addToCart} />
                <HistoryPanel history={history} />
              </div>
            </section>
          ) : null}

          {activeView === "checkout" ? (
            cart.count || orderResult ? (
              <CheckoutPanel
                cart={cart}
                form={checkoutForm}
                isProcessing={isCheckoutProcessing}
                orderResult={orderResult}
                onPlaceOrder={placeOrder}
                onBackToCart={() => setActiveView("cart")}
                onContinueShopping={() => {
                  setOrderResult(null);
                  setCheckoutError("");
                  setCheckoutForm((prev) => ({ ...CHECKOUT_FORM_DEFAULTS, email: prev.email }));
                  setActiveView("shop");
                }}
                checkoutError={checkoutError}
                onFormChange={(key, value) =>
                  setCheckoutForm((prev) => ({
                    ...prev,
                    [key]: value
                  }))
                }
              />
            ) : (
              <section className="glass checkout-empty">
                <h2>Checkout</h2>
                <p className="status">Your cart is empty. Add products before placing an order.</p>
                <button type="button" onClick={() => setActiveView("shop")}>
                  Go to catalog
                </button>
              </section>
            )
          ) : null}

          {activeView === "assistant" ? (
            <section className="layout">
              <div className="stack">
                <VoiceControl {...voiceControlProps} />
                <HistoryPanel history={history} />
              </div>
              <div className="stack">
                <RecommendationsPanel items={recommendations} onAdd={addToCart} />
                <CartPanel
                  cart={cart}
                  onRemove={removeFromCart}
                  onProceedCheckout={openCheckoutView}
                />
              </div>
            </section>
          ) : null}

          {activeView === "settings" ? (
            <section className="settings-shell">
              <div className="glass settings-card">
                <h2>Settings</h2>
                <p className="status">Tune assistant behavior, memory, and cart flow preferences.</p>

                <div className="settings-list">
                  <label className="setting-row">
                    <span>Voice replies</span>
                    <input
                      type="checkbox"
                      checked={settings.voiceReplies}
                      onChange={() =>
                        setSettings((prev) => ({ ...prev, voiceReplies: !prev.voiceReplies }))
                      }
                    />
                  </label>
                  <label className="setting-row">
                    <span>AI assistant mode</span>
                    <input
                      type="checkbox"
                      checked={settings.aiAssistantMode}
                      onChange={() =>
                        setSettings((prev) => ({ ...prev, aiAssistantMode: !prev.aiAssistantMode }))
                      }
                    />
                  </label>
                  <label className="setting-row">
                    <span>Open cart after add</span>
                    <input
                      type="checkbox"
                      checked={settings.autoOpenCartOnAdd}
                      onChange={() =>
                        setSettings((prev) => ({
                          ...prev,
                          autoOpenCartOnAdd: !prev.autoOpenCartOnAdd
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="settings-actions">
                  <button type="button" onClick={() => setHistory([])}>
                    Clear history
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLastCategory("");
                      removeStoredValue(LAST_CATEGORY_KEY);
                    }}
                  >
                    Clear last category
                  </button>
                  <button type="button" onClick={() => setSettings(DEFAULT_SETTINGS)}>
                    Reset settings
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {activeView === "faq" ? (
            <section className="faq-shell">
              <div className="glass faq-card">
                <h2>Help</h2>
                <p className="status">Fast answers for voice, catalog, and checkout workflows.</p>
                <div className="faq-list">
                  {FAQ_ITEMS.map((item) => (
                    <details key={item.q} className="faq-item">
                      <summary>{item.q}</summary>
                      <p>{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </div>

      {aiCursorGhost ? (
        <div
          className="ai-cursor-ghost"
          aria-hidden="true"
          style={{
            "--x0": String(aiCursorGhost.x0),
            "--y0": String(aiCursorGhost.y0),
            "--x1": String(aiCursorGhost.x1),
            "--y1": String(aiCursorGhost.y1),
            "--dist": String(aiCursorGhost.dist),
            "--angle": String(aiCursorGhost.angle)
          }}
        >
          <span className="trail" />
          <span className="ghost" />
        </div>
      ) : null}

      <FloatingMikeButton
        supported={supported}
        isListening={isListening}
        assistantAwake={assistantAwake}
        interimText={interimText}
        recognizedText={recognizedText}
        error={error}
        isFallbackRecording={isFallbackRecording}
        fallbackStatus={fallbackStatus}
        fallbackError={fallbackError}
        forceFallback={forceFallback}
        onToggleListening={toggleListening}
        onRecordFallback={recordFallbackCommand}
        onOpenAssistant={() => setActiveView("assistant")}
      />
    </main>
  );
}
