// models/userModel.js
const db = require("../config/db");

const UserModel = {
  // Find user by email
  async findByEmail(email) {
    try {
      const [rows] = await db.query(
        "SELECT id, email, password FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      return rows[0] || null;
    } catch (err) {
      console.error("UserModel.findByEmail Error:", err);
      throw err;
    }
  },

  // Create user (used by seed/import scripts if needed)
  async createUser({ email, password }) {
    try {
      const [result] = await db.query(
        "INSERT INTO users (email, password) VALUES (?, ?)",
        [email, password]
      );
      return { id: result.insertId, email };
    } catch (err) {
      console.error("UserModel.createUser Error:", err);
      throw err;
    }
  },

  // Update password by user id
  async updatePassword(id, newPassword) {
    try {
      await db.query("UPDATE users SET password = ? WHERE id = ?", [
        newPassword,
        id,
      ]);
      return true;
    } catch (err) {
      console.error("UserModel.updatePassword Error:", err);
      throw err;
    }
  },
};

module.exports = UserModel;
