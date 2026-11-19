const { Pool } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const transaction = new AsyncLocalStorage();

const query = (text, params) => (transaction.getStore() || pool).query(text, params);

// Ejecuta varias consultas como una sola unidad (todo o nada)
async function withTransaction(fn) {
  // Commands composed from existing controllers share one atomic transaction.
  const current = transaction.getStore();
  if (current) return fn(current);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await transaction.run(client, () => fn(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
