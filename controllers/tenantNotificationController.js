const db = require("../config/db");

class TenantNotificationController {
  /**
   * Get tenant notifications
   */
  async getNotifications(req, res) {
    try {
      // Check if req.user exists (from middleware)
      if (!req.user) {
        console.error('❌ req.user is undefined in getNotifications');
        return res.status(401).json({
          success: false,
          message: "Tenant authentication failed"
        });
      }

      const tenantId = req.user.id; // Use req.user.id instead of req.tenant.id
      const limit = parseInt(req.query.limit) || 20;
      
      console.log(`🔍 Fetching notifications for tenant ID: ${tenantId}, limit: ${limit}`);
      
      const sql = `
        SELECT 
          id,
          title,
          message,
          notification_type,
          related_entity_type,
          related_entity_id,
          is_read,
          read_at,
          priority,
          created_at
        FROM notifications
        WHERE recipient_id = ? AND recipient_type = 'tenant'
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const [notifications] = await db.query(sql, [tenantId, limit]);
      
      console.log(`✅ Found ${notifications.length} notifications for tenant ${tenantId}`);
      
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      console.error('❌ Error fetching tenant notifications:', error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req, res) {
    try {
      // Check if req.user exists
      if (!req.user) {
        console.error('❌ req.user is undefined in getUnreadCount');
        return res.status(401).json({
          success: false,
          message: "Tenant authentication failed"
        });
      }

      const tenantId = req.user.id; // Use req.user.id instead of req.tenant.id
      
      console.log(`🔍 Getting unread count for tenant ID: ${tenantId}`);
      
      const sql = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE recipient_id = ? AND recipient_type = 'tenant' AND is_read = 0
      `;
      
      const [result] = await db.query(sql, [tenantId]);
      const count = result[0].count;
      
      console.log(`✅ Unread count for tenant ${tenantId}: ${count}`);
      
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get unread count",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req, res) {
    try {
      // Check if req.user exists
      if (!req.user) {
        console.error('❌ req.user is undefined in markAsRead');
        return res.status(401).json({
          success: false,
          message: "Tenant authentication failed"
        });
      }

      const tenantId = req.user.id; // Use req.user.id instead of req.tenant.id
      const notificationId = req.params.id;
      
      console.log(`📝 Marking notification ${notificationId} as read for tenant ${tenantId}`);
      
      const sql = `
        UPDATE notifications
        SET is_read = 1, read_at = NOW()
        WHERE id = ? AND recipient_id = ? AND recipient_type = 'tenant'
      `;
      
      const [result] = await db.query(sql, [notificationId, tenantId]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found"
        });
      }
      
      console.log(`✅ Notification ${notificationId} marked as read`);
      
      res.json({
        success: true,
        message: "Notification marked as read"
      });
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: "Failed to mark notification as read",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      // Check if req.user exists
      if (!req.user) {
        console.error('❌ req.user is undefined in markAllAsRead');
        return res.status(401).json({
          success: false,
          message: "Tenant authentication failed"
        });
      }

      const tenantId = req.user.id; // Use req.user.id instead of req.tenant.id
      
      console.log(`📝 Marking all notifications as read for tenant ${tenantId}`);
      
      const sql = `
        UPDATE notifications
        SET is_read = 1, read_at = NOW()
        WHERE recipient_id = ? AND recipient_type = 'tenant' AND is_read = 0
      `;
      
      const [result] = await db.query(sql, [tenantId]);
      
      console.log(`✅ Marked ${result.affectedRows} notifications as read for tenant ${tenantId}`);
      
      res.json({
        success: true,
        message: `${result.affectedRows} notifications marked as read`
      });
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: "Failed to mark all notifications as read",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Create a notification for a tenant (used internally by admin controllers)
   */
  async createNotification({
    tenantId,
    title,
    message,
    notificationType = 'general',
    relatedEntityType = null,
    relatedEntityId = null,
    priority = 'medium'
  }) {
    try {
      console.log(`📨 Creating notification for tenant ${tenantId}: ${title}`);
      
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
        ) VALUES (?, 'tenant', ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const [result] = await db.query(sql, [
        tenantId,
        title,
        message,
        notificationType,
        relatedEntityType,
        relatedEntityId,
        priority
      ]);
      
      console.log(`✅ Notification created with ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create complaint status update notification
   */
/**
 * Create complaint status update notification with admin notes
 */
async notifyComplaintStatusUpdate(complaintId, tenantId, status, adminNotes = null) {
  const statusMessages = {
    'pending': {
      title: 'Complaint Received',
      message: adminNotes 
        ? `Your complaint #${complaintId} has been received. Notes: ${adminNotes}`
        : `Your complaint #${complaintId} has been received and is pending review.`
    },
    'in_progress': {
      title: 'Complaint In Progress',
      message: adminNotes
        ? `Your complaint #${complaintId} is now in progress. Notes: ${adminNotes}`
        : `Your complaint #${complaintId} is now being processed by our team.`
    },
    'resolved': {
      title: 'Complaint Resolved',
      message: adminNotes 
        ? `Your complaint #${complaintId} has been resolved. Notes: ${adminNotes}`
        : `Your complaint #${complaintId} has been resolved.`
    },
    'closed': {
      title: 'Complaint Closed',
      message: adminNotes
        ? `Your complaint #${complaintId} has been closed. Notes: ${adminNotes}`
        : `Your complaint #${complaintId} has been closed.`
    }
  };

  const notification = statusMessages[status] || {
    title: 'Complaint Updated',
    message: adminNotes
      ? `Your complaint #${complaintId} status has been updated to ${status.replace('_', ' ')}. Notes: ${adminNotes}`
      : `Your complaint #${complaintId} status has been updated to ${status.replace('_', ' ')}.`
  };

  return await this.createNotification({
    tenantId,
    title: notification.title,
    message: notification.message,
    notificationType: 'complaint',
    relatedEntityType: 'complaint',
    relatedEntityId: complaintId,
    priority: status === 'resolved' ? 'low' : 'medium'
  });
}
/**
 * Create maintenance status update notification
 */
async notifyMaintenanceStatusUpdate(requestId, tenantId, status, adminNotes = null) {
  const statusMessages = {
    'pending': {
      title: 'Maintenance Request Received',
      message: adminNotes 
        ? `Your maintenance request #${requestId} has been received. Notes: ${adminNotes}`
        : `Your maintenance request #${requestId} has been received and is pending review.`
    },
    'in_progress': {
      title: 'Maintenance Request In Progress',
      message: adminNotes
        ? `Your maintenance request #${requestId} is now in progress. Notes: ${adminNotes}`
        : `Your maintenance request #${requestId} is now being processed by our team.`
    },
    'resolved': {
      title: 'Maintenance Request Resolved',
      message: adminNotes 
        ? `Your maintenance request #${requestId} has been resolved. Notes: ${adminNotes}`
        : `Your maintenance request #${requestId} has been resolved.`
    },
    'closed': {
      title: 'Maintenance Request Closed',
      message: adminNotes
        ? `Your maintenance request #${requestId} has been closed. Notes: ${adminNotes}`
        : `Your maintenance request #${requestId} has been closed.`
    }
  };

  const notification = statusMessages[status] || {
    title: 'Maintenance Request Updated',
    message: adminNotes
      ? `Your maintenance request #${requestId} status has been updated to ${status.replace('_', ' ')}. Notes: ${adminNotes}`
      : `Your maintenance request #${requestId} status has been updated to ${status.replace('_', ' ')}.`
  };

  return await this.createNotification({
    tenantId,
    title: notification.title,
    message: notification.message,
    notificationType: 'maintenance',
    relatedEntityType: 'maintenance',
    relatedEntityId: requestId,
    priority: status === 'resolved' ? 'low' : 'medium'
  });
}
}

module.exports = new TenantNotificationController();