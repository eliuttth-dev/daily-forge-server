import express from "express";
import { registerHandler, loginHandler } from "../handlers/auth.handler";
import {
  validateRegistration,
  registerMiddleware,
  validateLogin,
  loginMiddleware,
  authenticateToken,
} from "../middlewares/auth.middleware";
import { registerLimiter, loginLimiter } from "../utils/rateLimiter";

const router = express.Router();

// Auth Routes
router.post("/api/v1/register", registerLimiter, validateRegistration, registerMiddleware, registerHandler);
router.post("/api/v1/login", loginLimiter, validateLogin, loginMiddleware, loginHandler);
router.get("/api/v1/testToken", authenticateToken, (req, res) => {
  const userData = (req as any).user;
  res.status(200).json({ message: "Access Granted", user: userData });
});

export default router;
