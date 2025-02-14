import { Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import { logger } from "../logger";
import { sendErrorResponse } from "../utils/responseHandler";

/**
 *  Middleware to validate habit creation data
 *  Ensures required fields are provided and properly formatted
 */
export const validateHabit = [
  body("userID").trim().notEmpty().withMessage("User ID is required").isString().withMessage("User ID must be a string"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Habit name is required")
    .isLength({ max: 100 })
    .withMessage("Habit name cannot exceed 100 characters"),
  body("category").trim().notEmpty().withMessage("Categody is required").isString().withMessage("Category must be a string"),
  body("description").optional().isString().withMessage("Description must be a string"),
  body("streakTracking").isBoolean().withMessage("Streak tracking must be a bolean"),
  body("autoComplete").isBoolean().withMessage("Auto-complete must be a boolean"),
  body("schedule")
    .optional()
    .isObject()
    .withMessage("Schedule must be an object")
    .custom((schedule) => {
      if (!["daily", "weekly", "custom"].includes(schedule.type)) throw new Error("Schedule type must be one of: daily, weekly, custom");
      if (typeof schedule.timesPerDay !== "number" || schedule.timesPerDay <= 0)
        throw new Error("Schedule timesPerDay must be a positive number");
      return true;
    }),
  body("reminders")
    .optional()
    .isArray()
    .withMessage("Reminders must be an array of time strings in HH:MM format")
    .custom((reminders) => {
      if (!reminders.every((time: string) => /^\d{2}:\d{2}$/.test(time))) throw new Error("Each reminder must be in HH:MM format");
      return true;
    }),
];

/**
 *  @param {Request} req - Express request object containing habit data
 *  @param {Response} res - Express response object for sending responses
 *  @param {NextFunction} next - Express next function to pass control to the next middleware
 */
export const habitMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userID, name } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Habit creation attempt with invalid data", { error: errors.array() });
      sendErrorResponse(res, 400, "Invalid habit data");
      return;
    }

    logger.info("Habit creation request validated successfully", { userID, name });
    next();
  } catch (err: unknown) {
    let errorMessage = "Internal Server Error";
    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Error in habit creation middleware", { error: errorMessage });
    }

    sendErrorResponse(res, 500, "Internal Server Error");
    return;
  }
};

/**
 *  Middleware to validate habit completation data before passing to the handler
 */
export const validateHabitCompletion = [
  param("habitId").isInt({ min: 1 }).withMessage("Habit ID must be a positive integer"),
  body("progress").optional().isInt({ min: 1 }).withMessage("Progress must be a positive integer"),
  body("completionTarget").optional().isInt({ min: 1 }).withMessage("Completion target must be a positive integer"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

/**
 *  Middleware to validate request data before marking a habit as completed
 *
 *  @param {Request} req - Express request object containing habit completion data
 *  @param {Response} res - Express response object for sending responses
 *  @param {NextFunction} next - Express next function to pass control to the next middleware
 */
export const markHabitAsCompleteMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      logger.warn("Habit completion attempt with invalid data", { errors: errors.array() });
      sendErrorResponse(res, 400, "Invalid habit completion data");
      return;
    }

    // Ensure "completionTarget" is set to 1 if not provided
    req.body.completionTarget = req.body.completionTarget ? parseInt(req.body.completionTarget, 10) : 1;

    logger.info("Habit completion request validated successfully", {
      habitId: req.params.habitId,
      userID: (req as any).user?.id,
      progress: req.body.progress || 1,
      completionTarget: req.body.completionTarget,
      notes: req.body.notes || null,
    });

    next();
  } catch (err: unknown) {
    let errorMessage = "Internal Server Error";
    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Error in habit completion middleware", { error: errorMessage });
    }
    sendErrorResponse(res, 500, "Internal Server Error");
    return;
  }
};

/**
 *  Middleware to validate undo habit completion request
 */
export const validateUndoHabitCompletion = [param("habitId").isInt({ min: 1 }).withMessage("Habit ID must be a positive integer")];

/**
 *  Middleware to handle validation results
 */
export const undoHabitCompletionMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn("Invalid undo habit request", { errors: errors.array() });
    sendErrorResponse(res, 400, "Invalid habit ID");
    return;
  }

  logger.info("Undo habit request validated successfully", { habitId: req.params.habitId, userID: (req as any).user?.id });
  next();
};
