// routes/adminReceiptRoutes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const controller = require("../controllers/adminReceiptController");

// Get all receipt requests
router.get("/", adminAuth, controller.getReceiptRequests);

// Update receipt request status (approve/reject)
router.put("/:id", adminAuth, controller.updateReceiptRequest);

// Bulk delete receipt requests
router.post("/bulk-delete", adminAuth, controller.bulkDeleteReceiptRequests);

module.exports = router;