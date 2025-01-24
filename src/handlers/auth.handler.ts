import { Request, Response } from "express";
import { createNewUser } from "../models/user.model";
import { sendErrorResponse, sendSuccessResponse } from "../utils/responseHandler";

export const registerHandler = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  try {
    const userData = await createNewUser({ username, email, password });

    if (userData.isSuccess) {
      sendSuccessResponse(res, { message: "User registered successfully", data: userData });
      return;
    }
    sendErrorResponse(res, 409, userData.message);
  } catch (err: unknown) {
    if (err instanceof Error) {
      sendErrorResponse(res, 500, "Internal Server Error");
    } else {
      sendErrorResponse(res, 500, "An unexpected error occurred");
    }
  }
};

export const loginHandler = () => {};
