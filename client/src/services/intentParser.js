const ORDINAL_MAP = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  "1st": 1,
  "2nd": 2,
  "3rd": 3,
  "4th": 4,
  "5th": 5
};

const WAKE_WORD_REGEX =
  /(?:^|\s)(?:hello|hey|hi)\s+(?:mike|mic|myke)(?:\s+live)?(?:\s|$)|(?:^|\s)(?:mike|mic|myke)\s+live(?:\s|$)|(?:^|\s)wake\s+(?:mike|mic)(?:\s|$)/i;

const GREETING_REGEX =
  /^(?:hi|hello|hey|yo|good\s+morning|good\s+afternoon|good\s+evening)(?:\s+there)?[!.]*$/i;

const CATEGORY_KEYWORDS = [
  "electronics",
  "jewelery",
  "men's clothing",
  "women's clothing",
  "footwear",
  "fashion",
  "wearables",
  "accessories",
  "sneakers",
  "shoe",
  "shoes",
  "headphones",
  "watch",
  "hoodie",
  "backpack"
];

const BRAND_KEYWORDS = [
  "nike",
  "adidas",
  "puma",
  "reebok",
  "urban trek",
  "quantum",
  "echo",
  "nova",
  "aero",
  "pulse",
  "vortex",
  "titan",
  "orbit",
  "lumen",
  "arctic",
  "metro",
  "cloudweave",
  "flux",
  "horizon",
  "zen",
  "summit",
  "breeze",
  "nest",
  "prime",
  "helix",
  "nimbus",
  "spark",
  "vertex",
  "apex",
  "stride",
  "comet"
];

const CATEGORY_ALIAS_MAP = {
  sneakers: "footwear",
  shoes: "footwear",
  shoe: "footwear",
  watch: "wearables",
  headphones: "electronics",
  hoodie: "fashion",
  backpack: "accessories"
};

const BRAND_LABEL_MAP = {
  "urban trek": "Urban Trek"
};

const SEARCH_VERBS = ["show", "search", "find", "only show", "look for"];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractNumber = (text, regex) => {
  const match = text.match(regex);
  return match ? Number(match[1]) : null;
};

const extractAddIndex = (text) => {
  const ordinalWord = Object.keys(ORDINAL_MAP).find((key) => text.includes(key));
  if (ordinalWord) {
    return ORDINAL_MAP[ordinalWord] - 1;
  }

  const numberedMatch = text.match(
    /\b(?:item|product|result|option)?\s*(?:number|no\.?|#)\s*(\d+)\b/i
  );

  if (numberedMatch) {
    return Number(numberedMatch[1]) - 1;
  }

  return null;
};

const stripWakePhrase = (text) => text.replace(WAKE_WORD_REGEX, " ").replace(/\s+/g, " ").trim();

const toBrandLabel = (brand) =>
  BRAND_LABEL_MAP[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);

const extractBrand = (text) => {
  const brand = BRAND_KEYWORDS.find((candidate) =>
    new RegExp(`\\b${escapeRegExp(candidate)}\\b`, "i").test(text)
  );

  return brand ? toBrandLabel(brand) : "";
};

const extractCategoryKeyword = (text) =>
  CATEGORY_KEYWORDS.find((candidate) => new RegExp(`\\b${escapeRegExp(candidate)}\\b`, "i").test(text));

const parseSearchIntent = (text) => {
  const maxPrice = extractNumber(
    text,
    /(?:under|below|less than|up to|upto|max|maximum)\s*(?:rs\.?|₹|inr|rupees)?\s*(\d+)/
  );
  const minRating = extractNumber(text, /(\d(?:\.\d)?)\s*star/);
  const categoryKeyword = extractCategoryKeyword(text);
  const category = categoryKeyword ? CATEGORY_ALIAS_MAP[categoryKeyword] || categoryKeyword : "";
  const brand = extractBrand(text);
  const sort =
    text.includes("top rated") || text.includes("highest rated")
      ? "rating_desc"
      : text.includes("cheapest") || text.includes("low to high")
        ? "price_asc"
        : text.includes("expensive") || text.includes("high to low")
          ? "price_desc"
          : "";

  let query = text
    .replace(
      /show|search|find|look for|me|only|products|product|items|item|under|below|less than|up to|upto|max|maximum|top|highest|cheapest|expensive|low to high|high to low|star|rated|with|rupees|inr|rs|of|brand|company|from|by/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  if (categoryKeyword) {
    query = query.replace(new RegExp(`\\b${escapeRegExp(categoryKeyword)}\\b`, "gi"), " ");
  }

  if (brand) {
    query = query.replace(new RegExp(`\\b${escapeRegExp(brand.toLowerCase())}\\b`, "gi"), " ");
  }

  if (maxPrice !== null) {
    query = query.replace(new RegExp(`\\b${maxPrice}\\b`, "g"), " ");
  }

  if (minRating !== null) {
    query = query.replace(new RegExp(`\\b${minRating}\\b`, "g"), " ");
  }

  query = query.replace(/\s+/g, " ").trim();

  return {
    type: "SEARCH",
    query,
    category,
    brand,
    maxPrice,
    minRating,
    sort
  };
};

const hasSearchSignals = (text) =>
  SEARCH_VERBS.some((verb) => text.includes(verb)) ||
  Boolean(extractBrand(text)) ||
  Boolean(extractCategoryKeyword(text)) ||
  /(?:under|below|less than|up to|upto|max|maximum)\s*(?:rs\.?|₹|inr|rupees)?\s*\d+/i.test(text) ||
  /\d(?:\.\d)?\s*star/i.test(text);

export const detectIntent = (rawText) => {
  const text = rawText.toLowerCase().trim();

  if (!text) {
    return { type: "UNKNOWN" };
  }

  if (WAKE_WORD_REGEX.test(text)) {
    const remainingCommand = stripWakePhrase(text);
    if (remainingCommand) {
      return {
        ...detectIntent(remainingCommand),
        wake: true
      };
    }

    return { type: "WAKE_MIC" };
  }

  if (GREETING_REGEX.test(text)) {
    return { type: "GREETING" };
  }

  if (
    text.includes("buy now") ||
    text.includes("checkout") ||
    text.includes("place order") ||
    text.includes("prepare checkout")
  ) {
    return { type: "CHECKOUT" };
  }

  if (
    text.includes("trending") ||
    text.includes("popular") ||
    text.includes("recommend") ||
    text.includes("suggest")
  ) {
    return { type: "TRENDING" };
  }

  if (text.includes("similar")) {
    return { type: "SIMILAR" };
  }

  if (text.startsWith("remove") || text.includes("remove from cart") || text.includes("delete")) {
    const itemName = text.replace(/remove|from cart|delete/g, "").trim();
    return { type: "REMOVE", itemName };
  }

  if (text.startsWith("add") || text.includes("add to cart") || text.includes("queue")) {
    const index = extractAddIndex(text);
    const itemName = text
      .replace(/\badd\b|\bto cart\b|\bqueue\b|\bwith ai\b/gi, " ")
      .replace(/\b(?:item|product|result|option)?\s*(?:number|no\.?|#)\s*\d+\b/gi, " ")
      .replace(/\b(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { type: "ADD", index, itemName };
  }

  if (hasSearchSignals(text)) {
    return parseSearchIntent(text);
  }

  if (text.includes("help") || text.includes("what can you do")) {
    return { type: "HELP" };
  }

  return {
    type: "SEARCH",
    query: text,
    category: "",
    brand: "",
    maxPrice: null,
    minRating: null,
    sort: ""
  };
};
