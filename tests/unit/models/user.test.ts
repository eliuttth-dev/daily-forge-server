import { RowDataPacket } from "mysql2/promise";
import pool from "../../../src/config/dbConfig";
import { createNewUser } from "../../../src/models/user.model";
import { UserData, UserCreationResponse } from "../../../src/interfaces";

jest.mock("../../../src/config/dbConfig", () => {
  const mockConnection = {
    query: jest.fn(),
    execute: jest.fn(),
    release: jest.fn(),
  };

  return {
    query: jest.fn(),
    execute: jest.fn(),
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    end: jest.fn().mockResolvedValue(undefined),
  };
});

describe("CreateNewUser", () => {
  const mockUsername = "testUserJestTest";
  const mockEmail = "jesttest@test.com";
  const mockPassword = "Securepassword1234$";

  const validUserData: UserData = {
    username: mockUsername,
    email: mockEmail,
    password: mockPassword,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      await pool.execute("DELETE FROM users WHERE username LIKE 'testuser%'");
      await pool.end();
    } catch (err: unknown) {
      console.error("Error during cleanup:", err);
    }
  });

  it("Should return conflict if the user already exists", async () => {
    const existingUser = [{ username: mockUsername, email: mockEmail }] as RowDataPacket[];

    const mockConnection = {
      query: jest.fn().mockResolvedValue([existingUser, undefined]),
      execute: jest.fn(),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: UserCreationResponse = await createNewUser(validUserData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("conflict");
    expect(result.message).toBe("Username or email already exists");
    expect(result.data).toEqual({ username: mockUsername, email: mockEmail });
    expect(mockConnection.execute).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should create new user successfully", async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue([[], undefined]),
      execute: jest.fn().mockResolvedValue([{ affectedRows: 1 }, undefined]),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: UserCreationResponse = await createNewUser(validUserData);

    expect(result.isSuccess).toBe(true);
    expect(result.status).toBe("created");
    expect(result.message).toBe("User created successfully");
    expect(result.data).toEqual({ username: mockUsername, email: mockEmail });
    expect(mockConnection.query).toHaveBeenCalled();
    expect(mockConnection.execute).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if insertion fails (affectedRows !== 1)", async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue([[], undefined]),
      execute: jest.fn().mockResolvedValue([{ affectedRows: 0 }, undefined]),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: UserCreationResponse = await createNewUser(validUserData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("User creation failed");
    expect(mockConnection.execute).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if the query fails", async () => {
    const queryError = new Error("Query failure");
    const mockConnection = {
      query: jest.fn().mockRejectedValue(queryError),
      execute: jest.fn(),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: UserCreationResponse = await createNewUser(validUserData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Query failure");
    expect(mockConnection.execute).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if the execute fails", async () => {
    const executeError = new Error("Execute failure");
    const mockConnection = {
      query: jest.fn().mockResolvedValue([[], undefined]),
      execute: jest.fn().mockRejectedValue(executeError),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: UserCreationResponse = await createNewUser(validUserData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Execute failure");
    expect(mockConnection.query).toHaveBeenCalled();
    expect(mockConnection.execute).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if getConnection fails", async () => {
    const connectionError = new Error("Connection failure");
    (pool.getConnection as jest.Mock).mockRejectedValueOnce(connectionError);

    const result: UserCreationResponse = await createNewUser(validUserData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Connection failure");
  });
});
