// const Payment = require("../models/PaymentModel");
// const Booking = require("../models/BookingModel");

// const paymentController = {
//   // Create a new payment
//   async createPayment(req, res) {
//     try {
//       const paymentData = req.body;

//       // ✅ FIX: booking_id is DEFAULT NULL in DB — removed from required check
//       if (!paymentData.amount || !paymentData.payment_mode) {
//         return res.status(400).json({
//           success: false,
//           message: "Missing required fields: amount and payment_mode are required"
//         });
//       }

//       // ✅ FIX: Ensure booking_id is null (not empty string) if not provided
//       if (!paymentData.booking_id || paymentData.booking_id === '') {
//         paymentData.booking_id = null;
//       }

//       const newPayment = await Payment.create(paymentData);

//       // Only update booking payment status if booking_id exists
//       if (paymentData.booking_id && paymentData.status === 'completed') {
//         await Booking.updatePaymentStatus(paymentData.booking_id, 'paid');
//       }

//       res.status(201).json({
//         success: true,
//         message: "Payment created successfully",
//         data: newPayment
//       });

//     } catch (error) {
//       console.error("Error creating payment:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to create payment",
//         error: error.message
//       });
//     }
//   },

//   // Get payment by ID
//   async getPayment(req, res) {
//     try {
//       const { id } = req.params;
//       const payment = await Payment.findById(id);

//       if (!payment) {
//         return res.status(404).json({
//           success: false,
//           message: "Payment not found"
//         });
//       }

//       res.status(200).json({
//         success: true,
//         data: payment
//       });

//     } catch (error) {
//       console.error("Error fetching payment:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch payment",
//         error: error.message
//       });
//     }
//   },

//   // Get all payments
//   async getAllPayments(req, res) {
//     try {
//       const filters = {
//         status: req.query.status,
//         payment_mode: req.query.payment_mode,
//         booking_id: req.query.booking_id,
//         tenant_id: req.query.tenant_id,
//         start_date: req.query.start_date,
//         end_date: req.query.end_date
//       };

//       const payments = await Payment.getAll(filters);

//       res.status(200).json({
//         success: true,
//         count: payments.length,
//         data: payments
//       });

//     } catch (error) {
//       console.error("Error fetching payments:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch payments",
//         error: error.message
//       });
//     }
//   },

//   // Get payments by booking
//   async getPaymentsByBooking(req, res) {
//     try {
//       const { bookingId } = req.params;
//       const payments = await Payment.findByBooking(bookingId);

//       res.status(200).json({
//         success: true,
//         count: payments.length,
//         data: payments
//       });

//     } catch (error) {
//       console.error("Error fetching booking payments:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch booking payments",
//         error: error.message
//       });
//     }
//   },

//   // Update payment status
//   async updatePaymentStatus(req, res) {
//     try {
//       const { id } = req.params;
//       const { status, transaction_id } = req.body;

//       const updated = await Payment.updateStatus(id, status, transaction_id);

//       if (!updated) {
//         return res.status(404).json({
//           success: false,
//           message: "Payment not found"
//         });
//       }

//       // Only update booking if payment has a booking_id
//       const payment = await Payment.findById(id);

//       if (payment && payment.booking_id) {
//         if (status === 'completed') {
//           await Booking.updatePaymentStatus(payment.booking_id, 'paid');
//         } else if (status === 'failed') {
//           await Booking.updatePaymentStatus(payment.booking_id, 'failed');
//         } else if (status === 'refunded') {
//           await Booking.updatePaymentStatus(payment.booking_id, 'paid');
//         }
//       }

//       res.status(200).json({
//         success: true,
//         message: "Payment status updated successfully"
//       });

//     } catch (error) {
//       console.error("Error updating payment status:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to update payment status",
//         error: error.message
//       });
//     }
//   },

//   // Get payment statistics
//   async getPaymentStats(req, res) {
//     try {
//       const { propertyId } = req.query;
//       const stats = await Payment.getStats(propertyId);

//       res.status(200).json({
//         success: true,
//         data: stats
//       });

