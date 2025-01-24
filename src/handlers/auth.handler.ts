import { Request, Response } from "express";
import { createNewUser, loginUser } from "../models/user.model";
import { sendErrorResponse, sendSuccessResponse } from "../utils/responseHandler";
import { logger } from "../logger";

export const registerHandler = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  try {
    logger.info("Attempting to register new user");

    const userData = await createNewUser({ username, email, password });

    if (userData.isSuccess) {
      logger.info("User registered successfully");
      sendSuccessResponse(res, { message: "User registered successfully", data: userData });
      return;
    }
    logger.warn("User registration failed", { reason: userData.message });
    sendErrorResponse(res, 409, userData.message);
  } catch (err: unknown) {
    logger.error("Unexpected error during user registration", { error: err });
    if (err instanceof Error) {
      sendErrorResponse(res, 500, "Internal Server Error");
    } else {
      sendErrorResponse(res, 500, "An unexpected error occurred");
    }
  }
};

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  try {
    logger.info("Attempting user login", { username });

    const loginResult = await loginUser(username, password);

    if (loginResult.isSuccess) {
      logger.info("User logged in successfully");
      sendSuccessResponse(res, {
        message: "Login successfully",
        data: {
          id: loginResult.data!.id,
          username: loginResult.data!.username,
          email: loginResult.data!.email,
          token: loginResult.data!.token,
        },
      });
      return;
    }

    logger.warn("Login failed", { username, reason: loginResult.message });
    sendErrorResponse(res, 401, loginResult.message);
  } catch (err: unknown) {
    logger.error("Unexpected error during user login", { error: err });
    if (err instanceof Error) {
      sendErrorResponse(res, 500, "Internal Server Error");
    } else {
      sendErrorResponse(res, 500, "An unexpected error occurred");
    }
  }
};
