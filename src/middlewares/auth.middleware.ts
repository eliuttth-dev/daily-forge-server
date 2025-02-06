import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { logger } from "../logger";
import { sendErrorResponse } from "../utils/responseHandler";
import jwt from "jsonwebtoken";

const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
  logger.error("JWT_SECRET is not defined in environment variables");
  throw new Error("JWT_SECRET is missing. Set it in the environment variables");
}

/**
 *  Ensures that username, email, and password meet required format constaints
 */
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

/**
 *  Validate request registration data
 *
 *  @param {Request} req - Express request object containing registration data
 *  @param {Response} res - Express response object for sending responses
 *  @param {NextFunction} next - Express next function to pass control to the next middleware
 */
export const registerMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Registration attempt with invalid data", { errors: errors.array() });
      sendErrorResponse(res, 400, "Invalid registration data", errors.array());
    }

    const { username, email } = req.body;
    logger.info("Registration attempt successful", { username, email });

    next();
  } catch (err: unknown) {
    let errorMessage = "Internal Server error";

    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Error in registration middleware", { error: errorMessage });
    }
    sendErrorResponse(res, 500, "Internal Server Error");
    return;
  }
};

/**
 *  Ensures that both identifier (username or email) and password are provided
 */
export const validateLogin = [
  body("identifier").trim().notEmpty().withMessage("Identifier is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

/**
 *  Validates request login data and passes control to the next middleware
 *
 *  @param {Request} req - Express requrest object containing login credentials
 *  @param {Response} res - Express response object for sending response
 *  @param {NextFunction} next - Express next function to pass control to the next middleware
 */
export const loginMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn("Login attempt with invalid data", { errors: errors.array() });
    sendErrorResponse(res, 400, "Invalid login data", errors.array());
  }

  next();
};

/**
 *  If the token is missing or invalid, access is denied.
 *
 *  @param {Request} req - Express request object containing headers with authentication token
 *  @param {Response} res - Express response object for sending responses
 *  @param {NextFunction} next - Express next function to pass control to the next middleware
 *
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Access denied: No token provided or token format is invalid!");
    sendErrorResponse(res, 401, "Access denied: No token provided or token format is invalid");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, JWT_SECRET!, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        logger.warn("Access denied: Expired token");
        sendErrorResponse(res, 403, "Access denied: Expired Token");
      }
      if (err.name === "JsonWebTokenError") {
        logger.warn("Access denied: Malformed or Invalid token");
        sendErrorResponse(res, 403, "Access denied: Invalid Token");
      }

      logger.warn("Access denied: Authentication failed", { error: err.message });
      sendErrorResponse(res, 403, "Access denied: Authentication failed");
    }

    (req as any).user = decoded;
    next();
  });
};
