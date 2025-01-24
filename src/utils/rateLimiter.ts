import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { logger } from "../logger";

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many registration attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Rate limit exceeded", { ip: req.ip });
    res.status(429).json({ message: "Too many registration attempts from this IP, please try again after 15 minutes" });
  },
});
