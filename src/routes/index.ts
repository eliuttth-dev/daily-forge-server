import express from "express";
import { registerLimiter } from "../utils/rateLimiter";
import { registerHandler } from "../handlers/auth.handler";
import { registerMiddleware, validateRegistration } from "../middlewares/auth.middleware";

const router = express.Router();

// Auth Routes
router.post("/api/v1/register", validateRegistration, registerLimiter, registerMiddleware, registerHandler);

export default router;
