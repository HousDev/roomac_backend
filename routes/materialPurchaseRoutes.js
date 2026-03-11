const express = require("express");
const router = express.Router();
const materialPurchaseController = require("../controllers/materialPurchaseController");

// GET /api/material-purchases/stats
router.get("/stats", materialPurchaseController.getPurchaseStats);

// GET /api/material-purchases?property_id=1&payment_status=Paid&search=abc
router.get("/", materialPurchaseController.getPurchases);

// GET /api/material-purchases/:id
router.get("/:id", materialPurchaseController.getPurchaseById);

// POST /api/material-purchases
router.post("/", materialPurchaseController.createPurchase);

// PUT /api/material-purchases/:id
router.put("/:id", materialPurchaseController.updatePurchase);

// POST /api/material-purchases/:id/payments
router.post("/:id/payments", materialPurchaseController.addPayment);

// DELETE /api/material-purchases/bulk
router.delete("/bulk", materialPurchaseController.bulkDeletePurchases);

// DELETE /api/material-purchases/:id
router.delete("/:id", materialPurchaseController.deletePurchase);

module.exports = router;