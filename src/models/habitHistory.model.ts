import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "../config/dbConfig";
import { logger } from "../logger";
import { HabitHistory } from "../interfaces";

/**
 *  Logs a habit action (completion or undo)
 *
 * @param {number} habitId - The ID of the habit being logged
 * @param {number} userID - The ID of the user performing the action
 * @param {"COMPLETED" | "UNDONE"} action - The action performed on the habit
 * @returns {Promise<boolean>} - Wheather the log was successfully inserted
 */
export const logHabitAction = async (habitId: number, userID: number, action: "COMPLETED" | "UNDONE"): Promise<boolean> => {
  if (!habitId || !userID || !action) {
    logger.warn("Missing required fields in logHabitAction", { habitId, userID, action });
    return false;
  }

  let connection;

  try {
    connection = await pool.getConnection();
    logger.info("Database connection acquired for loggin habit action");

    await connection.beginTransaction();
    logger.info("Transaction started for logging habit action");

    const logQuery = "INSERT INTO habit_history (habit_id, user_id, action) VALUES (?, ?, ?)";
    const logValues = [habitId, userID, action];
    const [result] = await connection.execute<ResultSetHeader>(logQuery, logValues);

    if (!result.insertId) {
      logger.error("Failed to insert habit log: no insertId returned");
      throw new Error("Failed to insert habit history log");
    }

    await connection.commit();
    logger.info("Habit action logged successfully", { habitId, userID, action });

    return true;
  } catch (err: unknown) {
    if (connection) {
      await connection.rollback();
      logger.warn("Transaction rolled  back for logHabitAction", {
        habitId,
        userID,
        action,
        err: err instanceof Error ? err.message : err,
      });
    }

    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    logger.error("Error loging habit action", { error: errorMessage, habitId, userID, action });

    return false;
  } finally {
    if (connection) {
      connection.release();
      logger.info("Database connection released for logHabitAction");
    }
  }
};

/**
 *  Retrieves the habit history for a user
 *
 *  @param {number} userID - The ID of the user
 *  @returns {Promise<HabitHistory[]>} - List of habit history entries
 */
export const getHabitHistory = async (userID: number): Promise<HabitHistory[]> => {
  let connection;

  try {
    connection = await pool.getConnection();
    logger.info("Database connection acquired for retrieving habit history");

    const query = "SELECT * FROM habit_history WHERE user_id = ? ORDER BY timestamp DESC";
    const [rows] = await connection.execute<RowDataPacket[]>(query, [userID]);

    logger.info("Habit history retrieved successfully", { userID, count: (rows as HabitHistory[]).length });

    return rows as HabitHistory[];
  } catch (err: unknown) {
    logger.error("Error retrieving habit history", { userID, error: err instanceof Error ? err.message : err });
    return [];
  } finally {
    if (connection) {
      connection.release();
      logger.info("Database connection released for retrieving habit history");
    }
  }
};
