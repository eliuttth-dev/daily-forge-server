import { Response } from "express";
import { logger } from "../logger";
import { ErrorResponse, SuccessResponse } from "../interfaces";

export const sendErrorResponse = (res: Response, status: number, message: string): void => {
  logger.error(message);

  const response: ErrorResponse = {
    status: "error",
    error: { message },
    data: null,
  };
  res.status(status).json(response);
  return;
};

export const sendSuccessResponse = (res: Response, data: unknown): void => {
  const response: SuccessResponse = {
    status: "success",
    data,
    error: null,
  };

  res.status(200).json(response);
  return;
};
