import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { logger } from "../logger";
import { getCachedSalt } from "../utils/saltCache";
import { sendErrorResponse } from "../utils/responseHandler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const validateRegistration = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .matches(/^[a-zA-Z0-9_!@#$%^&*()+=\-.]+$/)
    .withMessage("Invalid username format"),
  body("email").trim().isEmail().normalizeEmail().withMessage("Invalid email format"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])(?!.*\s).{8,}$/)
    .withMessage("Password must include at least one uppercase letter, one lowercase letter, one number, and one special character"),
];

export const validateLogin = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const registerMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Registration attempt with invalid data", { errors: errors.array() });
      sendErrorResponse(res, 400, "Invalid input data");
      return;
    }

    const { username = "", email = "", password = "" } = req.body;
    const { SALT_ROUND } = process.env;

    if (!username || !email || !password) {
      logger.warn("Missing required fields in registration attempt");
      sendErrorResponse(res, 400, "Missing required fields");
      return;
    }

    // Hash password
    try {
      const salt = await getCachedSalt(SALT_ROUND ? Number.parseInt(SALT_ROUND) : 10);
      const hashedPassword = await bcrypt.hash(password, salt);

      req.body.password = hashedPassword;

      logger.info("Registration attempt successful");

      next();
    } catch (bcryptError: unknown) {
      if (bcryptError instanceof Error) {
        logger.error("Bcrypt error during password hashing", { error: bcryptError });
        sendErrorResponse(res, 500, "Error in password processing, please try again");
        return;
      } else {
        throw bcryptError;
      }
    }
  } catch (err: unknown) {
    logger.error("Error in registration middleware", { err });
    if (err instanceof Error) {
      sendErrorResponse(res, 500, "Internal Server Error");
      return;
    } else {
      sendErrorResponse(res, 500, "An unexpected error occurred");
      return;
    }
  }
};

export const loginMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      logger.warn("Login attempt with invalid data", { errors: errors.array() });
      sendErrorResponse(res, 400, "Invalid input data");
      return;
    }

    const { username = "", password = "" } = req.body;

    if (!username || !password) {
      logger.warn("Missing required fields in login attempt");
      sendErrorResponse(res, 400, "Missing required fields");
      return;
    }

    logger.info("Login attempt validated");
    next();
  } catch (err: unknown) {
    logger.error("Error in login middleware", { err });

    if (err instanceof Error) {
      sendErrorResponse(res, 500, "Internal Server Error");
      return;
    } else {
      sendErrorResponse(res, 500, "An unexpected error occurred");
      return;
    }
  }
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    logger.warn("Missing authentication token");
    sendErrorResponse(res, 401, "Authentication required");
    return;
  }

  const { JWT_SECRET } = process.env;

  if (!JWT_SECRET) {
    logger.error("Environment variable JWT_SECRET is not configured");
    sendErrorResponse(res, 500, "Environment variable JWT_SECRET is not configured");
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: unknown) => {
    if (err) {
      logger.warn("Invalid authentication token", { error: err });
      sendErrorResponse(res, 403, "Invalid or expired token");
      return;
    }

    next();
  });
};
