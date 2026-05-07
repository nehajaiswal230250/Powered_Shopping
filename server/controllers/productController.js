import { getProducts, filterProducts } from "../services/productService.js";
import {
  getTrendingProducts,
  getSimilarProducts
} from "../services/recommendationService.js";

export const listProducts = async (req, res) => {
  try {
    const products = await getProducts();
    const result = filterProducts(products, req.query);
    res.json({
      success: true,
      count: result.length,
      items: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch products." });
  }
};

export const listCategories = async (_req, res) => {
  try {
    const products = await getProducts();
    const categories = [...new Set(products.map((p) => p.category))];
    res.json({ success: true, items: categories });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch categories." });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const products = await getProducts();
    const { type = "trending", category, excludeId } = req.query;

    const items =
      type === "similar"
        ? getSimilarProducts(products, category, Number(excludeId) || null)
        : getTrendingProducts(products);

    res.json({ success: true, type, items });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch recommendations." });
  }
};
