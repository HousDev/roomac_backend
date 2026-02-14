const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.Controller");

// Payment routes
router.post("/", paymentController.createPayment);
router.get("/", paymentController.getAllPayments);
router.get("/stats", paymentController.getPaymentStats);
router.get("/:id", paymentController.getPayment);
router.patch("/:id/status", paymentController.updatePaymentStatus);

module.exports = router;