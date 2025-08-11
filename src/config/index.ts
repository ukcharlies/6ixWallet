// env parsing + config types
import dotenv from "dotenv";
dotenv.config();

export default {
  port: Number(process.env.PORT || 5000),
  env: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "secret",
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  adjutor: {
    baseUrl: process.env.ADJUTOR_BASE_URL,
    apiKey: process.env.ADJUTOR_API_KEY,
  },
} as const;
