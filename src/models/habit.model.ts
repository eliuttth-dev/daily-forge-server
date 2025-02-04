import { ResultSetHeader } from "mysql2/promise";
import pool from "../config/dbConfig";
import { HabitData, HabitCreationResponse } from "../interfaces";
import { logger } from "../logger";

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

  let connection = null;

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
      name,
      description ?? null,
      category,
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
