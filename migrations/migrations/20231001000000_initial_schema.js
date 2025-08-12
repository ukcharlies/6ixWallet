exports.up = function (knex) {
  return knex.schema
    .createTable("users", (table) => {
      table.uuid("id").primary();
      table.string("email").notNullable().unique();
      table.string("phone").nullable();
      table.string("password_hash").notNullable();
      table.timestamps(true, true);
    })
    .createTable("wallets", (table) => {
      table.uuid("id").primary();
      table
        .uuid("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.bigInteger("balance").notNullable().defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable("transactions", (table) => {
      table.uuid("id").primary();
      table
        .uuid("wallet_id")
        .notNullable()
        .references("id")
        .inTable("wallets")
        .onDelete("CASCADE");
      table.enum("type", ["credit", "debit"]).notNullable();
      table.bigInteger("amount").notNullable();
      table.string("reference").notNullable();
      table.string("description").nullable();
      table.timestamps(true, true);
      // Unique index for idempotency
      table.unique("reference");
    })
    .createTable("transfers", (table) => {
      table.uuid("id").primary();
      table
        .uuid("from_transaction_id")
        .notNullable()
        .references("id")
        .inTable("transactions");
      table
        .uuid("to_transaction_id")
        .notNullable()
        .references("id")
        .inTable("transactions");
      table.enum("status", ["pending", "completed", "failed"]).notNullable();
      table.timestamps(true, true);
    })
    .createTable("blacklist_logs", (table) => {
      table.uuid("id").primary();
      table.string("identity_type").notNullable();
      table.string("identity_value").notNullable();
      table.boolean("is_blacklisted").notNullable();
      table.timestamps(true, true);
      table.index(["identity_type", "identity_value"]);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("blacklist_logs")
    .dropTableIfExists("transfers")
    .dropTableIfExists("transactions")
    .dropTableIfExists("wallets")
    .dropTableIfExists("users");
};
