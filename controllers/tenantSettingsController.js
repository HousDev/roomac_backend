// controllers/tenantSettingsController.js - UPDATED VERSION
const db = require('../config/db');
const bcrypt = require("bcrypt");


const TenantSettingsController = {
  // Get notification preferences
  async getNotificationPreferences(req, res) {
    try {
      const tenantId = req.user.id;

      const [preferences] = await db.query(
        'SELECT * FROM tenant_notification_preferences WHERE tenant_id = ?',
        [tenantId]
      );

      if (preferences.length === 0) {
        // Return default preferences
        return res.json({
          success: true,
          data: {
            emailNotifications: true,
            paymentReminders: true,
            maintenanceUpdates: true,
            generalAnnouncements: true
          }
        });
      }

      const pref = preferences[0];
      res.json({
        success: true,
        data: {
          emailNotifications: !!pref.email_notifications,
          paymentReminders: !!pref.payment_reminders,
          maintenanceUpdates: !!pref.maintenance_updates,
          generalAnnouncements: !!pref.general_announcements
        }
      });
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences'
      });
    }
  },

  // Update notification preferences
  async updateNotificationPreferences(req, res) {
    try {
      const tenantId = req.user.id;
      const { 
        emailNotifications, 
        paymentReminders, 
        maintenanceUpdates, 
        generalAnnouncements 
      } = req.body;

      // Check if preferences exist
      const [existing] = await db.query(
        'SELECT id FROM tenant_notification_preferences WHERE tenant_id = ?',
        [tenantId]
      );

      if (existing.length > 0) {
        // Update existing
        await db.query(
          `UPDATE tenant_notification_preferences 
           SET email_notifications = ?, 
               payment_reminders = ?, 
               maintenance_updates = ?, 
               general_announcements = ?,
               updated_at = NOW()
           WHERE tenant_id = ?`,
          [
            emailNotifications ? 1 : 0,
            paymentReminders ? 1 : 0,
            maintenanceUpdates ? 1 : 0,
            generalAnnouncements ? 1 : 0,
            tenantId
          ]
        );
      } else {
        // Insert new
        await db.query(
          `INSERT INTO tenant_notification_preferences 
           (tenant_id, email_notifications, payment_reminders, maintenance_updates, general_announcements)
           VALUES (?, ?, ?, ?, ?)`,
          [
            tenantId,
            emailNotifications ? 1 : 0,
            paymentReminders ? 1 : 0,
            maintenanceUpdates ? 1 : 0,
            generalAnnouncements ? 1 : 0
          ]
        );
      }

      res.json({
        success: true,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences'
      });
    }
  },

