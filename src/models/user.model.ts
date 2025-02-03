import { RowDataPacket } from "mysql2/promise";
import pool from "../config/dbConfig";
import { UserData, UserCreationResponse } from "../interfaces";

export const createNewUser = async (data: UserData): Promise<UserCreationResponse> => {
  const { username, email, password } = data;

  try {
    // check if user already exists
    const selectQuery = "SELECT username, email FROM users WHERE username = ? AND email = ?";
    const selectValues = [username, email];
    const [selectRows] = await pool.query<RowDataPacket[]>(selectQuery, selectValues);

    if (selectRows.length > 0)
      return { isSuccess: false, status: "conflic", message: "Username or email already exists", data: { username, email } };

    // create new user
    const query = "INSERT INTO users(username, email, password) VALUES (?, ?, ?)";
    const values = [username, email, password];

    await pool.execute(query, values);

    return { isSuccess: true, status: "created", message: "User created successfully", data: { username, email } };
  } catch (err: unknown) {
    let errorMessage: string = "An unexpected error occured";

    if (err instanceof Error) errorMessage = err.message;

    return {
      isSuccess: false,
      status: "error",
      message: errorMessage,
    };
  }
};
