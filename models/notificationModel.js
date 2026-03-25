// models/notificationModel.js
const db = require('../config/db');

class NotificationModel {
  // Create a new notification
  static async create(data) {
    try {
    
      const {
        recipient_id,
        recipient_type,
        title,
        message,
        notification_type = 'general',
        related_entity_type = null,
        related_entity_id = null,
        priority = 'medium'
      } = data;

      const sql = `
        INSERT INTO notifications (
          recipient_id,
          recipient_type,
          title,
          message,
          notification_type,
          related_entity_type,
          related_entity_id,
          priority,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const [result] = await db.query(sql, [
        recipient_id,
        recipient_type,
        title,
        message,
        notification_type,
        related_entity_type,
        related_entity_id,
        priority
      ]);

      return result.insertId;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for recipient
  static async getByRecipient(recipient_type, recipient_id, filters = {}) {
    try {
      
      let sql = `
        SELECT 
          n.*,
          CASE 
            WHEN n.related_entity_type = 'tenant_request' THEN tr.title
            WHEN n.related_entity_type = 'vacate_request' THEN 'Vacate Request'
            ELSE n.title
          END as entity_title,
          CASE 
            WHEN n.related_entity_type = 'tenant_request' THEN tr.status
            WHEN n.related_entity_type = 'vacate_request' THEN vbr.status
            ELSE NULL
          END as entity_status
        FROM notifications n
        LEFT JOIN tenant_requests tr ON n.related_entity_id = tr.id AND n.related_entity_type = 'tenant_request'
        LEFT JOIN vacate_bed_requests vbr ON n.related_entity_id = vbr.id AND n.related_entity_type = 'vacate_request'
        WHERE n.recipient_type = ? AND n.recipient_id = ?
      `;

      const params = [recipient_type, recipient_id];

      // Apply filters
      if (filters.read_status !== undefined) {
        sql += ' AND n.is_read = ?';
        params.push(filters.read_status ? 1 : 0);
      }

      if (filters.notification_type) {
        sql += ' AND n.notification_type = ?';
        params.push(filters.notification_type);
      }

      if (filters.priority) {
        sql += ' AND n.priority = ?';
        params.push(filters.priority);
      }

      // Always order by newest first
      sql += ' ORDER BY n.created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      const [rows] = await db.query(sql, params);
      return rows;
    } catch (error) {
      console.error('❌ Error getting notifications:', error);
      throw error;
    }
  }

  // Get unread count
  static async getUnreadCount(recipient_type, recipient_id) {
    try {
      
      const sql = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE recipient_type = ? 
          AND recipient_id = ? 
          AND is_read = 0
      `;
      
      const [rows] = await db.query(sql, [recipient_type, recipient_id]);
      const count = rows[0]?.count || 0;
      
      return count;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(id) {
    try {
      
      const sql = 'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?';
      const [result] = await db.query(sql, [id]);
      
      const success = result.affectedRows > 0;
      return success;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark multiple notifications as read
  static async markMultipleAsRead(ids) {
    try {
      
      if (!ids.length) return 0;
      
      const placeholders = ids.map(() => '?').join(',');
      const sql = `
        UPDATE notifications 
        SET is_read = 1, read_at = NOW() 
        WHERE id IN (${placeholders})
      `;
      
      const [result] = await db.query(sql, ids);
      return result.affectedRows;
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error);
      throw error;
    }
  }

  // Mark all as read for recipient
  static async markAllAsRead(recipient_type, recipient_id) {
    try {
      
      const sql = `
        UPDATE notifications 
        SET is_read = 1, read_at = NOW() 
        WHERE recipient_type = ? 
          AND recipient_id = ? 
          AND is_read = 0
      `;
      
      const [result] = await db.query(sql, [recipient_type, recipient_id]);
      return result.affectedRows;
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      throw error;
    }
  }

  // Delete notification
  static async delete(id) {
    try {
      
      const sql = 'DELETE FROM notifications WHERE id = ?';
      const [result] = await db.query(sql, [id]);
      
      const success = result.affectedRows > 0;
      return success;
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  }

  // Get statistics
  static async getStats(recipient_type, recipient_id) {
    try {
      
      const sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low,
          SUM(CASE WHEN notification_type = 'tenant_request' THEN 1 ELSE 0 END) as tenant_requests,
          SUM(CASE WHEN notification_type = 'vacate_request' THEN 1 ELSE 0 END) as vacate_requests,
          SUM(CASE WHEN notification_type = 'payment' THEN 1 ELSE 0 END) as payment_notifications,
          SUM(CASE WHEN notification_type = 'system' THEN 1 ELSE 0 END) as system_notifications
        FROM notifications 
        WHERE recipient_type = ? AND recipient_id = ?
      `;
      
      const [rows] = await db.query(sql, [recipient_type, recipient_id]);
      const stats = rows[0];
      
      // Convert null values to 0
      Object.keys(stats).forEach(key => {
        if (stats[key] === null) stats[key] = 0;
      });
      return stats;
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      throw error;
    }
  }
}

module.exports = NotificationModel;