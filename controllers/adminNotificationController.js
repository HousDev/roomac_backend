// controllers/notificationController.js
const NotificationModel = require('../models/notificationModel');

class NotificationController {
  // Create notification (POST /api/notifications)
  async createNotification(req, res) {
    try {
      console.log('📝 POST /api/notifications', req.body);
      
      const requiredFields = ['recipient_id', 'recipient_type', 'title', 'message'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          debug: {
            received_body: req.body,
            required_fields: requiredFields
          }
        });
      }

      const notificationId = await NotificationModel.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: { id: notificationId },
        debug: {
          inserted_id: notificationId,
          recipient: `${req.body.recipient_type} ${req.body.recipient_id}`
        }
      });
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification',
        error: error.message,
        debug: {
          stack: error.stack,
          body_received: req.body
        }
      });
    }
  }

  // Get notifications for recipient (GET /api/notifications/:recipient_type/:recipient_id)
  async getNotifications(req, res) {
    try {
      console.log('🔍 GET /api/notifications/:recipient_type/:recipient_id', {
        params: req.params,
        query: req.query
      });

      const { recipient_type, recipient_id } = req.params;
      const filters = { ...req.query };

      // Validate recipient_type
      if (!['admin', 'tenant'].includes(recipient_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid recipient_type. Must be "admin" or "tenant"',
          debug: {
            received: recipient_type,
            valid_values: ['admin', 'tenant']
          }
        });
      }

      // Convert string boolean to actual boolean
      if (filters.read_status !== undefined) {
        filters.read_status = filters.read_status === 'true';
      }

      const notifications = await NotificationModel.getByRecipient(
        recipient_type,
        parseInt(recipient_id),
        filters
      );

      res.json({
        success: true,
        data: notifications,
        total: notifications.length,
        debug: {
          recipient: `${recipient_type} ${recipient_id}`,
          filters_applied: filters,
          notification_count: notifications.length
        }
      });
    } catch (error) {
      console.error('❌ Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
        error: error.message,
        debug: {
          params: req.params,
          query: req.query
        }
      });
    }
  }

  // Get unread count (GET /api/notifications/:recipient_type/:recipient_id/unread-count)
  async getUnreadCount(req, res) {
    try {
      console.log('🔔 GET /api/notifications/:recipient_type/:recipient_id/unread-count', req.params);

      const { recipient_type, recipient_id } = req.params;
      
      // Validate recipient_type
      if (!['admin', 'tenant'].includes(recipient_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid recipient_type'
        });
      }

      const count = await NotificationModel.getUnreadCount(
        recipient_type,
        parseInt(recipient_id)
      );

      res.json({
        success: true,
        data: { count },
        debug: {
          recipient: `${recipient_type} ${recipient_id}`,
          unread_count: count
        }
      });
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: error.message
      });
    }
  }

  // Mark notification as read (PUT /api/notifications/:id/read)
  async markAsRead(req, res) {
    try {
      console.log('✅ PUT /api/notifications/:id/read', {
        params: req.params,
        body: req.body
      });

      const { id } = req.params;
      const success = await NotificationModel.markAsRead(parseInt(id));

      if (success) {
        res.json({
          success: true,
          message: 'Notification marked as read',
          debug: {
            notification_id: id,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
          debug: {
            notification_id: id,
            searched_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  }

  // Mark multiple notifications as read (PUT /api/notifications/mark-read)
  async markMultipleAsRead(req, res) {
    try {
      console.log('✅ PUT /api/notifications/mark-read', req.body);

      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Array of notification IDs is required',
          debug: {
            received_body: req.body,
            expected_format: { ids: [1, 2, 3] }
          }
        });
      }

      const count = await NotificationModel.markMultipleAsRead(ids);

      res.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        data: { count },
        debug: {
          notification_ids: ids,
          marked_count: count
        }
      });
    } catch (error) {
      console.error('❌ Error marking multiple notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read',
        error: error.message
      });
    }
  }

  // Mark all notifications as read (PUT /api/notifications/:recipient_type/:recipient_id/read-all)
  async markAllAsRead(req, res) {
    try {
      console.log('✅ PUT /api/notifications/:recipient_type/:recipient_id/read-all', req.params);

      const { recipient_type, recipient_id } = req.params;
      
      // Validate recipient_type
      if (!['admin', 'tenant'].includes(recipient_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid recipient_type'
        });
      }

      const count = await NotificationModel.markAllAsRead(
        recipient_type,
        parseInt(recipient_id)
      );

      res.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        data: { count },
        debug: {
          recipient: `${recipient_type} ${recipient_id}`,
          marked_count: count
        }
      });
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read',
        error: error.message
      });
    }
  }

  // Delete notification (DELETE /api/notifications/:id)
  async deleteNotification(req, res) {
    try {
      console.log('🗑️ DELETE /api/notifications/:id', req.params);

      const { id } = req.params;
      const success = await NotificationModel.delete(parseInt(id));

      if (success) {
        res.json({
          success: true,
          message: 'Notification deleted successfully',
          debug: {
            notification_id: id,
            deleted_at: new Date().toISOString()
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
          debug: {
            notification_id: id
          }
        });
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message
      });
    }
  }

  // Get notification statistics (GET /api/notifications/:recipient_type/:recipient_id/stats)
  async getStats(req, res) {
    try {
      console.log('📊 GET /api/notifications/:recipient_type/:recipient_id/stats', req.params);

      const { recipient_type, recipient_id } = req.params;
      
      // Validate recipient_type
      if (!['admin', 'tenant'].includes(recipient_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid recipient_type'
        });
      }

      const stats = await NotificationModel.getStats(
        recipient_type,
        parseInt(recipient_id)
      );

      res.json({
        success: true,
        data: stats,
        debug: {
          recipient: `${recipient_type} ${recipient_id}`,
          retrieved_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics',
        error: error.message
      });
    }
  }
}

module.exports = new NotificationController();