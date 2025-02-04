import pool from "../../../src/config/dbConfig";
import { createNewHabit } from "../../../src/models/habit.model";
import { HabitData, HabitCreationResponse } from "../../../src/interfaces";

jest.mock("../../../src/config/dbConfig", () => {
  const mockConnection = {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    execute: jest.fn(),
    release: jest.fn(),
  };

  return {
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    end: jest.fn().mockResolvedValue(undefined),
  };
});

describe("Create New Habit", () => {
  const validHabitData: HabitData = {
    userID: "user123",
    name: "Daily Running",
    description: "Run 5km daily",
    category: "Fitness",
    schedule: { type: "daily", timesPerDay: 1 },
    reminders: ["08:00", "18:00"],
    streakTracking: true,
    autoComplete: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      await pool.end();
    } catch (err: unknown) {
      console.error("Error while cleanup:", err);
    }
  });

  it("Should return error if required fields are missing", async () => {
    const invalidHabitData: HabitData = {
      userID: "",
      name: "",
      category: "",
      streakTracking: false,
      autoComplete: false,
    };

    const result: HabitCreationResponse = await createNewHabit(invalidHabitData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Missing required fields: userID, name, or category.");
  });

  it("Should create new habit successfully without schedule and reminders", async () => {
    const habitData = { ...validHabitData };
    delete habitData.schedule;
    delete habitData.reminders;

    const mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockResolvedValueOnce([{ insertId: 1 }, undefined]),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: HabitCreationResponse = await createNewHabit(habitData);

    expect(result.isSuccess).toBe(true);
    expect(result.status).toBe("created");
    expect(result.message).toContain(`New habit "${habitData.name}" created successfully`);
    expect(result.habit).toEqual(habitData);
    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should create a new habit successfully with valid schedule and reminders", async () => {
    const mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      execute: jest
        .fn()
        .mockResolvedValueOnce([{ insertId: 2 }, undefined])
        .mockResolvedValueOnce([{}, undefined])
        .mockResolvedValueOnce([{}, undefined]),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: HabitCreationResponse = await createNewHabit(validHabitData);

    expect(result.isSuccess).toBe(true);
    expect(result.status).toBe("created");
    expect(result.message).toContain(`New habit "${validHabitData.name}" created successfully`);
    expect(result.habit).toEqual(validHabitData);
    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if habit insertion fails (no insertId)", async () => {
    const mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn(),
      rollback: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockResolvedValueOnce([{}, undefined]),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: HabitCreationResponse = await createNewHabit(validHabitData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Failed to insert habit.");
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if schedule data is invalid", async () => {
    const habitData = { ...validHabitData, schedule: { type: "monthly", timesPerDay: 0 } };

    const mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn(),
      rollback: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockResolvedValue([{ insertId: 3 }, undefined]),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: HabitCreationResponse = await createNewHabit(habitData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Invalid schedule data.");
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if reminders contain invalid format", async () => {
    const habitData = { ...validHabitData, reminders: ["08:00", "aa:bb", "sdsd", ""] };
    const mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn(),
      rollback: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockResolvedValueOnce([{ insertId: 4 }, undefined]),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: HabitCreationResponse = await createNewHabit(habitData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Invalid reminder format. Expected HH:MM.");
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if schedule insertion fails", async () => {
    const habitData = { ...validHabitData };
    const scheduleError = new Error("Schedule insertion failed");
    const mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn(),
      rollback: jest.fn().mockResolvedValue(undefined),
      execute: jest
        .fn()
        .mockResolvedValueOnce([{ insertId: 5 }, undefined])
        .mockRejectedValueOnce(scheduleError),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: HabitCreationResponse = await createNewHabit(habitData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Schedule insertion failed");
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if getConnection fails", async () => {
    const connectionError = new Error("Connection failure");
    (pool.getConnection as jest.Mock).mockRejectedValueOnce(connectionError);

    const result: HabitCreationResponse = await createNewHabit(validHabitData);
    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Connection failure");
  });
});
