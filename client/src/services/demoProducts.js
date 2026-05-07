const CATEGORY_IMAGE_MAP = {
  electronics: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
  footwear: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  fashion: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80",
  accessories: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=900&q=80",
  home: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=900&q=80",
  wearables: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
  gaming: "https://images.unsplash.com/photo-1603481546238-65e7c2d7bcb3?auto=format&fit=crop&w=900&q=80"
};

const RAW_PRODUCTS = [
  { title: "Nike AirPulse Runner", category: "footwear", priceInr: 2999, rate: 4.6, count: 540, description: "Lightweight running sneakers with breathable mesh and responsive sole." },
  { title: "Nike SwiftLite Street Shoe", category: "footwear", priceInr: 1899, rate: 4.2, count: 386, description: "Budget Nike street shoe for daily comfort and lightweight walks." },
  { title: "Adidas StreetFlex Shoes", category: "footwear", priceInr: 2799, rate: 4.4, count: 390, description: "Everyday sneakers tuned for city comfort and long walks." },
  { title: "Puma MotionStride Trainers", category: "footwear", priceInr: 2499, rate: 4.3, count: 315, description: "Balanced grip trainers for gym, jogging, and commute." },
  { title: "Reebok Ignite Court Sneakers", category: "footwear", priceInr: 3299, rate: 4.5, count: 298, description: "Cushioned court-inspired sneakers with stable heel lock." },
  { title: "Urban Trek Hiking Boots", category: "footwear", priceInr: 4199, rate: 4.7, count: 184, description: "Rugged boots with anti-slip sole for trails and monsoons." },
  { title: "Quantum Noise-Cancel Headphones", category: "electronics", priceInr: 4999, rate: 4.8, count: 660, description: "Hybrid ANC over-ear headphones with deep bass and long battery." },
  { title: "Echo Wireless Earbuds Pro", category: "electronics", priceInr: 3299, rate: 4.5, count: 470, description: "Compact earbuds with clear call mics and low-latency mode." },
  { title: "Nova Studio USB Microphone", category: "electronics", priceInr: 3799, rate: 4.6, count: 360, description: "Podcast-ready condenser microphone with cardioid capture." },
  { title: "Aero Mechanical Keyboard", category: "electronics", priceInr: 4499, rate: 4.4, count: 280, description: "Tactile mechanical keyboard with hot-swap switches and RGB." },
  { title: "Pulse Ergonomic Gaming Mouse", category: "gaming", priceInr: 1899, rate: 4.3, count: 410, description: "Programmable high-DPI mouse tuned for FPS and productivity." },
  { title: "Vortex RGB Gaming Headset", category: "gaming", priceInr: 2599, rate: 4.2, count: 230, description: "Virtual surround headset with memory-foam ear cushions." },
  { title: "Titan Smart Fitness Watch", category: "wearables", priceInr: 3599, rate: 4.4, count: 505, description: "Tracks activity, heart rate, sleep, and guided breathing." },
  { title: "Orbit Health Band 2", category: "wearables", priceInr: 2199, rate: 4.2, count: 342, description: "Slim health tracker with SpO2, step count, and alerts." },
  { title: "Lumen Smart Ring", category: "wearables", priceInr: 6999, rate: 4.1, count: 124, description: "Minimal smart ring with wellness trends and recovery score." },
  { title: "Arctic Travel Jacket", category: "fashion", priceInr: 3899, rate: 4.5, count: 251, description: "Weather-resistant travel jacket with concealed pockets." },
  { title: "Pulse Street Hoodie", category: "fashion", priceInr: 2199, rate: 4.3, count: 318, description: "Soft premium hoodie with structured fit and warm fleece." },
  { title: "Aero Performance Tee", category: "fashion", priceInr: 1299, rate: 4.1, count: 276, description: "Quick-dry athletic t-shirt with odor-control fabric." },
  { title: "Metro Denim Shirt", category: "fashion", priceInr: 1699, rate: 4.0, count: 143, description: "Tailored denim shirt suitable for casual and smart styling." },
  { title: "Cloudweave Linen Kurta", category: "fashion", priceInr: 1899, rate: 4.4, count: 190, description: "Breathable linen kurta with modern minimalist cut." },
  { title: "Orbit Commuter Backpack", category: "accessories", priceInr: 1799, rate: 4.5, count: 355, description: "Water-resistant backpack with padded laptop sleeve." },
  { title: "Flux Minimal Wallet", category: "accessories", priceInr: 899, rate: 4.2, count: 232, description: "Slim RFID wallet with premium faux leather finish." },
  { title: "Horizon Polarized Sunglasses", category: "accessories", priceInr: 1499, rate: 4.3, count: 265, description: "UV-protective lightweight shades for daily outdoor use." },
  { title: "Zen Leather Sling Bag", category: "accessories", priceInr: 2099, rate: 4.1, count: 159, description: "Compact sling with multipocket organization and soft lining." },
  { title: "Summit Stainless Bottle", category: "home", priceInr: 699, rate: 4.6, count: 420, description: "Vacuum insulated bottle keeps water cold for 18 hours." },
  { title: "Lumen Desk Ambient Lamp", category: "home", priceInr: 1499, rate: 4.2, count: 290, description: "Dimmable warm-white lamp with touch brightness controls." },
  { title: "Zen Ceramic Coffee Mug", category: "home", priceInr: 499, rate: 4.4, count: 310, description: "Large matte-finish mug for coffee, tea, and cocoa." },
  { title: "Breeze Aroma Diffuser", category: "home", priceInr: 1999, rate: 4.3, count: 182, description: "Ultrasonic diffuser with soft RGB mood lighting." },
  { title: "Nest Smart Plug Duo", category: "home", priceInr: 1299, rate: 4.1, count: 208, description: "Dual smart plugs with app scheduling and energy monitor." },
  { title: "Prime 4K Streaming Stick", category: "electronics", priceInr: 3499, rate: 4.5, count: 402, description: "Compact streaming stick with voice remote and Dolby support." },
  { title: "Helix Portable SSD 1TB", category: "electronics", priceInr: 6999, rate: 4.7, count: 196, description: "Fast USB-C SSD for creators, backups, and travel projects." },
  { title: "Nimbus Tablet 11", category: "electronics", priceInr: 18999, rate: 4.3, count: 145, description: "11-inch tablet for reading, media, sketching, and calls." },
  { title: "Spark Action Camera Mini", category: "electronics", priceInr: 7999, rate: 4.2, count: 127, description: "Pocket camera with stabilization and waterproof housing." },
  { title: "Vertex Gaming Controller", category: "gaming", priceInr: 2999, rate: 4.4, count: 236, description: "Wireless gamepad with dual vibration and custom profiles." },
  { title: "Apex 27 inch Gaming Monitor", category: "gaming", priceInr: 14999, rate: 4.6, count: 168, description: "High refresh gaming monitor with vivid colors and low lag." },
  { title: "Stride Yoga Mat Pro", category: "home", priceInr: 1399, rate: 4.5, count: 249, description: "Non-slip workout mat with balanced grip and cushioning." },
  { title: "Comet Travel Neck Pillow", category: "accessories", priceInr: 1099, rate: 4.0, count: 137, description: "Memory foam neck pillow for flights and long drives." }
];

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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const inferBrand = (title) => {
  const normalizedTitle = String(title || "").toLowerCase();
  return (
    KNOWN_BRANDS.find((brand) =>
      new RegExp(`\\b${escapeRegExp(brand.toLowerCase())}\\b`).test(normalizedTitle)
    ) || ""
  );
};

