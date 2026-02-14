const Payment = require("../models/PaymentModel");
const Booking = require("../models/BookingModel");

const paymentController = {
  // Create a new payment
  async createPayment(req, res) {
    try {
      const paymentData = req.body;
      
      if (!paymentData.booking_id || !paymentData.amount || !paymentData.payment_mode) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      const newPayment = await Payment.create(paymentData);
      
      // Update booking payment status
      if (paymentData.status === 'completed') {
        await Booking.updatePaymentStatus(paymentData.booking_id, 'paid');
      }

      res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: newPayment
      });

    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create payment",
        error: error.message
      });
    }
  },

  // Get payment by ID
  async getPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found"
        });
      }

      res.status(200).json({
        success: true,
        data: payment
      });

    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment",
        error: error.message
      });
    }
  },

  // Get all payments
  async getAllPayments(req, res) {
    try {
      const filters = {
        status: req.query.status,
        payment_mode: req.query.payment_mode,
        booking_id: req.query.booking_id,
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const payments = await Payment.getAll(filters);
      
      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments
      });

    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
        error: error.message
      });
    }
  },

  // Get payments by booking
  async getPaymentsByBooking(req, res) {
    try {
      const { bookingId } = req.params;
      const payments = await Payment.findByBooking(bookingId);
      
      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments
      });

    } catch (error) {
      console.error("Error fetching booking payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking payments",
        error: error.message
      });
    }
  },

  // Update payment status
  async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, transaction_id } = req.body;

      const updated = await Payment.updateStatus(id, status, transaction_id);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Payment not found"
        });
      }

      // Get payment details to update booking
      const payment = await Payment.findById(id);
      
      if (payment && payment.booking_id) {
        if (status === 'completed') {
          await Booking.updatePaymentStatus(payment.booking_id, 'paid');
        } else if (status === 'failed') {
          await Booking.updatePaymentStatus(payment.booking_id, 'failed');
        } else if (status === 'refunded') {
          // Keep as paid but you might want to add a refunded status
          await Booking.updatePaymentStatus(payment.booking_id, 'paid');
        }
      }

      res.status(200).json({
        success: true,
        message: "Payment status updated successfully"
      });

    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment status",
        error: error.message
      });
    }
  },

  // Get payment statistics
  async getPaymentStats(req, res) {
    try {
      const { propertyId } = req.query;
      const stats = await Payment.getStats(propertyId);
      
      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error("Error fetching payment stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment statistics",
        error: error.message
      });
    }
  }
};

module.exports = paymentController;