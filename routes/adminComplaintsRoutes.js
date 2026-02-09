// routes/adminComplaintsRoutes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const controller = require("../controllers/adminComplaintController");

// Get all complaints
router.get("/", adminAuth, controller.getComplaints);

// Get single complaint by ID
router.get("/:id", adminAuth, controller.getComplaintById);

// Update complaint
router.put("/:id", adminAuth, controller.updateComplaint);

// Get active staff for assigning
router.get("/staff/active", adminAuth, controller.getActiveStaff);

// Get complaint categories
router.get("/categories/all", adminAuth, controller.getComplaintCategories);

module.exports = router;