import knex, { Knex } from "knex";
const config = require("../../knexfile");

const env = process.env.NODE_ENV || "development";
const knexConfig: Knex.Config = config[env];

const db = knex(knexConfig);
export default db;
export type DB = Knex;
