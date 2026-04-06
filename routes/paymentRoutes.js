// routes/paymentRoutes.js
const express = require("express");
const {
  createOrder,
  verifyPayment,
  getRazorpayStatus,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/status", getRazorpayStatus);



module.exports = router;
