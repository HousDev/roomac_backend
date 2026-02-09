const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth"); // You need to create this middleware
const controller = require("../controllers/tenantRequestController");

// Admin routes for vacate requests
router.get("/vacate-requests", adminAuth, controller.getVacateBedRequests);
router.put("/vacate-requests/:id/status", adminAuth, controller.updateVacateRequestStatus);

module.exports = router;