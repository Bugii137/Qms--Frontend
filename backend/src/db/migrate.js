require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations() {
  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

async function runMigrations() {
  console.log(`\n Connecting to ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT} as ${process.env.DB_USER}...`);

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // filenames are zero-padded (001_, 002_...) so lexical sort == run order

  if (files.length === 0) {
    console.log('No migration files found in', MIGRATIONS_DIR);
    return;
  }

  let ranCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`    ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`   ${file}`);
      ranCount += 1;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`   ${file} failed:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`\n Migrations complete. ${ranCount} applied, ${files.length - ranCount} already up to date.\n`);
}

runMigrations()
  .then(() => pool.end())
  .catch((err) => {
    console.error('\nMigration run failed:', err);
    pool.end();
    process.exit(1);
  });
