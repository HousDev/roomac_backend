const express = require("express");
const router = express.Router();
const tenantAuth = require("../middleware/tenantAuth");

// Import controller correctly
const TenantDetailsController = require("../controllers/tenantDetailsController");
const { uploadDocument } = require("../controllers/tenantController");

// Profile routes (authenticated)
router.get("/profile", tenantAuth, (req, res) => {
  TenantDetailsController.getProfileByToken(req, res);
});

// Profile update (authenticated)
router.patch("/profile", tenantAuth, (req, res) => {
  TenantDetailsController.updateProfile(req, res);
});

// Profile routes (by ID - for admin or fallback)
router.get("/profile/:tenantId", (req, res) => {
  TenantDetailsController.getProfile(req, res);
});

// Profile update by ID
router.patch("/profile/:tenantId", (req, res) => {
  TenantDetailsController.updateProfile(req, res);
});

router.get('/bed-history', tenantAuth, TenantDetailsController.getBedAssignmentHistory);
router.get('/bed-history/:tenantId', TenantDetailsController.getBedAssignmentHistory);

router.get('/additional-documents', tenantAuth, TenantDetailsController.getAdditionalDocuments);
router.get('/additional-documents/:tenantId', TenantDetailsController.getAdditionalDocuments);

module.exports = router;