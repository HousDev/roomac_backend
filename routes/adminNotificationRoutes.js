// routes/adminNotificationRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ============================================
// GET ROUTES
// ============================================

// GET /api/admin/notifications - Get admin notifications
router.get('/', async (req, res) => {
  try {
    const { limit = 10, offset = 0, read_status } = req.query;
    
    let sql = `
      SELECT 
        n.*,
        CASE 
          WHEN n.related_entity_type = 'enquiry' THEN 'Enquiry'
          WHEN n.related_entity_type = 'tenant_request' THEN 'Tenant Request'
          WHEN n.related_entity_type = 'vacate_request' THEN 'Vacate Request'
          ELSE n.related_entity_type
        END as request_type
      FROM notifications n
      WHERE n.recipient_type = 'admin' AND n.recipient_id = 1
    `;
    
    const params = [];
    
    if (read_status !== undefined) {
      sql += ' AND n.is_read = ?';
      params.push(read_status === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [notifications] = await db.query(sql, params);
    
    // Parse metadata if it exists
    const parsedNotifications = notifications.map(notif => ({
      ...notif,
      is_read: notif.is_read === 1,
      metadata: notif.metadata ? JSON.parse(notif.metadata) : null
    }));
    
    res.json({
      success: true,
      data: parsedNotifications,
      total: parsedNotifications.length
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/notifications/unread-count - Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE recipient_type = "admin" AND recipient_id = 1 AND is_read = 0',
      []
    );
    
    res.json({
      success: true,
      data: { count: rows[0].count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/notifications/stats - Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN notification_type = 'tenant_request' THEN 1 ELSE 0 END) as tenant_requests,
        SUM(CASE WHEN notification_type = 'vacate_request' THEN 1 ELSE 0 END) as vacate_requests,
        SUM(CASE WHEN notification_type = 'support_ticket' THEN 1 ELSE 0 END) as support_tickets
      FROM notifications 
      WHERE recipient_type = 'admin' AND recipient_id = 1
    `);
    
    // Convert nulls to 0
    const stats = rows[0];
    Object.keys(stats).forEach(key => {
      if (stats[key] === null) stats[key] = 0;
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/test - Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Admin notification API is working',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// POST ROUTES
// ============================================

// routes/adminNotificationRoutes.js

// In the POST / route - remove metadata
router.post('/', async (req, res) => {
  try {
    const {
      recipient_id = 1,
      recipient_type = 'admin',
      title,
      message,
      notification_type = 'general',
      related_entity_type = null,
      related_entity_id = null,
      priority = 'medium'
      // Remove metadata from destructuring
    } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Remove metadata from the INSERT query
    const [result] = await db.query(
      `INSERT INTO notifications 
       (recipient_id, recipient_type, title, message, notification_type, 
        related_entity_type, related_entity_id, priority, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        recipient_id,
        recipient_type,
        title,
        message,
        notification_type,
        related_entity_type,
        related_entity_id,
        priority
      ]
    );

    res.json({
      success: true,
      message: 'Notification created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// In the POST /test-notification route - remove metadata
router.post('/test-notification', async (req, res) => {
  try {
    const { title, message } = req.body; // Remove metadata
    
    const [result] = await db.query(
      `INSERT INTO notifications 
       (recipient_id, recipient_type, title, message, notification_type, 
        related_entity_type, related_entity_id, priority, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        1,
        'admin',
        title || 'Test Notification',
        message || 'This is a test notification',
        'test',
        'test',
        Math.floor(Math.random() * 1000),
        'medium'
      ]
    );

    res.json({
      success: true,
      message: 'Test notification created',
      notification_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// In the POST /enquiry route - remove metadata
router.post('/enquiry', async (req, res) => {
  try {
    const { enquiryData, propertyName } = req.body;
    
    // Create a message string instead of storing metadata
    const detailedMessage = `New enquiry from ${enquiryData.tenant_name} (${enquiryData.tenant_email}, ${enquiryData.tenant_phone}) for ${propertyName}. Budget: ${enquiryData.budget_range || 'Not specified'}, Move-in: ${enquiryData.move_in_date || 'Not specified'}. Message: ${enquiryData.message || 'No message'}`;
    
    const [result] = await db.query(
      `INSERT INTO notifications 
       (recipient_id, recipient_type, title, message, notification_type, 
        related_entity_type, related_entity_id, priority, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        1,
        'admin',
        '🏢 New Enquiry Received',
        detailedMessage, // Store all info in message field
        'enquiry',
        'enquiry',
        enquiryData.id || enquiryData.enquiry_id,
        'medium'
      ]
    );

    res.json({
      success: true,
      message: 'Enquiry notification created',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating enquiry notification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// PUT ROUTES
// ============================================

// PUT /api/admin/notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/admin/notifications/read-all - Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE recipient_type = "admin" AND recipient_id = 1 AND is_read = 0',
      []
    );
    
    res.json({
      success: true,
      message: `Marked ${result.affectedRows} notifications as read`,
      data: { count: result.affectedRows }
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// DEBUG ROUTES
// ============================================

// GET /api/admin/notifications/debug/all - Debug endpoint to see all notifications
router.get('/debug/all', async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
    );
    
    // Parse metadata for each notification
    const parsed = notifications.map(n => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
      is_read: n.is_read === 1
    }));
    
    res.json({
      success: true,
      data: { notifications: parsed },
      count: parsed.length
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;