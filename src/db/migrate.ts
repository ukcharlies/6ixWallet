import knex from './knex';

export async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await knex.migrate.latest();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}