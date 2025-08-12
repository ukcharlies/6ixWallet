// Global test setup
const db = require("../db/knex").default;

// Increase timeout for all tests
jest.setTimeout(10000);

// Setup global beforeAll and afterAll hooks
beforeAll(async () => {
  // Ensure migrations are run
  await db.migrate.latest();
});

afterAll(async () => {
  // Close the database connection
  await db.destroy();
});
