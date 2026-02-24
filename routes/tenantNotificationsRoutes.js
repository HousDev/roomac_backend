const router = require("express").Router();
const tenantAuth = require("../middleware/tenantAuth");
const controller = require("../controllers/tenantNotificationController");

// Get tenant notifications
router.get("/", tenantAuth, controller.getNotifications.bind(controller));

// Get unread count
router.get("/unread-count", tenantAuth, controller.getUnreadCount.bind(controller));

// Mark notification as read
router.put("/:id/read", tenantAuth, controller.markAsRead.bind(controller));

// Mark all as read
router.put("/mark-all-read", tenantAuth, controller.markAllAsRead.bind(controller));

module.exports = router;