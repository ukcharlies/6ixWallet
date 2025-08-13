import { Knex } from "knex";
import createConnection from "./connection";

let db: Knex | null = null;

async function getConnection(): Promise<Knex> {
  if (!db) {
    db = await createConnection();

    // Run migrations if needed
    if (process.env.AUTO_MIGRATE === "true") {
      try {
        console.log("Running database migrations...");
        await db.migrate.latest();
        console.log("Migrations completed successfully");
      } catch (err) {
        console.error("Migration failed:", err);
      }
    }
  }
  return db;
}

// Initialize connection right away
const connectionPromise = getConnection();

export default {
  // Proxy to access the database
  query: async (sql: string, bindings?: any) => {
    const connection = await connectionPromise;
    return connection.raw(sql, bindings);
  },
  transaction: async (callback: (trx: Knex.Transaction) => Promise<any>) => {
    const connection = await connectionPromise;
    return connection.transaction(callback);
  },
  // Other methods from knex can be proxied here
  schema: {
    createTable: async (
      tableName: string,
      callback: (tableBuilder: Knex.CreateTableBuilder) => void
    ) => {
      const connection = await connectionPromise;
      return connection.schema.createTable(tableName, callback);
    },
    // Add other schema methods as needed
    dropTable: async (tableName: string) => {
      const connection = await connectionPromise;
      return connection.schema.dropTable(tableName);
    },
    hasTable: async (tableName: string) => {
      const connection = await connectionPromise;
      return connection.schema.hasTable(tableName);
    },
    alterTable: async (
      tableName: string,
      callback: (tableBuilder: Knex.CreateTableBuilder) => void
    ) => {
      const connection = await connectionPromise;
      return connection.schema.alterTable(tableName, callback);
    },
  },
  // Migration methods
  migrate: {
    latest: async () => {
      const connection = await connectionPromise;
      return connection.migrate.latest();
    },
    rollback: async () => {
      const connection = await connectionPromise;
      return connection.migrate.rollback();
    },
    status: async () => {
      const connection = await connectionPromise;
      return connection.migrate.status();
    },
  },
  // Table query builder
  table: async (tableName: string) => {
    const connection = await connectionPromise;
    return connection(tableName);
  },
  // Allow direct access to common table operations
  select: async (tableName: string, columns?: any) => {
    const connection = await connectionPromise;
    return connection(tableName).select(columns);
  },
  insert: async (tableName: string, data: any) => {
    const connection = await connectionPromise;
    return connection(tableName).insert(data);
  },
  update: async (tableName: string, data: any, whereClause?: any) => {
    const connection = await connectionPromise;
    const query = connection(tableName).update(data);
    return whereClause ? query.where(whereClause) : query;
  },
  delete: async (tableName: string, whereClause?: any) => {
    const connection = await connectionPromise;
    const query = connection(tableName).delete();
    return whereClause ? query.where(whereClause) : query;
  },
  // Allow access to the raw connection once initialized
  getKnex: async () => {
    return connectionPromise;
  },
  destroy: async () => {
    const connection = await connectionPromise;
    return connection.destroy();
  },
};

// Export the connection type
export type DB = Knex;
