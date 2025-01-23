import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";

export const registerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const { username, email, password } = req.body;

  const validateUsername = /^[a-zA-Z0-9_!@#$%^&*()+=\-.]+$/;
  const validateEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const validatePassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])(?!.*\s).{8,}$/;

  // Check if inputs are valid
  if (username.includes(" ") || email.includes(" ") || password.includes(" ")) {
    res.status(400).json({ message: "Whitespaces is not allowed in username, email or password" });
    return;
  }

  if (!validateUsername.test(username)) {
    res.status(400).json({ message: "Invalid username format, no spaces allowed, please try again" });
    return;
  }
  if (!validateEmail.test(email)) {
    res.status(400).json({ message: "Invalid email format, please try again" });
    return;
  }
  if (!validatePassword.test(password)) {
    res.status(400).json({ message: "Invalid password format. please try again" });
    return;
  }

  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  req.body.password = hashedPassword;

  next();
};
