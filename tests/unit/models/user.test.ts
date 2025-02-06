import { RowDataPacket } from "mysql2/promise";
import pool from "../../../src/config/dbConfig";
import { createNewUser, logUser } from "../../../src/models/user.model";
import { UserData, UserLoginData, UserCreationResponse, UserLoginResponse } from "../../../src/interfaces";
import bcrypt from "bcrypt";

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("hashedPassword"),
}));

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

describe("User Log in", () => {
  const validUserLoginData: UserLoginData = {
    identifier: "testUser",
    password: "Securepassword1234$",
  };

  const mockUserRow: RowDataPacket & { username: string; email: string; password: string } = {
    username: "testUser",
    email: "test@example.com",
    password: "hashedPassword",
    constructor: { name: "RowDataPacket" } as any,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should return not_found if the user is not found", async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue([[], undefined]),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: UserLoginResponse = await logUser(validUserLoginData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("not_found");
    expect(result.message).toBe("User not found");
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return unauthorized if the password is incorrect", async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue([[mockUserRow], undefined]),
      release: jest.fn(),
    };
    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    const result: UserLoginResponse = await logUser(validUserLoginData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("unauthorized");
    expect(result.message).toBe("Incorrect username or password");
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should log in successfully if credentials are correct", async () => {
    const mockConnection = {
      query: jest.fn().mockResolvedValue([[mockUserRow], undefined]),
      release: jest.fn(),
    };

    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const result: UserLoginResponse = await logUser(validUserLoginData);

    expect(result.isSuccess).toBe(true);
    expect(result.status).toBe("logged_in");
    expect(result.message).toBe("User logged in successfully");
    expect(result.data).toEqual({
      username: mockUserRow.username,
      email: mockUserRow.email,
    });
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("Should return an error if the query fails", async () => {
    const queryError = new Error("Query failure");
    const mockConnection = {
      query: jest.fn().mockRejectedValue(queryError),
      release: jest.fn(),
    };
    (pool.getConnection as jest.Mock).mockResolvedValueOnce(mockConnection);

    const result: UserLoginResponse = await logUser(validUserLoginData);

    expect(result.isSuccess).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toBe("Query failure");
    expect(mockConnection.release).toHaveBeenCalled();
  });
});
