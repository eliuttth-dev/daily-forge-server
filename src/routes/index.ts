import express, { Request, Response } from "express";
import pool from "../config/dbConfig";
import { registerHandler } from "../handlers/auth.handler";

const router = express.Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err: any) {
    console.error("Database query failed", err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Auth Routes
router.post("/api/v1/register", registerHandler);
export default router;
