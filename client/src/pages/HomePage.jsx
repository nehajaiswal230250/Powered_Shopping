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
