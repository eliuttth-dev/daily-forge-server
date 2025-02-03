import { ResultSetHeader } from "mysql2/promise";
import pool from "../config/dbConfig";
import { HabitData, HabitCreationResponse } from "../interfaces";

export const createNewHabit = async (data: HabitData): Promise<HabitCreationResponse> => {
  const { userID, name, description, schedule, category, reminders, streakTracking, autoComplete } = data;

  // Validate required fields
  if (!userID || !name || !category)
    return {
      isSuccess: false,
      status: "error",
      message: "Missing required fields: userID, name, or category.",
    };

  let connection = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

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
    if (!habitResult.insertId) throw new Error("Failed to insert habit.");

    const habitId: number = habitResult.insertId;

    // Insert Schedule if provided
    if (schedule) {
      if (!["daily", "weekly", "custom"].includes(schedule.type) || schedule.timesPerDay <= 0) throw new Error("Invalid schedule data.");

      const scheduleQuery = "INSERT INTO schedules (habit_id, type, times_per_day) VALUES (?, ?, ?)";

      await connection.execute(scheduleQuery, [habitId, schedule.type, schedule.timesPerDay]);
    }

    // Securely Insert Reminders if provided
    if (reminders && reminders.length > 0) {
      const validReminders = reminders.filter((time) => /^\d{2}:\d{2}$/.test(time)); // Valid HH:MM format

      if (validReminders.length !== reminders.length) throw new Error("Invalid reminder format. Expected HH:MM.");

      const reminderQuery = `
        INSERT INTO reminders (habit_id, reminder_time)
        VALUES ${validReminders.map(() => "(?, ?)").join(", ")}
      `;
      const reminderValues: (number | string)[] = validReminders.flatMap((time) => [habitId, time]);

      await connection.execute(reminderQuery, reminderValues);
    }

    await connection.commit();

    return {
      isSuccess: true,
      status: "created",
      message: `New habit "${name}" created successfully.`,
      habit: { ...data, ID: habitId.toString() },
    };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("Error creating habit:", errorMessage);

    return {
      isSuccess: false,
      status: "error",
      message: errorMessage,
    };
  } finally {
    if (connection) connection.release();
  }
};
