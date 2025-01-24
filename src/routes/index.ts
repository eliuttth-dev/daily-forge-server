import express from "express";
import { registerLimiter, loginLimiter } from "../utils/rateLimiter";
import { registerHandler, loginHandler } from "../handlers/auth.handler";
import { registerMiddleware, validateRegistration, loginMiddleware, validateLogin } from "../middlewares/auth.middleware";

const router = express.Router();

// Auth Routes
router.post("/api/auth/register", validateRegistration, registerLimiter, registerMiddleware, registerHandler);
router.post("/api/auth/login", validateLogin, loginLimiter, loginMiddleware, loginHandler);

export default router;
