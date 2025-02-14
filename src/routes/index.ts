import express from "express";
import { registerHandler, loginHandler } from "../handlers/auth.handler";
import { createHabitHandler, markHabitAsCompleteHandler, undoHabitCompletionHandler } from "../handlers/habit.handler";
import {
  validateRegistration,
  registerMiddleware,
  validateLogin,
  loginMiddleware,
  authenticateToken,
} from "../middlewares/auth.middleware";
import {
  validateHabit,
  habitMiddleware,
  validateHabitCompletion,
  markHabitAsCompleteMiddleware,
  validateUndoHabitCompletion,
  undoHabitCompletionMiddleware,
} from "../middlewares/habit.middleware";
import { registerLimiter, loginLimiter } from "../utils/rateLimiter";

const router = express.Router();

// Auth Routes
router.post("/api/v1/register", registerLimiter, validateRegistration, registerMiddleware, registerHandler);
router.post("/api/v1/login", loginLimiter, validateLogin, loginMiddleware, loginHandler);

// Habit Routes (Protected)
router.post("/api/v1/habits", authenticateToken, validateHabit, habitMiddleware, createHabitHandler);
router.post(
  "/api/v1/habits/:habitId/complete",
  authenticateToken,
  validateHabitCompletion,
  markHabitAsCompleteMiddleware,
  markHabitAsCompleteHandler,
);
router.delete(
  "/api/v1/habits/:habitId/undo",
  authenticateToken,
  validateUndoHabitCompletion,
  undoHabitCompletionMiddleware,
  undoHabitCompletionHandler,
);
export default router;
