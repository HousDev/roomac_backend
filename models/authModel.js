// models/userModel.js
const db = require("../config/db");

const UserModel = {
  // Find user by email
  async findByEmail(email) {
    try {
      const [rows] = await db.query(
        "SELECT id, email, password, role, is_active, permissions FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      return rows[0] || null;
    } catch (err) {
      console.error("UserModel.findByEmail Error:", err);
      throw err;
    }
  },

  // Create user
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

  // Update permissions for a user
  async updatePermissions(id, permissions) {
    try {
      await db.query("UPDATE users SET permissions = ? WHERE id = ?", [
        JSON.stringify(permissions),
        id,
      ]);
      return true;
    } catch (err) {
      console.error("UserModel.updatePermissions Error:", err);
      throw err;
    }
  },

  // Get all users (for permissions page dropdown)
  async getAllUsers() {
    try {
      const [rows] = await db.query(
        "SELECT id, email, role, permissions FROM users WHERE is_active = 1"
      );
      // Parse permissions JSON for each user
      return rows.map((u) => ({
        ...u,
        permissions: u.permissions
          ? typeof u.permissions === "string"
            ? JSON.parse(u.permissions)
            : u.permissions
          : {},
      }));
    } catch (err) {
      console.error("UserModel.getAllUsers Error:", err);
      throw err;
    }
  },
};

module.exports = UserModel;