//     } catch (error) {
//       console.error("Error fetching payment stats:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch payment statistics",
//         error: error.message
//       });
//     }
//   }
// };

// module.exports = paymentController;


// controllers/payment.Controller.js 
const Payment = require("../models/PaymentModel");
const Booking = require("../models/BookingModel");
const db = require("../config/db");
const { uploadProof } = require("../middleware/paymentUpload"); 

const paymentController = {
  // Create a new payment
  async createPayment(req, res) {
    try {
      const paymentData = req.body;

      if (!paymentData.amount || !paymentData.payment_mode) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: amount and payment_mode are required"
        });
      }

      // Handle booking_id
      if (!paymentData.booking_id || paymentData.booking_id === '') {
        paymentData.booking_id = null;
      }

      // Set payment_type if not provided
      if (!paymentData.payment_type) {
        paymentData.payment_type = 'rent';
      }

      const newPayment = await Payment.create(paymentData);

      // Update booking payment status if needed
      if (paymentData.booking_id && paymentData.status === 'completed') {
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
        payment_type: req.query.payment_type,
        booking_id: req.query.booking_id,
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        month: req.query.month,
        year: req.query.year
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

  // Get payments by tenant
  async getPaymentsByTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const payments = await Payment.findByTenant(tenantId);

      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments
      });

    } catch (error) {
      console.error("Error fetching tenant payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tenant payments",
        error: error.message
      });
    }
  },

  // Get tenant rent summary
  async getTenantRentSummary(req, res) {
    try {
      const { tenantId } = req.params;
      const summary = await Payment.getTenantRentSummary(tenantId);

      res.status(200).json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error("Error fetching tenant rent summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tenant rent summary",
        error: error.message
      });
    }
  },

  // Get month-wise rent history
  async getMonthWiseRentHistory(req, res) {
    try {
      const { tenantId } = req.params;
      const { months = 6 } = req.query;
      
      const history = await Payment.getMonthWiseRentHistory(tenantId, parseInt(months));

      res.status(200).json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error("Error fetching month-wise rent history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch month-wise rent history",
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

      // Get payment details for booking update
      const payment = await Payment.findById(id);

      if (payment && payment.booking_id) {
        if (status === 'completed') {
          await Booking.updatePaymentStatus(payment.booking_id, 'paid');
        } else if (status === 'failed') {
          await Booking.updatePaymentStatus(payment.booking_id, 'failed');
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
      const { propertyId, tenantId } = req.query;
      const stats = await Payment.getStats(propertyId, tenantId);

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
  },

  // Get pending payments
  async getPendingPayments(req, res) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        overdue_only: req.query.overdue_only === 'true'
      };

      const payments = await Payment.getPendingPayments(filters);

      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments
      });

    } catch (error) {
      console.error("Error fetching pending payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending payments",
        error: error.message
      });
    }
  },


  // Upload payment proof
  async uploadPaymentProof(req, res) {
    try {
      const { id } = req.params;
      
      // Use the imported uploadProof middleware
      uploadProof(req, res, async function(err) {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No file uploaded"
          });
        }
        
        const proofUrl = `/uploads/payment-proofs/${req.file.filename}`;
        
        // Update payment record with proof path
        const [result] = await db.execute(
          `UPDATE payments 
           SET payment_proof = ?, proof_uploaded_at = NOW() 
           WHERE id = ?`,
          [proofUrl, id]
        );
        
        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Payment not found"
          });
        }
        
        res.json({
          success: true,
          message: "Payment proof uploaded successfully",
          data: {
            proof_url: proofUrl
          }
        });
      });
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload payment proof"
      });
    }
  },

// Get payment proof
 // Get payment proof
  async getPaymentProof(req, res) {
    try {
      const { id } = req.params;
      
      const [rows] = await db.execute(
        "SELECT payment_proof FROM payments WHERE id = ?",
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Payment not found"
        });
      }
      
      res.json({
        success: true,
        data: {
          proof_url: rows[0].payment_proof
        }
      });
    } catch (error) {
      console.error("Error fetching payment proof:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment proof"
      });
    }
  }

};

module.exports = paymentController;