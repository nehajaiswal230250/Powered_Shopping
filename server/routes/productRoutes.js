import { Router } from "express";
import {
  listProducts,
  listCategories,
  getRecommendations
} from "../controllers/productController.js";

const router = Router();

router.get("/", listProducts);
router.get("/categories", listCategories);
router.get("/recommendations", getRecommendations);

export default router;
