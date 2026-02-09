// models/adminProfileModel.js
const db = require('../config/db'); // Change this line

class Profile {
  // Create profile for a user
  static async create(userId, profileData) {
    const { full_name, phone, address, bio, avatar_url } = profileData;
    
    const query = `
      INSERT INTO profiles (user_id, full_name, phone, address, bio, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?)`;
    
    const [result] = await db.query(query, [ // Change to db.query
      userId, full_name, phone, address, bio, avatar_url
    ]);
    
    if (result.insertId) {
      const [rows] = await db.query('SELECT * FROM profiles WHERE id = ?', [result.insertId]);
      return rows[0];
    }
    
    return null;
  }

  // Get profile by user ID
  static async findByUserId(userId) {
    const query = `SELECT * FROM profiles WHERE user_id = ?`;
    const [rows] = await db.query(query, [userId]); // Change to db.query
    return rows[0];
  }

  // Update profile
  static async update(userId, profileData) {
    const { full_name, phone, address, bio } = profileData;
    
    const query = `
      UPDATE profiles 
      SET full_name = ?, phone = ?, address = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`;
    
    const [result] = await db.query(query, [ // Change to db.query
      full_name, phone, address, bio, userId
    ]);
    
    if (result.affectedRows > 0) {
      const [rows] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
      return rows[0];
    }
    
    return null;
  }

  // Update avatar
  static async updateAvatar(userId, avatarUrl) {
    const query = `
      UPDATE profiles 
      SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`;
    
    const [result] = await db.query(query, [avatarUrl, userId]); // Change to db.query
    
    if (result.affectedRows > 0) {
      const [rows] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
      return rows[0];
    }
    
    return null;
  }
}

module.exports = Profile;