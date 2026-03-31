// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const paymentController = require("../controllers/payment.Controller");
const upload = require("../middleware/uploadDocument").upload; // Import the upload middleware

// router.post("/", bookingController.createBooking);
// Use upload middleware for booking creation
router.post("/", upload.fields([
  { name: 'id_proof_url', maxCount: 1 },
  { name: 'address_proof_url', maxCount: 1 },
  { name: 'partner_id_proof_url', maxCount: 1 },
  { name: 'partner_address_proof_url', maxCount: 1 }
]), bookingController.createBooking);
router.get("/", bookingController.getAllBookings);
router.get("/stats", bookingController.getBookingStats);
router.get("/check-availability", bookingController.checkAvailability);
router.get("/tenant", bookingController.getBookingsByTenant);
router.get("/property/:propertyId", bookingController.getBookingsByProperty);

router.get("/", bookingController.getAllBookings);
router.get("/:id", bookingController.getBooking);
router.patch("/:id/status", bookingController.updateBookingStatus);
router.post("/:id/cancel", bookingController.cancelBooking);
// // Payment routes within bookings
router.get("/:bookingId/payments", paymentController.getPaymentsByBooking);

module.exports = router;
