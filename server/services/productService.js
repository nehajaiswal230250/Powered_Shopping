import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FAKE_STORE_URL = "https://fakestoreapi.com/products";
const INR_RATE = 83;
const DEFAULT_FETCH_TIMEOUT_MS = 1200;
const KNOWN_BRANDS = [
  "Nike",
  "Adidas",
  "Puma",
  "Reebok",
  "Urban Trek",
  "Quantum",
  "Echo",
  "Nova",
  "Aero",
  "Pulse",
  "Vortex",
  "Titan",
  "Orbit",
  "Lumen",
  "Arctic",
  "Metro",
  "Cloudweave",
  "Flux",
  "Horizon",
  "Zen",
  "Summit",
  "Breeze",
  "Nest",
  "Prime",
  "Helix",
  "Nimbus",
  "Spark",
  "Vertex",
  "Apex",
  "Stride",
  "Comet"
];

const toNumber = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const inferBrand = (product) => {
  if (product.brand) {
    return String(product.brand);
  }

  const title = String(product.title || "").toLowerCase();
  const matchedBrand = KNOWN_BRANDS.find((brand) =>
    new RegExp(`\\b${brand.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(title)
  );

  return matchedBrand || "";
};

const normalizeProduct = (product) => {
  const usd = toNumber(product.price, 0);
  const ratingRate = toNumber(product.rating?.rate, 0);
  const ratingCount = toNumber(product.rating?.count, 0);

  return {
    ...product,
    brand: inferBrand(product),
    price: usd,
    priceInr: Math.round(usd * INR_RATE),
    rating: {
      rate: ratingRate,
      count: ratingCount
    }
  };
};

let productCache = null;
let cacheTs = 0;
let productCachePromise = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadMockProducts = async () => {
  const filePath = path.join(__dirname, "../data/mockProducts.json");
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content).map(normalizeProduct);
};

const getProductDataSource = () => {
  const source = String(process.env.PRODUCT_DATA_SOURCE || "auto").toLowerCase();
  return ["auto", "mock", "remote"].includes(source) ? source : "auto";
};

const getFetchTimeoutMs = () => {
  const timeout = Number(process.env.PRODUCT_FETCH_TIMEOUT_MS || DEFAULT_FETCH_TIMEOUT_MS);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_FETCH_TIMEOUT_MS;
};

const updateCache = (products) => {
  productCache = products;
  cacheTs = Date.now();
  return productCache;
};

const loadRemoteProducts = async () => {
  const response = await fetch(FAKE_STORE_URL, {
    signal: AbortSignal.timeout(getFetchTimeoutMs())
  });

  if (!response.ok) {
    throw new Error(`FakeStore error: ${response.status}`);
  }

  const data = await response.json();
  return data.map(normalizeProduct);
};

const mergeProducts = (primaryProducts, fallbackProducts) => {
  const seen = new Set();
  return [...primaryProducts, ...fallbackProducts].filter((product) => {
    const key = String(product.id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const getProducts = async () => {
  if (productCache && Date.now() - cacheTs < CACHE_TTL_MS) {
    return productCache;
  }

  if (productCachePromise) {
    return productCachePromise;
  }

  productCachePromise = (async () => {
    const source = getProductDataSource();

    if (source === "mock") {
      return updateCache(await loadMockProducts());
    }

    try {
      const [remoteProducts, mockProducts] = await Promise.all([
        loadRemoteProducts(),
        loadMockProducts()
      ]);
      return updateCache(mergeProducts(remoteProducts, mockProducts));
    } catch (error) {
      console.warn(
        `Product catalog falling back to local mock data (${error.message || "unknown error"}).`
      );
      return updateCache(await loadMockProducts());
    }
  })();

  try {
    return await productCachePromise;
  } finally {
    productCachePromise = null;
  }
};

export const filterProducts = (products, filters = {}) => {
  const {
    q,
    category,
    brand,
    maxPrice,
    minPrice,
    minRating,
    sort = ""
  } = filters;

  let result = [...products];

  if (q) {
    const query = String(q).toLowerCase();
    result = result.filter((p) =>
      `${p.title} ${p.brand || ""} ${p.description} ${p.category}`.toLowerCase().includes(query)
    );
  }

  if (category) {
    const c = String(category).toLowerCase();
    result = result.filter((p) => p.category.toLowerCase().includes(c));
  }

  if (brand) {
    const b = String(brand).toLowerCase();
    result = result.filter((p) => `${p.brand || ""} ${p.title}`.toLowerCase().includes(b));
  }

  const maxPriceNum = toNumber(maxPrice);
  if (maxPriceNum !== null) {
    result = result.filter((p) => p.priceInr <= maxPriceNum);
  }

  const minPriceNum = toNumber(minPrice);
  if (minPriceNum !== null) {
    result = result.filter((p) => p.priceInr >= minPriceNum);
  }

  const minRatingNum = toNumber(minRating);
  if (minRatingNum !== null) {
    result = result.filter((p) => p.rating.rate >= minRatingNum);
  }

  if (sort === "price_asc") {
    result.sort((a, b) => a.priceInr - b.priceInr);
  } else if (sort === "price_desc") {
    result.sort((a, b) => b.priceInr - a.priceInr);
  } else if (sort === "rating_desc") {
    result.sort((a, b) => b.rating.rate - a.rating.rate);
  }

  return result;
};
