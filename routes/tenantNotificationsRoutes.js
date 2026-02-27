const router = require("express").Router();
const tenantAuth = require("../middleware/tenantAuth");
const controller = require("../controllers/tenantNotificationController");
const db = require("../config/db")
// Get tenant notifications
router.get("/", tenantAuth, controller.getNotifications.bind(controller));

// Get unread count
router.get("/unread-count", tenantAuth, controller.getUnreadCount.bind(controller));

// Mark notification as read
router.put("/:id/read", tenantAuth, controller.markAsRead.bind(controller));

// Mark all as read
router.put("/mark-all-read", tenantAuth, controller.markAllAsRead.bind(controller));
// Add this temporarily to your tenantNotificationsRoutes.js
router.get("/debug/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const [notifications] = await db.query(
      `SELECT * FROM notifications 
       WHERE recipient_id = ? AND recipient_type = 'tenant'
       ORDER BY created_at DESC`,
      [tenantId]
    );
    
    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;