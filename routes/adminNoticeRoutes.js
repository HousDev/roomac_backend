const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const controller = require("../controllers/adminNoticeController");

// Get all notice requests
router.get("/", adminAuth, controller.getNoticeRequests);

// Create new notice request
router.post("/", adminAuth, controller.createNoticeRequest);

// Update notice request status
router.put("/:id", adminAuth, controller.updateNoticeRequest);

// Bulk delete notice requests
router.post("/bulk-delete", adminAuth, controller.bulkDeleteNoticeRequests);

module.exports = router;