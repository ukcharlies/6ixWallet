import knex, { Knex } from "knex";
import config from "../config";

// Maximum number of connection attempts
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

async function createConnection(retries = MAX_RETRIES): Promise<Knex> {
  try {
    console.log(
      `Attempting database connection to ${config.db.host}:${config.db.port}`
    );
    const connection = knex({
      client: "mysql2",
      connection: {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
      },
      pool: { min: 0, max: 7 },
    });

    // Test the connection
    await connection.raw("SELECT 1");
    console.log("Database connection established successfully");
    return connection;
  } catch (error) {
    console.error(`Database connection failed:`, error);

    if (retries > 0) {
      console.log(
        `Retrying in ${
          RETRY_DELAY / 1000
        } seconds... (${retries} attempts remaining)`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return createConnection(retries - 1);
    }

    if (config.env === "production") {
      console.log(
        "Using in-memory mock database for production when DB connection fails"
      );
      return createMockDatabase();
    }

    throw error;
  }
}

function createMockDatabase(): Knex {
  // Simple in-memory database for when real connection fails in production
  // This is a fallback to prevent complete app failure
  console.log("WARNING: Using mock database - data will not persist!");
  return knex({
    client: "better-sqlite3",
    connection: {
      filename: ":memory:",
    },
    useNullAsDefault: true,
  });
}

export default createConnection;
