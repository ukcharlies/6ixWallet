const mysql = require("mysql2/promise");
require("dotenv").config();

async function setupTestDb() {
  console.log("Setting up test database...");

  try {
    // First connect without specifying a database
    const rootConnection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "6ixthedev",
      password: process.env.DB_PASSWORD || "p@ssw0rd",
    });

    // Check if database exists
    const [rows] = await rootConnection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [process.env.DB_NAME || "6ixwallet"]
    );

    if (rows.length === 0) {
      console.log(
        `Database ${
          process.env.DB_NAME || "6ixwallet"
        } does not exist, please create it manually.`
      );
      console.log("You can create it using: CREATE DATABASE 6ixwallet;");
      process.exit(1);
    } else {
      console.log(`Database ${process.env.DB_NAME || "6ixwallet"} exists.`);
    }

    await rootConnection.end();

    // Now connect to the actual database to check access
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "6ixthedev",
      password: process.env.DB_PASSWORD || "p@ssw0rd",
      database: process.env.DB_NAME || "6ixwallet",
    });

    // Simple query to test access
    await dbConnection.query("SELECT 1");
    console.log("Database connection and access verified successfully.");

    await dbConnection.end();
  } catch (error) {
    console.error("Error setting up test database:", error);
    process.exit(1);
  }
}

setupTestDb();
