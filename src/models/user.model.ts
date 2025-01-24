import { RowDataPacket, ResultSetHeader, FieldPacket } from "mysql2/promise";
import pool from "../config/dbConfig";
import { UserData, UserCreationResponse } from "../interfaces";
import { logger } from "../logger";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Search user
export const searchUser = async (searchParams: string, value: string): Promise<UserCreationResponse> => {
  const connection = await pool.getConnection();

  try {
    const selectQuery = `SELECT id, username, email, password FROM users WHERE ${searchParams} = ?`;
    const [selectRows] = await connection.query<RowDataPacket[]>(selectQuery, [value]);

    if (selectRows.length === 0) {
      logger.info(`User not found with ${searchParams}: ${value}`);
      return {
        isSuccess: false,
        status: "not_found",
        message: "User not found",
      };
    }

    const user = selectRows[0];
    logger.info(`User found with ${searchParams}: ${value}`);

    return {
      isSuccess: true,
      status: "found",
      message: "User Found",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
      },
    };
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred during user search";

    if (err instanceof Error) errorMessage = err.message;

    logger.error("Error searching for user", { error: err, searchParams, value });

    return {
      isSuccess: false,
      status: "error",
      message: errorMessage,
    };
  }
};

// Create new User
export const createNewUser = async (data: UserData): Promise<UserCreationResponse> => {
  const { username, email, password } = data;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // check if user already exists
    const selectQuery = "SELECT username, email FROM users WHERE username = ? OR email = ?";
    const selectValues = [username, email];
    const [selectRows] = await connection.query<RowDataPacket[]>(selectQuery, selectValues);

    if (selectRows.length > 0) {
      await connection.rollback();
      logger.info("Username or email already exists");
      return { isSuccess: false, status: "conflict", message: "Username or email already exists", data: { username, email } };
    }

    // create new user
    const insertQuery = "INSERT INTO users(username, email, password) VALUES (?, ?, ?)";
    const insertValues = [username, email, password];
    const [insertResults]: [ResultSetHeader, FieldPacket[]] = await connection.execute(insertQuery, insertValues);

    await connection.commit();

    logger.info("User created successfully");

    return {
      isSuccess: true,
      status: "created",
      message: "User created successfully",
      data: { id: insertResults.insertId, username, email },
    };
  } catch (err: unknown) {
    await connection.rollback();

    let errorMessage: string = "An unexpected error occured";

    if (err instanceof Error) errorMessage = err.message;

    logger.error("Error creating new user");

    return {
      isSuccess: false,
      status: "error",
      message: errorMessage,
    };
  } finally {
    connection.release();
  }
};

// Log in user
export const loginUser = async (username: string, password: string): Promise<UserCreationResponse> => {
  try {
    // Search for user by username
    const searchResult = await searchUser("username", username);

    if (!searchResult.isSuccess) {
      logger.warn("Login attempt failed: user not found");
      return {
        isSuccess: false,
        status: "not_found",
        message: "Invalid username or password",
      };
    }

    const user = searchResult.data!;

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password!);

    if (!isPasswordValid) {
      logger.warn("Login attempt failed: Invalid password");
      return {
        isSuccess: false,
        status: "unauthorized",
        message: "Invalid username or password",
      };
    }

    // Generate JWT token
    const { JWT_SECRET } = process.env;
    let token;
    if (JWT_SECRET) {
      token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
    } else {
      logger.error("Environment Variable JWT_SECRET is not configured");
      return {
        isSuccess: false,
        status: "error",
        message: "Environment variable JWT_SECRET is not configured",
      };
    }

    logger.info("User logged in successfully", { userId: user.id });

    return {
      isSuccess: true,
      status: "success",
      message: "Login successfully",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        token: token,
      },
    };
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred during login";
    if (err instanceof Error) errorMessage = err.message;
    logger.error("Error during user login");
    return { isSuccess: false, status: "error", message: errorMessage };
  }
};
