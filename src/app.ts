import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes";
import addSecurityHeaders from "./middlewares/headers.middleware";

dotenv.config();

const { PORT } = process.env;

const app = express();
const port: number = !PORT ? 3030 : parseInt(PORT);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(addSecurityHeaders);

// Routes
app.use(router);

// Server
app.listen(port, () => console.log(`Server running on: http://localhost:${port}`));
