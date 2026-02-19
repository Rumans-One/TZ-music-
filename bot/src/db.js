import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

export async function getAllApplications() {
  const result = await pool.query('SELECT * FROM applications ORDER BY created_at DESC;');
  return result.rows;
}

export async function getTodayApplications() {
  const result = await pool.query(
    `SELECT * FROM applications
     WHERE created_at::date = CURRENT_DATE
     ORDER BY created_at DESC;`
  );
  return result.rows;
}
