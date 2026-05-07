import { Router } from "express";
import { chatWithAssistant, transcribeVoice } from "../controllers/aiController.js";

const router = Router();

router.post("/chat", chatWithAssistant);
router.post("/transcribe", transcribeVoice);

export default router;
