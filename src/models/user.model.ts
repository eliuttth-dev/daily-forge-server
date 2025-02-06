import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "../config/dbConfig";
import { UserData, UserLoginData, UserCreationResponse, UserLoginResponse } from "../interfaces";
import { logger } from "../logger";
import bcrypt from "bcrypt";

interface UserRow extends RowDataPacket {
  username: string;
  email: string;
  password?: string;
}

/**
 *  Creates a new user in the database after checking for duplicate usernames/emails
 *
 *  @param {UserData} data - Object containing username, email, and password
 *  @returns {Promise<UserCreationResponse>} - Result of user creation
 */
export const createNewUser = async (data: UserData): Promise<UserCreationResponse> => {
  const { username, email, password } = data;
  let connection;

  try {
    if (!password) {
      logger.error("User creation failed: Password is missing");
      return {
        isSuccess: false,
        status: "error",
        message: "Password is required",
      };
    }

    connection = await pool.getConnection();

    // Normalize username and email
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const selectQuery = "SELECT username, email FROM users WHERE username = ? OR email = ?";
    const selectValues = [normalizedUsername, normalizedEmail];
    const [selectRows] = await connection.query<UserRow[]>(selectQuery, selectValues);

    // Only return a conflict if a matching username or email is found
    if (Array.isArray(selectRows) && selectRows.some((row) => row.username === username || row.email === email)) {
      logger.warn("User creation failed: Username or email already exists");
      return {
        isSuccess: false,
        status: "conflict",
        message: "Username or email already exists",
        data: { username, email },
      };
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password!, saltRounds);

    // Insert new user
    const insertQuery = "INSERT INTO users(username, email, password) VALUES (?, ?, ?)";
    const insertValues = [normalizedUsername, normalizedEmail, hashedPassword];
    const [insertResult] = await connection.execute<ResultSetHeader>(insertQuery, insertValues);

    // Check if insertion was successful based on affectedRows
    if (!insertResult || insertResult.affectedRows !== 1) {
      logger.error(`User creation failed: Database insertion issue`, { username });
      throw new Error("User creation failed");
    }

    logger.info("User created successfully", { username, email });

    return {
      isSuccess: true,
      status: "created",
      message: "User created successfully",
      data: { username, email },
    };
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred";
    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Error creating user:", errorMessage);
    }

    return {
      isSuccess: false,
      status: "error",
      message: errorMessage,
    };
  } finally {
    if (connection) connection.release();
  }
};

/**
 *  Logs in a user by checking credentials agains the database
 *
 * @param {UserLoginData} data - Object containing identifier (username or email) and password
 * @returns {Promise<UserLoginResponse>} - Result of login attempt
 */
export const logUser = async (data: UserLoginData): Promise<UserLoginResponse> => {
  const { identifier, password } = data;
  let connection;

  try {
    connection = await pool.getConnection();

    // Retrieve user data using username or email
    const selectQuery: string = "SELECT username, email, password FROM users WHERE username = ? OR email = ?";
    const selectValues: string[] = [identifier, identifier];
    const [rows] = await connection.query<UserRow[]>(selectQuery, selectValues);

    if (rows.length === 0) {
      logger.warn("Login attempt failed: user not found", { identifier });
      return {
        isSuccess: false,
        status: "not_found",
        message: "User not found",
      };
    }

    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password!);

    if (!isPasswordValid) {
      logger.warn("Login attempt failed: Incorrect username or password");
      return {
        isSuccess: false,
        status: "unauthorized",
        message: "Incorrect username or password",
      };
    }

    logger.info("User logged in successfully");

    return {
      isSuccess: true,
      status: "logged_in",
      message: "User logged in successfully",
      data: { username: user.username, email: user.email },
    };
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred";
    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Error during login identifier:", err.message);
    }
    return {
      isSuccess: false,
      status: "error",
      message: errorMessage,
    };
  } finally {
    if (connection) connection.release();
  }
};
