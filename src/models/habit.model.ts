import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "../config/dbConfig";
import { HabitData, HabitCreationResponse } from "../interfaces";
import { logger } from "../logger";

/**
 * Creates a new habit and associates it with a user
 *
 * @param {HabitData} data - The habit data including user ID, name, category, schedule, reminders, etc
 * @returns {Promise<HabitCreationResponse>} - Result of the habit creation process.
 */
export const createNewHabit = async (data: HabitData): Promise<HabitCreationResponse> => {
  const { userID, name, description, schedule, category, reminders, streakTracking, autoComplete } = data;

  // Validate required fields
  if (!userID || !name || !category) {
    logger.warn("Missing required fields in createNewHabit, userID, name, or category are requried.");
    return {
      isSuccess: false,
      status: "error",
      message: "Missing required fields: userID, name, or category.",
    };
  }

  let connection;

  try {
    connection = await pool.getConnection();
    logger.info("Database connection acquired for creating habit.");

    await connection.beginTransaction();
    logger.info("Transaction started for creating habit");

    // Insert Habit
    const habitQuery =
      "INSERT INTO habits (user_id, name, description, category, streak_tracking, auto_complete) VALUES (?, ?, ?, ?, ?, ?)";
    const habitValues: [string, string, string | null, string, boolean, boolean] = [
      userID,
      name.trim(),
      description ?? null,
      category.trim(),
      streakTracking,
      autoComplete,
    ];

    const [habitResult] = await connection.execute<ResultSetHeader>(habitQuery, habitValues);

    if (!habitResult.insertId) {
      logger.error("Habit insertion failed: no insertId returned");
      throw new Error("Failed to insert habit.");
    }

    const habitId: number = habitResult.insertId;
    logger.info("Habit inserted successfully");

    // Insert Schedule if provided
    if (schedule) {
      if (!["daily", "weekly", "custom"].includes(schedule.type) || schedule.timesPerDay <= 0) {
        logger.error("Invalid schedule data provided", { schedule });
        throw new Error("Invalid schedule data.");
      }

      const scheduleQuery = "INSERT INTO schedules (habit_id, type, times_per_day) VALUES (?, ?, ?)";
      await connection.execute(scheduleQuery, [habitId, schedule.type, schedule.timesPerDay]);
      logger.info("Schedule inserted successfully");
    }

    // Securely Insert Reminders if provided
    if (reminders && reminders.length > 0) {
      const validReminders = reminders.filter((time) => /^\d{2}:\d{2}$/.test(time)); // Valid HH:MM format

      if (validReminders.length !== reminders.length) {
        logger.error("Invalid reminder format detected", { reminders, validReminders });
        throw new Error("Invalid reminder format. Expected HH:MM.");
      }

      const reminderQuery = `
        INSERT INTO reminders (habit_id, reminder_time)
        VALUES ${validReminders.map(() => "(?, ?)").join(", ")}
      `;
      const reminderValues: (number | string)[] = validReminders.flatMap((time) => [habitId, time]);
      await connection.execute(reminderQuery, reminderValues);
      logger.info("Reminders inserted successfully");
    }

    await connection.commit();
    logger.info("Transaction committed successfully for creating habit");

    return {
      isSuccess: true,
      status: "created",
      message: `New habit "${name}" created successfully.`,
      habit: { ...data },
    };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
        logger.warn("Transaction rolled back fro createNewHabit", { error: err instanceof Error ? err.message : err });
      } catch (rollbackError) {
        logger.error("Rollback failed in createNewHabit", { rollbackError });
      }
    }

    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    logger.error("Error creating new habit", { error: errorMessage, data });

    return {
      isSuccess: false,
      status: "error",
      message: errorMessage,
    };
  } finally {
    if (connection) {
      connection.release();
      logger.info("Database connection released for createNewHabit");
    }
  }
};

/**
 *  Marksa habit as completed for a specific day
 *
 * @param {number} habitId - The ID of the habit being marked as competed
 * @param {string} userID - The ID of the user marking the habit as completed
 * @param {number} progress - The progress increment (default to 1)
 * @param {string} [notes] - Optional notes for this habit completion
 * @returns {Promise<HabitCreationResponse>} - Completation Response
 */
