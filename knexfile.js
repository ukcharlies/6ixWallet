require("dotenv").config();

const sslConfig = {
  development: false,
  test: false,
  production: {
    rejectUnauthorized: true,
    ca: process.env.DB_CA_CERT || undefined,
  },
};

module.exports = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "6ixthedev",
      password: process.env.DB_PASSWORD || "p@ssw0rd",
      database: process.env.DB_NAME || "6ixwallet",
      ssl: sslConfig.development,
    },
    migrations: {
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },

  test: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "6ixthedev",
      password: process.env.DB_PASSWORD || "p@ssw0rd",
      database: process.env.DB_NAME || "6ixwallet",
      ssl: sslConfig.test,
    },
    migrations: {
      directory: "./migrations",
    },
  },

  production: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "defaultdb",
      ssl: sslConfig.production,
      typeCast: function (field, next) {
        if (field.type === "TINY" && field.length === 1) {
          return field.string() === "1";
        }
        return next();
      },
    },
    pool: {
      min: 2,
      max: 10,
      // Add acquire timeout and connection timeout
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      // Add error handling
      afterCreate: (conn, done) => {
        conn.query('SET time_zone = "UTC";', (err) => {
          done(err, conn);
        });
      },
    },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
    },
  },
};
