import { Request, Response } from "express";
import { createNewHabit, markHabitAsCompleted } from "../models/habit.model";
import { logger } from "../logger";
import { sendErrorResponse, sendSuccessResponse } from "../utils/responseHandler";

/**
 *  Handler to create a new habit and associate it with a user
 *
 *  @param {Request} req - Express request object containing habit details
 *  @param {Response} res - Express response object used to send back to the response
 *
 *  @returns {Promise<void>} A promise that resolves once the response has been sent
 */
export const createHabitHandler = async (req: Request, res: Response): Promise<void> => {
  const { userID, name, description, schedule, category, reminders, streakTracking, autoComplete } = req.body;

  try {
    logger.info("Habit creation request received", { userID, name, category });

    // New Habit
    const habitData = await createNewHabit({
      userID,
      name,
      description,
      schedule,
      category,
      reminders,
      streakTracking,
      autoComplete,
    });

    if (habitData.isSuccess) {
      logger.info("Habit created successfully", { habit: habitData.habit });
      sendSuccessResponse(res, {
        message: `Habit "${name}" created successfully`,
        data: habitData.habit,
      });
      return;
    }

    logger.warn("Habit creation failed", { message: habitData.message });
    sendErrorResponse(res, 400, habitData.message);
    return;
  } catch (err: unknown) {
    let errorMessage = "Internal Server Error";
    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Unexpected error during habit creation", { error: errorMessage });
    }
    sendErrorResponse(res, 500, "Internal Server Error");
    return;
  }
};

/**
 *  Handler to mark a habit as completed for the current day
 *
 *  @param {Request} req - Express request object containing habit completion details
 *  @param {Response} res - Express response object used to send back the response
 *
 *  @returns {Promise<void>} A promise that resolves once the response has been sent
 */
export const markHabitAsCompleteHandler = async (req: Request, res: Response): Promise<void> => {
  const userID = (req as any).user?.id;
  const habitId = parseInt(req.params.habitId, 10);
  const { progress = 1, completionTarget, notes } = req.body;

  const target = Number(completionTarget);
  if (isNaN(target)) {
    logger.error("Invalid or missing completionTarget provided", { completionTarget });
    sendErrorResponse(res, 400, "Invalid completion target");
    return;
  }

  try {
    logger.info("Habit completion request received", { userID, habitId, progress, completionTarget: target, notes });

    const completionResult = await markHabitAsCompleted(habitId, userID, progress, target, notes);

    if (completionResult.isSuccess) {
      logger.info("Habit marked as completed", { habitId, userID, status: completionResult.status });
      sendSuccessResponse(res, { message: completionResult.message });
      return;
    }

    logger.warn("Habitcompletion failed", { habitId, userID, reason: completionResult.message });
    sendErrorResponse(res, 400, completionResult.message);
    return;
  } catch (err: unknown) {
    let errorMessage = "Internal Server Error";
    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Unexpected error during habit completion", { error: errorMessage });
    }
    sendErrorResponse(res, 500, "Internal Server Error");
    return;
  }
};
