import { Request, Response } from "express";
import { getHabitHistory } from "../models/habitHistory.model";
import { sendSuccessResponse, sendErrorResponse } from "../utils/responseHandler";
import { logger } from "../logger";

/**
 *  Retrieves the habit history for the authenticated user
 *
 */
export const getHabitHistoryHandler = async (req: Request, res: Response): Promise<void> => {
  const userID = (req as any).user?.id;

  try {
    if (!userID) throw new Error("Unauthorized");

    logger.info("Fetching habit history for user", { userID });

    const history = await getHabitHistory(userID);

    logger.info("Habit history retrieved", { userID, count: history.length });

    sendSuccessResponse(res, { history });
    return;
  } catch (err: unknown) {
    logger.error("Failed to fetch habit history", { userID, error: err instanceof Error ? err.message : err });
    sendErrorResponse(res, 500, "Failed to fetch habit history");
  }
};
