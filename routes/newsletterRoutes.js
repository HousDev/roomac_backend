// routes/newsletterRoutes.js
const express = require("express");
const router = express.Router();
const newsletterController = require("../controllers/newsletterController");

// Public routes
router.post("/subscribe", newsletterController.subscribe);
router.post("/unsubscribe", newsletterController.unsubscribe);

// Admin routes
router.get("/subscribers", newsletterController.getAllSubscribers);
router.get("/stats", newsletterController.getStats);
router.delete("/subscriber/:id", newsletterController.deleteSubscriber);
router.post("/subscribers/bulk-delete", newsletterController.bulkDeleteSubscribers);

module.exports = router;