export const markHabitAsCompleted = async (
  habitId: number,
  userID: string,
  progressIncrement: number = 1,
  completionTarget: number,
  notes?: string,
): Promise<HabitCreationResponse> => {
  let connection;

  try {
    connection = await pool.getConnection();
    logger.info("Database connection acquired for marking habits as completed", { habitId, userID });

    await connection.beginTransaction();
    logger.info("Transaction started for marking habit completion", { habitId, userID });

    // Ensure habit belongs to the user
    const habitSelect: string = "SELECT id FROM habits WHERE id = ? AND user_id = ?";
    const habitValues = [habitId, userID];
    const [habitRows] = await connection.query<RowDataPacket[]>(habitSelect, habitValues);

    if (habitRows.length === 0) {
      logger.warn("Habit not found or does not belong to user", { habitId, userID });
      return {
        isSuccess: false,
        status: "not_found",
        message: "Habit not found or not authorized",
      };
    }

    // Check if completion entry already exists for today
    const today = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD
    const existingSelect: string =
      "SELECT id, progress FROM habit_completions WHERE habit_id = ? and user_id = ? and DATE(completion_time) = ?";
    const existingValues = [habitId, userID, today];
    const [existingRows] = await connection.query<RowDataPacket[]>(existingSelect, existingValues);

    let newProgress = progressIncrement;
    let isCompleted = 0;

    if (existingRows.length > 0) {
      // Habit already completed today; update progress or add notes
      const completionId = existingRows[0].id;
      newProgress = existingRows[0].progress + progressIncrement;

      if (newProgress >= completionTarget) isCompleted = 1;
      logger.info("Updating habit completion", {
        habitId,
        userID,
        newProgress,
        isCompleted,
        notes,
      });

      const updateQuery = `
        UPDATE habit_completions
        SET progress = ?, is_completed = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await connection.execute(updateQuery, [newProgress, isCompleted, notes ?? null, completionId]);

      await connection.commit();
      logger.info("Habit completion updated successfully", { habitId, userID, newProgress, isCompleted, notes });

      return {
        isSuccess: true,
        status: "updated",
        message: `Habit progress updated to ${newProgress}, completed: ${isCompleted}`,
      };
    }

    // Insert new completion record with progress starting at `progressIncrement`
    if (progressIncrement >= completionTarget) {
      isCompleted = 1;
    }
    logger.info("Inserting new habit completion", {
      habitId,
      userID,
      newProgress,
      isCompleted,
      notes,
    });

    const insertQuery =
      "INSERT INTO habit_completions (habit_id, user_id, completion_time, progress, is_completed, notes) VALUES (?, ?, NOW(), ?, ?, ?)";
    const insertValues = [habitId, userID, newProgress, isCompleted, notes ?? null];

    const [completionResult] = await connection.execute<ResultSetHeader>(insertQuery, insertValues);

    if (!completionResult.insertId) {
      logger.error("Habit completion insertion failed", { habitId, userID });
      throw new Error("Failed to mark habit as completed");
    }

    await connection.commit();
    logger.info("Transaction committed successfully for habit completion", { habitId, userID, newProgress, isCompleted, notes });

    return {
      isSuccess: true,
      status: "completed",
      message: `Habit progress updated to ${newProgress}, completed: ${isCompleted}`,
    };
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred";
    if (connection) {
      try {
        if (err instanceof Error) {
          errorMessage = err.message;
          logger.warn("Transaction rolled back due to error in markHabitAsCompleted", { error: errorMessage });
        }
        await connection.rollback();
      } catch (rollbackError) {
        logger.error("Rollback failed in markHabitAsCompleted", { rollbackError });
      }
    }
    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Error marking habit as completed", { error: errorMessage, habitId, userID });
    }

    return {
      isSuccess: false,
      status: "error",
      message: errorMessage,
    };
  } finally {
    if (connection) {
      connection.release();
      logger.info("Database connection released for markHabitAsCompleted");
    }
  }
};
