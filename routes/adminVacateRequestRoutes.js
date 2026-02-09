// routes/adminVacateRequestRoutes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const controller = require("../controllers/adminVacateRequestController");

// Apply admin authentication to all routes
router.use(adminAuth);

// Get all vacate requests (with optional filters)
// Example: GET /api/admin/vacate-requests?status=pending&property_id=1&search=john
router.get("/", controller.getAllVacateRequests);

// Get single vacate request by ID
router.get("/:id", controller.getVacateRequestById);

// Update vacate request status
// Example: PUT /api/admin/vacate-requests/1/status
router.put("/:id/status", controller.updateVacateRequestStatus);

// Get statistics
router.get("/stats/summary", controller.getVacateRequestStats);

// Get properties for filter dropdown
router.get("/properties/filter", controller.getPropertiesForFilter);

module.exports = router;