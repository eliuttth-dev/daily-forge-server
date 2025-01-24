import { RowDataPacket, ResultSetHeader, FieldPacket } from "mysql2/promise";
import pool from "../config/dbConfig";
import { UserData, UserCreationResponse } from "../interfaces";
import { logger } from "../logger";

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
