import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes";

dotenv.config();

const { PORT } = process.env;

const app = express();
const port: number = !PORT ? 3030 : parseInt(PORT);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(router);

app.listen(port, () => console.log(`Server running on: http://localhost:${port}`));