export const DEMO_PRODUCTS = RAW_PRODUCTS.map((item, index) => ({
  id: 1001 + index,
  ...item,
  brand: inferBrand(item.title),
  image: CATEGORY_IMAGE_MAP[item.category] || CATEGORY_IMAGE_MAP.electronics,
  rating: {
    rate: item.rate,
    count: item.count
  }
}));

const numeric = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) => normalizeText(value).split(" ").filter(Boolean);

const scoreProductAgainstQuery = (product, query) => {
  const haystack = normalizeText(
    `${product.title} ${product.brand || ""} ${product.description} ${product.category}`
  );
  const tokens = tokenize(query);

  if (!tokens.length) {
    return 0;
  }

  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += token.length >= 4 ? 3 : 2;
    } else if (
      tokenize(`${product.title} ${product.brand || ""} ${product.category}`).some(
        (word) => word.startsWith(token) || token.startsWith(word)
      )
    ) {
      score += 1;
    }
  }

  if (haystack.includes(normalizeText(query))) {
    score += 4;
  }

  return score;
};

export const getDemoCategories = () => [...new Set(DEMO_PRODUCTS.map((product) => product.category))];

export const filterDemoProducts = (filters = {}) => {
  const { q, category, brand, maxPrice, minPrice, minRating, sort = "" } = filters;

  let result = [...DEMO_PRODUCTS];
  let rankedResult = null;

  if (q) {
    const query = String(q).trim();
    rankedResult = result
      .map((product) => ({
        product,
        score: scoreProductAgainstQuery(product, query)
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.product.rating.rate - a.product.rating.rate);

    result = rankedResult.map((entry) => entry.product);
  }

  if (category) {
    const c = String(category).toLowerCase();
    result = result.filter((product) => product.category.toLowerCase().includes(c));
  }

  if (brand) {
    const b = String(brand).toLowerCase();
    result = result.filter((product) =>
      `${product.brand || ""} ${product.title}`.toLowerCase().includes(b)
    );
  }

  const max = numeric(maxPrice);
  if (max !== null) {
    result = result.filter((product) => product.priceInr <= max);
  }

  const min = numeric(minPrice);
  if (min !== null) {
    result = result.filter((product) => product.priceInr >= min);
  }

  const rating = numeric(minRating);
  if (rating !== null) {
    result = result.filter((product) => product.rating.rate >= rating);
  }

  if (sort === "price_asc") {
    result.sort((a, b) => a.priceInr - b.priceInr);
  } else if (sort === "price_desc") {
    result.sort((a, b) => b.priceInr - a.priceInr);
  } else if (sort === "rating_desc") {
    result.sort((a, b) => b.rating.rate - a.rating.rate);
  } else if (rankedResult) {
    result = rankedResult
      .map((entry) => entry.product)
      .filter((product) => result.some((item) => item.id === product.id));
  }

  return result;
};

export const getTrendingDemoProducts = (limit = 6) =>
  [...DEMO_PRODUCTS]
    .sort((a, b) => b.rating.rate * b.rating.count - a.rating.rate * a.rating.count)
    .slice(0, limit);
