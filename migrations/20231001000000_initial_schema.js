exports.up = function (knex) {
  return knex.schema
    .createTable("users", (table) => {
      table.uuid("id").primary();
      table.string("name").notNullable();
      table.string("email").notNullable().unique();
      table.string("phone").nullable();
      table.string("password_hash").notNullable();
      table.timestamps(true, true);
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    })
    .createTable("wallets", (table) => {
      table.uuid("id").primary();
      table
        .uuid("user_id")
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
        .references("id")
        .inTable("wallets")
        .onDelete("CASCADE");
      table.enu("type", ["credit", "debit"]).notNullable();
      table.bigInteger("amount").notNullable();
      table.string("reference").notNullable().unique();
      table.string("description").nullable();
      table.timestamps(true, true);
    })
    .createTable("transfers", (table) => {
      table.uuid("id").primary();
      table
        .uuid("from_transaction_id")
        .references("id")
        .inTable("transactions")
        .onDelete("CASCADE");
      table
        .uuid("to_transaction_id")
        .references("id")
        .inTable("transactions")
        .onDelete("CASCADE");
      table
        .enu("status", ["pending", "completed", "failed"])
        .notNullable()
        .defaultTo("pending");
      table.timestamps(true, true);
    })
    .createTable("blacklist_logs", (table) => {
      table.uuid("id").primary();
      table.string("identity_type").notNullable();
      table.string("identity_value").notNullable();
      table.boolean("is_blacklisted").notNullable();
      table.timestamps(true, true);
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
