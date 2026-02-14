// const express = require("express");
// const router = express.Router();
// const bookingController = require("../controllers/bookingController");
// const paymentController = require("../controllers/paymentController");

// // Booking routes
// router.post("/", bookingController.createBooking);
// router.get("/", bookingController.getAllBookings);
// router.get("/stats", bookingController.getBookingStats);
// router.get("/check-availability", bookingController.checkAvailability);
// router.get("/tenant", bookingController.getBookingsByTenant);
// router.get("/property/:propertyId", bookingController.getBookingsByProperty);
// router.get("/:id", bookingController.getBooking);
// router.patch("/:id/status", bookingController.updateBookingStatus);
// router.post("/:id/cancel", bookingController.cancelBooking);

// // Payment routes within bookings
// router.get("/:bookingId/payments", paymentController.getPaymentsByBooking);

// module.exports = router;

const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

router.post("/", bookingController.createBooking);

router.get("/stats", bookingController.getBookingStats);
router.get("/check-availability", bookingController.checkAvailability);
router.get("/tenant", bookingController.getBookingsByTenant);
router.get("/property/:propertyId", bookingController.getBookingsByProperty);

router.get("/", bookingController.getAllBookings);
router.get("/:id", bookingController.getBooking);
router.patch("/:id/status", bookingController.updateBookingStatus);
router.post("/:id/cancel", bookingController.cancelBooking);

module.exports = router;
