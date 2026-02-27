// routes/propertyAnalyticsRoutes.js
const express = require("express");
const router = express.Router();
const PropertyAnalyticsController = require("../controllers/propertyAnalyticsController");

// Public analytics routes (no authentication required)
router.post("/:id/view", PropertyAnalyticsController.incrementView);
router.post("/:id/shortlist", PropertyAnalyticsController.toggleShortlist);
router.get("/:id/analytics", PropertyAnalyticsController.getAnalytics);
router.get("/:id/shortlist-status", PropertyAnalyticsController.getShortlistStatus);
router.get("/analytics/bulk", PropertyAnalyticsController.getBulkAnalytics);

module.exports = router;