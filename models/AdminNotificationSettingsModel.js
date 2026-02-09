// models/adminNotificationSettingsModel.js
const db = require('../config/db'); // Change this line

class NotificationSettings {
  // Create default notification settings
  static async create(userId) {
    const query = `
      INSERT INTO notification_settings (user_id)
      VALUES (?)`;
    
    const [result] = await db.query(query, [userId]); // Change to db.query
    
    if (result.insertId) {
      const [rows] = await db.query('SELECT * FROM notification_settings WHERE id = ?', [result.insertId]);
      return rows[0];
    }
    
    return null;
  }

  // Get notification settings by user ID
  static async findByUserId(userId) {
    const query = `SELECT * FROM notification_settings WHERE user_id = ?`;
    const [rows] = await db.query(query, [userId]); // Change to db.query
    return rows[0];
  }

  // Update notification settings
  static async update(userId, settings) {
    const {
      email_notifications,
      sms_notifications,
      whatsapp_notifications,
      payment_alerts,
      booking_alerts,
      maintenance_alerts
    } = settings;
    
    const query = `
      UPDATE notification_settings 
      SET email_notifications = ?, 
          sms_notifications = ?, 
          whatsapp_notifications = ?, 
          payment_alerts = ?, 
          booking_alerts = ?, 
          maintenance_alerts = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`;
    
    const [result] = await db.query(query, [ // Change to db.query
      email_notifications,
      sms_notifications,
      whatsapp_notifications,
      payment_alerts,
      booking_alerts,
      maintenance_alerts,
      userId
    ]);
    
    if (result.affectedRows > 0) {
      const [rows] = await db.query('SELECT * FROM notification_settings WHERE user_id = ?', [userId]);
      return rows[0];
    }
    
    return null;
  }
}

module.exports = NotificationSettings;