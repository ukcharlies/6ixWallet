const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

async function waitForMysql() {
  console.log("Waiting for MySQL to be ready...");
  let connected = false;
  let retries = 0;
  const maxRetries = 10;

  while (!connected && retries < maxRetries) {
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || "6ixthedev",
        password: process.env.DB_PASSWORD || "p@ssw0rd",
      });

      await connection.end();
      connected = true;
      console.log("MySQL is ready!");
    } catch (error) {
      retries++;
      console.log(
        `Retry ${retries}/${maxRetries}: MySQL not ready yet. Retrying in 2 seconds...`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  if (!connected) {
    console.error("Failed to connect to MySQL after multiple attempts.");
    process.exit(1);
  }
}

waitForMysql();