// Update changePassword method - REMOVE tenant status changes
async changePassword(req, res) {
  try {
    console.log('🔐 Password change request received');
    
    const tenantId = req.user?.id || req.user?.tenantId;
    const { currentPassword, newPassword } = req.body;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log('🔐 Password change for tenant:', tenantId);

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get tenant credentials
    const [credentials] = await db.query(
      `SELECT tc.* 
       FROM tenant_credentials tc
       WHERE tc.tenant_id = ? AND tc.is_active = 1`,
      [tenantId]
    );

    if (credentials.length === 0) {
      console.error('❌ No active credentials found for tenant:', tenantId);
      return res.status(400).json({
        success: false,
        message: 'No active credentials found for this account'
      });
    }

    const cred = credentials[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, cred.password_hash);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ONLY update password, don't touch tenant status
    await db.query(
      'UPDATE tenant_credentials SET password_hash = ?, updated_at = NOW() WHERE tenant_id = ?',
      [hashedPassword, tenantId]
    );

    console.log('✅ Password updated successfully for tenant:', tenantId);

    // Create notification for tenant
    await db.query(
      `INSERT INTO notifications 
       (recipient_id, recipient_type, title, message, notification_type, related_entity_type, related_entity_id, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        'tenant',
        'Password Changed Successfully',
        'Your password has been changed successfully. You can now login with your new password.',
        'password_changed',
        'account',
        tenantId,
        'medium'
      ]
    );

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password: ' + error.message
    });
  }
},


// Update requestAccountDeletion method - DON'T change tenant status
async requestAccountDeletion(req, res) {
  try {
    const tenantId = req.user?.id || req.user?.tenantId;
    const { reason } = req.body;

    console.log('🗑️ Deletion request from tenant:', tenantId);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for deletion request'
      });
    }

    // Check if already has pending request
    const [existingRequest] = await db.query(
      'SELECT * FROM tenant_deletion_requests WHERE tenant_id = ? AND status = "pending"',
      [tenantId]
    );

    if (existingRequest.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending deletion request'
      });
    }

    // Get tenant details WITH ROOM INFORMATION
    const [tenant] = await db.query(
      `SELECT 
        t.full_name, 
        t.email, 
        t.is_active,
        t.portal_access_enabled,
        ba.room_id,
        ba.bed_number,
        r.room_number,
        r.property_id,
        p.name as property_name
       FROM tenants t
       LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
       LEFT JOIN rooms r ON ba.room_id = r.id
       LEFT JOIN properties p ON r.property_id = p.id
       WHERE t.id = ?`,
      [tenantId]
    );

    if (tenant.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const tenantData = tenant[0];
    
    // Get room information
    let roomInfo = 'Not Assigned';
    if (tenantData.room_number) {
      roomInfo = `Room ${tenantData.room_number}`;
      if (tenantData.bed_number) {
        roomInfo += `, Bed ${tenantData.bed_number}`;
      }
    }
    
    const propertyName = tenantData.property_name || 'Not Assigned';

    // Insert into deletion requests table
    const [result] = await db.query(
      `INSERT INTO tenant_deletion_requests 
       (tenant_id, reason, status)
       VALUES (?, ?, 'pending')`,
      [tenantId, reason.trim()]
    );

    // DO NOT CHANGE TENANT STATUS HERE - Only admin should change it
    // Tenant remains active until admin approves deletion

    // ✅ Create notification for admin
    await db.query(
      `INSERT INTO notifications 
       (recipient_id, recipient_type, title, message, notification_type, related_entity_type, related_entity_id, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        1, // Admin ID
        'admin',
        '📋 Tenant Account Deletion Request',
        `Tenant: ${tenantData.full_name} (${tenantData.email})\n\nReason: ${reason}\n\nProperty: ${propertyName}\nRoom: ${roomInfo}\n\nClick to review the request.`,
        'tenant_deletion_request',
        'tenant',
        tenantId,
        'high'
      ]
    );

    // Also create notification for tenant
    await db.query(
      `INSERT INTO notifications 
       (recipient_id, recipient_type, title, message, notification_type, related_entity_type, related_entity_id, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        'tenant',
        'Account Deletion Request Submitted',
        'Your account deletion request has been submitted. The property manager will review your request. Your account remains active until approval.',
        'deletion_request_submitted',
        'account',
        tenantId,
        'medium'
      ]
    );

    console.log('✅ Deletion request created with ID:', result.insertId);

    res.json({
      success: true,
      message: 'Deletion request submitted successfully. Property manager will review your request. Your account remains active until approval.'
    });
  } catch (error) {
    console.error('❌ Error requesting account deletion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit deletion request: ' + error.message
    });
  }
}

,
  // Cancel deletion request
async cancelDeletionRequest(req, res) {
  try {
    const tenantId = req.user?.id || req.user?.tenantId;

    console.log('❌ Cancelling deletion request for tenant:', tenantId);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if has pending request
    const [request] = await db.query(
      'SELECT * FROM tenant_deletion_requests WHERE tenant_id = ? AND status = "pending"',
      [tenantId]
    );

    if (request.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending deletion request found'
      });
    }

    // Get tenant details
    const [tenant] = await db.query(
      'SELECT full_name, email FROM tenants WHERE id = ?',
      [tenantId]
    );

    const tenantData = tenant[0];

    // Update deletion request status
    await db.query(
      `UPDATE tenant_deletion_requests 
       SET status = 'cancelled',
           reviewed_at = NOW()
       WHERE tenant_id = ? AND status = 'pending'`,
      [tenantId]
    );

    // DO NOT CHANGE TENANT STATUS - It should already be active

    // Create notification for admin about cancellation
    await db.query(
      `INSERT INTO notifications 
       (recipient_id, recipient_type, title, message, notification_type, related_entity_type, related_entity_id, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        1, // Admin ID
        'admin',
        'Tenant Deletion Request Cancelled',
        `Tenant ${tenantData.full_name} (${tenantData.email}) has cancelled their account deletion request.`,
        'tenant_deletion_cancelled',
        'tenant',
        tenantId,
        'medium'
      ]
    );

    // Create notification for tenant
    await db.query(
      `INSERT INTO notifications 
       (recipient_id, recipient_type, title, message, notification_type, related_entity_type, related_entity_id, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        'tenant',
        'Deletion Request Cancelled',
        'Your account deletion request has been cancelled.',
        'deletion_request_cancelled',
        'account',
        tenantId,
        'medium'
      ]
    );

    console.log('✅ Deletion request cancelled for tenant:', tenantId);

    res.json({
      success: true,
      message: 'Deletion request cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error cancelling deletion request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel deletion request: ' + error.message
    });
  }
},

  // Get deletion status
  async getDeletionStatus(req, res) {
    try {
      const tenantId = req.user.id;

      const [request] = await db.query(
        `SELECT dr.*, u.email as reviewed_by_email, 
                (SELECT email FROM tenants WHERE id = dr.tenant_id) as tenant_email
         FROM tenant_deletion_requests dr
         LEFT JOIN users u ON dr.reviewed_by = u.id
         WHERE dr.tenant_id = ?
         ORDER BY dr.requested_at DESC
         LIMIT 1`,
        [tenantId]
      );

      if (request.length === 0) {
        return res.json({
          success: true,
          data: {
            status: 'none',
            reason: null,
            requested_at: null,
            reviewed_by: null
          }
        });
      }

      const reqData = request[0];
      
      res.json({
        success: true,
        data: {
          reason: reqData.reason,
          status: reqData.status,
          requested_at: reqData.requested_at,
          reviewed_at: reqData.reviewed_at,
          reviewed_by: reqData.reviewed_by_email,
          review_notes: reqData.review_notes
        }
      });
    } catch (error) {
      console.error('Error getting deletion status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get deletion status'
      });
    }
  },

  // Logout
  async logout(req, res) {
    try {
      console.log('👋 Tenant logging out');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  },

  // Test endpoint
  async test(req, res) {
    try {
      res.json({
        success: true,
        message: 'Tenant settings API is working'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Test failed'
      });
    }
  }
};

module.exports = TenantSettingsController;