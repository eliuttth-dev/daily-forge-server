import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { logger } from "../logger";
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

export const registerMiddleware = async (req: Request, res: Response, next: NextFunction): void => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Registration attempt with invalid data", { errors: errors.array() });
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { username, email, password } = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    req.body.password = hashedPassword;

    logger.info("Registration attempt successful", { username, email });

    next();
  } catch (err: unknown) {
    logger.error("Error in registration middleware", { err });
    res.status(500).json({ message: "Internal server error" });
  }
};
