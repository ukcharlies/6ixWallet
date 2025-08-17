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
        ssl:
          process.env.NODE_ENV === "production"
            ? {
                rejectUnauthorized: true,
                ca: process.env.DB_CA_CERT,
              }
            : undefined,
      },
      pool: {
        min: 0,
        max: 7,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
      },
    });

    // Test the connection
    await connection.raw("SELECT 1");
    console.log("Database connection established successfully");

    // Ensure migrations table exists
    const [hasMigrationsTable] = await connection.raw(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knex_migrations')"
    );

    if (!hasMigrationsTable) {
      console.log("Running initial migrations...");
      await connection.migrate.latest();
    }

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

    throw error;
  }
}

export default createConnection;
