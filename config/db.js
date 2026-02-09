// config/db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Kaml@7049",
  database: process.env.DB_NAME || "roomac_db",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the connection
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL Database Connected Successfully");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL Connection Failed:", err);
  }
})();

module.exports = pool;
