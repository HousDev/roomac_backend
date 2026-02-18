// routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/', (req, res) =>
  notificationController.getNotifications(
    { params: { recipient_type: 'admin', recipient_id: 1 }, query: req.query },
    res
  )
);

router.get('/unread-count', (req, res) =>
  notificationController.getUnreadCount(
    { params: { recipient_type: 'admin', recipient_id: 1 } },
    res
  )
);

router.put('/:id/read', notificationController.markAsRead);

router.put('/read-all', (req, res) =>
  notificationController.markAllAsRead(
    { params: { recipient_type: 'admin', recipient_id: 1 } },
    res
  )
);

router.get('/stats', (req, res) => notificationController.getStats({ params: { recipient_type: 'admin', recipient_id: 1 } }, res));
router.get('/test', (req, res) => res.json({ success: true, message: 'API working' }));
router.post('/test-notification', async (req, res) => {
  try {
    const db = require('../config/db');
    const [result] = await db.query(`INSERT INTO notifications SET ?`, [{
      recipient_id: 1, recipient_type: 'admin', title: req.body.title || "Test",
      message: req.body.message || "Test message", notification_type: 'test',
      related_entity_type: 'test', related_entity_id: Math.floor(Math.random() * 1000),
      priority: 'medium', is_read: 0, created_at: new Date()
    }]);
    res.json({ success: true, notification_id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/debug/all', async (req, res) => {
  try {
    const db = require('../config/db');
    const [notifications] = await db.query(`SELECT n.* FROM notifications n ORDER BY n.created_at DESC`);
    res.json({ success: true, data: { notifications } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;