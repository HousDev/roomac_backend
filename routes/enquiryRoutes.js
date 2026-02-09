const express = require("express");
const router = express.Router();
const enquiryController = require("../controllers/enquiryController");

// Get all enquiries (with optional filters)
// GET /api/enquiries?status=new&assigned_to=1&search=john
router.get("/", enquiryController.getEnquiries);

// Get enquiry statistics
router.get("/stats", enquiryController.getEnquiryStats);

// Get single enquiry by ID
router.get("/:id", enquiryController.getEnquiryById);

// Create new enquiry
router.post("/", enquiryController.createEnquiry);

// Update enquiry
router.put("/:id", enquiryController.updateEnquiry);

// Delete enquiry
router.delete("/:id", enquiryController.deleteEnquiry);

// Get followups for enquiry
router.get("/:id/followups", enquiryController.getFollowups);

// Add followup to enquiry
router.post("/:id/followups", enquiryController.addFollowup);

module.exports = router;
