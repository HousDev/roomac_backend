const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const controller = require("../controllers/adminLeaveRequestController");

// Get all leave requests with filters
router.get("/", adminAuth, controller.getLeaveRequests);

// Get leave statistics
router.get("/statistics", adminAuth, controller.getLeaveStatistics);

// Get single leave request
router.get("/:id", adminAuth, controller.getLeaveRequestById);

// Update leave request status
router.put("/:id/status", adminAuth, controller.updateLeaveRequestStatus);

module.exports = router;