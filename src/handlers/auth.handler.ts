import { Request, Response } from "express";
import { createNewUser, logUser } from "../models/user.model";
import { logger } from "../logger";
import { sendErrorResponse, sendSuccessResponse } from "../utils/responseHandler";
import jwt from "jsonwebtoken";

/**
 *  Handler to register a new user
 *
 *  @param {Request} req - Express request object containing user registration details
 *  @param {Response} res - Express response object used to send back the response
 *
 *  @returns {Promise<void>} A promise that resolves once the response has been sent
 */
export const registerHandler = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  try {
    const userData = await createNewUser({ username, email, password });

    if (userData.isSuccess) {
      logger.info("User registered successfully");
      sendSuccessResponse(res, { message: "User registered successfully", data: userData });
    }

    logger.warn("Registration conflict", { message: userData.message });

    sendErrorResponse(res, 409, userData.message);
  } catch (err: unknown) {
    let errorMessage = "Internal Server Error";
    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Error during registration", { error: errorMessage });
    }
    logger.error("Unexpected error during registration", { error: errorMessage });
    sendErrorResponse(res, 500, "Internal Server Error");
  }
};

/**
 *  Handler to log in a user and issue a JWT token upon successful authentication
 *
 *  @param {Request} req - Express request object containing login credentials
 *  @param {Response} res - Express response object used to send back the response
 *
 *  @returns {Promise<void>} A promise that resolves once the response has been sent
 */
export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const { JWT_SECRET } = process.env;
  const { identifier, password } = req.body;

  if (!JWT_SECRET) {
    logger.error("JWT_SECRET is not defined in the environment variables");
    throw new Error("JWT_SECRET is not configured");
  }

  try {
    const loginResult = await logUser({ identifier, password });

    if (!loginResult.isSuccess) {
      logger.warn("Loggin attempt failed", { status: loginResult.status });
      if (loginResult.status === "not_found") {
        sendErrorResponse(res, 404, loginResult.message);
      } else if (loginResult.status === "unauthorized") {
        sendErrorResponse(res, 401, loginResult.message);
      } else {
        sendErrorResponse(res, 400, loginResult.message);
      }
      return;
    }

    const payload = {
      username: loginResult.data?.username,
      email: loginResult.data?.email,
    };

    const token = jwt.sign(payload, JWT_SECRET!, { expiresIn: "1h" });
    logger.info("User logged in successfully", { username: loginResult.data?.username });

    res.header("Authorization", `Bearer ${token}`);
    sendSuccessResponse(res, {
      message: loginResult.message,
      token,
      data: loginResult.data,
    });
  } catch (err: unknown) {
    let errorMessage = "Internal Server Error";
    if (err instanceof Error) {
      errorMessage = err.message;
      logger.error("Error during login", { error: err.message });
    }
    sendErrorResponse(res, 500, "Internal Server Error");
  }
};
