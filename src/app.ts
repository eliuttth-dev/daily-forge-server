import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const { PORT } = process.env;

const app = express();
const port: number = 3030 | parseInt(PORT);

app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

app.listen(port, () => console.log(`Server running on: http://localhost:${port}`));
