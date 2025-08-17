import app from "./app";
import config from "./config";
import { runMigrations } from "./db/migrate";

async function startServer() {
  try {
    // Run migrations before starting the server
    if (process.env.AUTO_MIGRATE === "true") {
      await runMigrations();
    }

    app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
