const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  database:           process.env.DB_DATABASE || 'smartfarm',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
  timezone:           '+07:00',
  typeCast:           true,
});

// Test connection on startup
pool.getConnection()
  .then(async conn => {
    await conn.execute("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
    console.log('✅  MySQL connected:', process.env.DB_DATABASE || 'smartfarm');
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
  });

/**
 * query(sql, params)
 * Returns rows array for SELECT, result object for INSERT/UPDATE/DELETE
 */
async function query(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

module.exports = { pool, query };
