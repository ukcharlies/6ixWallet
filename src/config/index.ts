// env parsing + config types
import dotenv from "dotenv";

// Load the right env file based on environment
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

export default {
  port: Number(process.env.PORT || 5000),
  env: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "secret",
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database:
      process.env.NODE_ENV === "test"
        ? process.env.DB_NAME_TEST || "6ixwallet_test"
        : process.env.DB_NAME,
  },
  adjutor: {
    baseUrl: process.env.ADJUTOR_BASE_URL,
    apiKey: process.env.ADJUTOR_API_KEY,
  },
} as const;
