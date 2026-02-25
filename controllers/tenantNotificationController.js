
// controllers/tenantNotificationController.js
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
async createNotification({ tenantId, title, message, notificationType, relatedEntityType, relatedEntityId, priority }) {
  try {
    console.log('📝 Creating notification in database:');
    console.log('  - Tenant ID:', tenantId);
    console.log('  - Title:', title);
    console.log('  - Type:', notificationType);
    console.log('  - Related Entity:', relatedEntityType, relatedEntityId);

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

    console.log('✅ Notification inserted with ID:', result.insertId);
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

// controllers/tenantNotificationController.js

/**
 * Create leave request status update notification with admin notes
 */
async notifyLeaveStatusUpdate(requestId, tenantId, status, adminNotes = null) {
  const statusMessages = {
    'pending': {
      title: 'Leave Request Received',
      message: adminNotes 
        ? `Your leave request #${requestId} has been received. Notes: ${adminNotes}`
        : `Your leave request #${requestId} has been received and is pending review.`
    },
    'in_progress': {
      title: 'Leave Request In Progress',
      message: adminNotes
        ? `Your leave request #${requestId} is now in progress. Notes: ${adminNotes}`
        : `Your leave request #${requestId} is now being processed by our team.`
    },
    'approved': {
      title: 'Leave Request Approved',
      message: adminNotes 
        ? `Your leave request #${requestId} has been approved. Notes: ${adminNotes}`
        : `Your leave request #${requestId} has been approved. Please submit keys before leaving.`
    },
    'rejected': {
      title: 'Leave Request Rejected',
      message: adminNotes
        ? `Your leave request #${requestId} has been rejected. Notes: ${adminNotes}`
        : `Your leave request #${requestId} has been rejected. Please contact admin for more details.`
    },
    'completed': {
      title: 'Leave Request Completed',
      message: adminNotes
        ? `Your leave request #${requestId} has been completed. Notes: ${adminNotes}`
        : `Your leave request #${requestId} has been completed. Welcome back!`
    },
    'cancelled': {
      title: 'Leave Request Cancelled',
      message: adminNotes
        ? `Your leave request #${requestId} has been cancelled. Notes: ${adminNotes}`
        : `Your leave request #${requestId} has been cancelled.`
    }
  };

  const notification = statusMessages[status] || {
    title: 'Leave Request Updated',
    message: adminNotes
      ? `Your leave request #${requestId} status has been updated to ${status.replace('_', ' ')}. Notes: ${adminNotes}`
      : `Your leave request #${requestId} status has been updated to ${status.replace('_', ' ')}.`
  };

  return await this.createNotification({
    tenantId,
    title: notification.title,
    message: notification.message,
    notificationType: 'leave',
    relatedEntityType: 'leave',
    relatedEntityId: requestId,
    priority: status === 'approved' || status === 'rejected' ? 'medium' : 'high'
  });
}
// controllers/tenantNotificationController.js

/**
 * Create vacate request status update notification with admin notes
 */
async notifyVacateStatusUpdate(requestId, tenantId, status, adminNotes = null) {
  const statusMessages = {
    'pending': {
      title: 'Vacate Request Received',
      message: adminNotes 
        ? `Your vacate request #${requestId} has been received. Notes: ${adminNotes}`
        : `Your vacate request #${requestId} has been received and is pending review.`
    },
    'under_review': {
      title: 'Vacate Request Under Review',
      message: adminNotes
        ? `Your vacate request #${requestId} is now under review. Notes: ${adminNotes}`
        : `Your vacate request #${requestId} is now being reviewed by our team.`
    },
    'approved': {
      title: 'Vacate Request Approved',
      message: adminNotes 
        ? `Your vacate request #${requestId} has been approved. Notes: ${adminNotes}`
        : `Your vacate request #${requestId} has been approved. Please complete the vacate process.`
    },
    'rejected': {
      title: 'Vacate Request Rejected',
      message: adminNotes
        ? `Your vacate request #${requestId} has been rejected. Notes: ${adminNotes}`
        : `Your vacate request #${requestId} has been rejected. Please contact admin for more details.`
    },
    'completed': {
      title: 'Vacate Request Completed',
      message: adminNotes
        ? `Your vacate request #${requestId} has been completed. Notes: ${adminNotes}`
        : `Your vacate request #${requestId} has been completed. Thank you for staying with us!`
    },
    'cancelled': {
      title: 'Vacate Request Cancelled',
      message: adminNotes
        ? `Your vacate request #${requestId} has been cancelled. Notes: ${adminNotes}`
        : `Your vacate request #${requestId} has been cancelled.`
    }
  };

  const notification = statusMessages[status] || {
    title: 'Vacate Request Updated',
    message: adminNotes
      ? `Your vacate request #${requestId} status has been updated to ${status.replace('_', ' ')}. Notes: ${adminNotes}`
      : `Your vacate request #${requestId} status has been updated to ${status.replace('_', ' ')}.`
  };

  return await this.createNotification({
    tenantId,
    title: notification.title,
    message: notification.message,
    notificationType: 'vacate',
    relatedEntityType: 'vacate',
    relatedEntityId: requestId,
    priority: status === 'approved' || status === 'rejected' ? 'high' : 'medium'
  });
}

// Send status notification to tenant
async sendStatusNotification(tenantId, requestId, oldStatus, newStatus, adminNotes, requestData) {
  try {
    console.log(`📨 Preparing notification for tenant ${tenantId} - Status change: ${oldStatus} → ${newStatus}`);
    
    // Get tenant info for better messaging
    const [tenantInfo] = await db.query(
      'SELECT full_name FROM tenants WHERE id = ?',
      [tenantId]
    );
    
    const tenantName = tenantInfo[0]?.full_name || 'Tenant';
    
    // Status-specific messages
    const statusMessages = {
      'pending': {
        title: 'Change Bed Request Received',
        message: `Your request to change bed has been received and is pending review.`
      },
      'approved': {
        title: 'Change Bed Request Approved',
        message: `Your change bed request has been approved!`
      },
      'rejected': {
        title: 'Change Bed Request Rejected',
        message: adminNotes 
          ? `Your change bed request has been rejected. Reason: ${adminNotes}`
          : `Your change bed request has been rejected. Please contact support for more information.`
      },
      'processed': {
        title: 'Change Bed Request Completed',
        message: `Your change bed request has been processed. You have been moved to your new room.`
      }
    };
    
    const notification = statusMessages[newStatus] || {
      title: 'Change Bed Request Updated',
      message: `Your change bed request status has been updated to ${newStatus}.`
    };
    
    // Add admin notes if provided
    if (adminNotes && newStatus !== 'rejected') {
      notification.message += ` Notes: ${adminNotes}`;
    }
    
    // Add rent difference info if available
    if (newStatus === 'approved' && requestData.rent_difference) {
      const diff = parseFloat(requestData.rent_difference);
      if (diff > 0) {
        notification.message += ` Your new rent will be ₹${diff} higher.`;
      } else if (diff < 0) {
        notification.message += ` Your new rent will be ₹${Math.abs(diff)} lower.`;
      }
    }
    
    // Add bed assignment info
    if (newStatus === 'approved' && requestData.assigned_bed_number) {
      notification.message += ` Bed number ${requestData.assigned_bed_number} has been assigned to you.`;
    }
    
    console.log('📨 Notification details:', notification);
    
    // Insert notification into database
    const [result] = await db.query(
      `INSERT INTO notifications (
        recipient_id,
        recipient_type,
        title,
        message,
        notification_type,
        related_entity_type,
        related_entity_id,
        priority,
        is_read,
        created_at
      ) VALUES (?, 'tenant', ?, ?, 'change_bed', 'change_bed', ?, ?, 0, NOW())`,
      [
        tenantId,
        notification.title,
        notification.message,
        requestId,
        newStatus === 'approved' ? 'high' : (newStatus === 'rejected' ? 'medium' : 'low')
      ]
    );
    
    console.log(`✅ Notification created with ID: ${result.insertId}`);
    return result.insertId;
    
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    throw error;
  }
}
}

module.exports = new TenantNotificationController();