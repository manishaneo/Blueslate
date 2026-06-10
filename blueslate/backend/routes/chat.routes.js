import { Router } from "express";
import { handleChat } from "../controllers/chat.controller.js";
import { handleChatTest } from "../controllers/chatTest.controller.js";

const router = Router();

router.post("/", handleChat);
router.post("/test", handleChatTest);

export default router;
