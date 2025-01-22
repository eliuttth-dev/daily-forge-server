import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const dbConfig = {
  host: !DB_HOST ? "localhost" : DB_HOST,
  user: !DB_USER ? "root" : DB_USER,
  password: !DB_PASSWORD ? "password" : DB_PASSWORD,
  database: !DB_NAME ? "database name" : DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

const pool = mysql.createPool(dbConfig);

export default pool;
