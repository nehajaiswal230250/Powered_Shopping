import { runAiAssistant, transcribeAudio } from "../services/aiAssistantService.js";

const resolveCartId = (req) =>
  req.headers["x-cart-id"] ||
  req.query.cartId ||
  req.body?.cartId ||
  process.env.DEFAULT_CART_ID ||
  "default";

export const chatWithAssistant = async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: "message is required." });
    }

    const result = await runAiAssistant({
      message,
      history,
      cartId: resolveCartId(req)
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "AI assistant failed."
    });
  }
};

export const transcribeVoice = async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ success: false, message: "audioBase64 is required." });
    }

    const result = await transcribeAudio({ audioBase64, mimeType });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Transcription failed."
    });
  }
};
