import { Request, Response, NextFunction } from "express";

const addSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type", "nosniff");

  next();
};

export default addSecurityHeaders;
