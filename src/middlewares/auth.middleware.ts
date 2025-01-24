import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { logger } from "../logger";
import { getCachedSalt } from "../utils/saltCache";
import { sendErrorResponse } from "../utils/responseHandler";
import bcrypt from "bcrypt";

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
