// const express = require("express");
// const router = express.Router();
// const paymentController = require("../controllers/payment.Controller");

// // Payment routes
// router.post("/", paymentController.createPayment);
// router.get("/", paymentController.getAllPayments);
// router.get("/stats", paymentController.getPaymentStats);
// router.get("/:id", paymentController.getPayment);
// router.patch("/:id/status", paymentController.updatePaymentStatus);

// module.exports = router;


// payment.Routes.js
// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.Controller");

// Test route
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Payment routes are working",
    timestamp: new Date().toISOString()
  });
});

// DEMAND PAYMENT ROUTES - Put these FIRST (before any :id routes)
router.post("/demands", paymentController.createDemandPayment);
router.get("/demands", paymentController.getDemands);
router.get("/demands/:id", paymentController.getDemandById);
router.patch("/demands/:id/status", paymentController.updateDemandStatus);
router.get("/tenant/:tenantId/demands", paymentController.getTenantPendingDemands);

// Payment CRUD routes
router.post("/", paymentController.createPayment);
router.get("/", paymentController.getAllPayments);
router.get("/stats", paymentController.getPaymentStats);
router.get("/receipts", paymentController.getReceipts);
router.get("/receipts/:id", paymentController.getReceiptById);
router.get("/receipts/:id/preview", paymentController.previewReceipt);
router.get("/receipts/:id/download", paymentController.downloadReceipt);

// Tenant specific routes
router.get("/tenant/:tenantId", paymentController.getPaymentsByTenant);
router.get("/tenant/:tenantId/payment-form", paymentController.getTenantPaymentFormData);

// Booking specific routes
router.get("/booking/:bookingId", paymentController.getPaymentsByBooking);

// Payment action routes
router.post("/:id/approve", paymentController.approvePayment);
router.post("/:id/reject", paymentController.rejectPayment);
router.put("/:id", paymentController.updatePayment);
router.delete("/:id", paymentController.deletePayment);


// Individual payment routes - Put these LAST
router.get("/:id", paymentController.getPayment);
router.post("/:id/proof", paymentController.uploadPaymentProof);
router.get("/:id/proof", paymentController.getPaymentProof);

// Notification routes
router.post("/notifications", paymentController.createAdminNotification);
router.get("/tenant/:tenantId/security-deposit", paymentController.getSecurityDepositInfo);

module.exports = router;