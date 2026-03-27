// routes/partnershipEnquiryRoutes.js
const express = require("express");
const router = express.Router();
const partnershipEnquiryController = require("../controllers/partnershipEnquiryController");

// Get all partnership enquiries (with filters)
router.get("/", partnershipEnquiryController.getPartnershipEnquiries);

// Get partnership stats
router.get("/stats", partnershipEnquiryController.getPartnershipStats);

// Get single partnership enquiry by ID
router.get("/:id", partnershipEnquiryController.getPartnershipEnquiryById);

// Create new partnership enquiry
router.post("/", partnershipEnquiryController.createPartnershipEnquiry);

// Update partnership enquiry
router.put("/:id", partnershipEnquiryController.updatePartnershipEnquiry);

// Delete partnership enquiry
router.delete("/:id", partnershipEnquiryController.deletePartnershipEnquiry);

// Bulk delete partnership enquiries
router.post("/bulk-delete", partnershipEnquiryController.bulkDeletePartnershipEnquiries);

module.exports = router;