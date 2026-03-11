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
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.Controller");

// Payment routes
router.post("/", paymentController.createPayment);
router.get("/", paymentController.getAllPayments);
router.get("/stats", paymentController.getPaymentStats);
router.get("/pending", paymentController.getPendingPayments);
router.get("/tenant/:tenantId/summary", paymentController.getTenantRentSummary);
router.get("/tenant/:tenantId/history", paymentController.getMonthWiseRentHistory);
router.get("/tenant/:tenantId", paymentController.getPaymentsByTenant);
router.get("/booking/:bookingId", paymentController.getPaymentsByBooking);
router.get("/:id", paymentController.getPayment);
router.patch("/:id/status", paymentController.updatePaymentStatus);
// payment.Routes.js
router.post("/:id/proof", paymentController.uploadPaymentProof);
router.get("/:id/proof", paymentController.getPaymentProof);

module.exports = router;