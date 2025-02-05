import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "../config/dbConfig";
import { UserData, UserCreationResponse } from "../interfaces";

interface UserRow extends RowDataPacket {
  username: string;
  email: string;
}

export const createNewUser = async (data: UserData): Promise<UserCreationResponse> => {
  const { username, email, password } = data;
  let connection;

  try {
    connection = await pool.getConnection();

    // Check if user already exists
    const selectQuery = "SELECT username, email FROM users WHERE username = ? OR email = ?";
    const selectValues = [username, email];
    const [selectRows] = await connection.query<UserRow[]>(selectQuery, selectValues);

    // Only return a conflict if a matching username or email is found
    if (Array.isArray(selectRows) && selectRows.some((row) => row.username === username || row.email === email)) {
      return {
        isSuccess: false,
        status: "conflict",
        message: "Username or email already exists",
        data: { username, email },
      };
    }

    // Insert new user
    const insertQuery = "INSERT INTO users(username, email, password) VALUES (?, ?, ?)";
    const insertValues = [username, email, password];
    const [insertResult] = await connection.execute<ResultSetHeader>(insertQuery, insertValues);

    // Check if insertion was successful based on affectedRows
    if (!insertResult || insertResult.affectedRows !== 1) {
      throw new Error("User creation failed");
    }

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
