import { Request, Response } from "express";
import { createNewUser } from "../models/user.model";

export const registerHandler = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  try {
    const userData = await createNewUser({ username, email, password });

    if (userData.isSuccess) {
      res.status(201).json({ message: "User registered successfully", data: userData });
      return;
    }

    res.status(409).json({ message: userData.message });
  } catch (err: unknown) {
    if (err instanceof Error) res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

export const loginHandler = () => {};
