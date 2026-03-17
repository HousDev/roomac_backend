// routes/noticePeriodRequestRoutes.js
const express = require("express");
const router = express.Router();
const NoticePeriodRequestController = require("../controllers/noticePeriodRequestController");
const adminAuth = require("../middleware/adminAuth");
const tenantAuth = require("../middleware/tenantAuth");

// ========== ADMIN ROUTES ==========
router.get("/admin", adminAuth, NoticePeriodRequestController.list);
router.post("/admin", adminAuth, NoticePeriodRequestController.create);
router.get("/admin/unseen/count", adminAuth, NoticePeriodRequestController.getUnseenCount);
router.delete("/admin/:id", adminAuth, NoticePeriodRequestController.delete);

// ========== TENANT ROUTES ==========
router.get("/tenant/unseen", tenantAuth, NoticePeriodRequestController.getTenantUnseenCount);
router.patch("/tenant/:id/seen", tenantAuth, NoticePeriodRequestController.markAsSeen);

module.exports = router;