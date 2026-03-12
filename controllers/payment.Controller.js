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


// controllers/paymentController.js 
const Payment = require("../models/PaymentModel");
const Booking = require("../models/BookingModel");
const db = require("../config/db");
const { uploadProof } = require("../middleware/paymentUpload");
const PDFDocument = require('pdfkit');

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

      if (!paymentData.tenant_id) {
        return res.status(400).json({
          success: false,
          message: "tenant_id is required"
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

  // Get tenant payment form data
  async getTenantPaymentFormData(req, res) {
    try {
      const { tenantId } = req.params;
      const formData = await Payment.getTenantPaymentFormData(tenantId);

      if (!formData) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found or no active bed assignment"
        });
      }

      res.status(200).json({
        success: true,
        data: formData
      });

    } catch (error) {
      console.error("Error fetching payment form data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment form data",
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

  // Upload payment proof
  async uploadPaymentProof(req, res) {
    try {
      const { id } = req.params;
      
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
  },

  // Get all receipts
  async getReceipts(req, res) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const receipts = await Payment.getReceipts(filters);

      res.status(200).json({
        success: true,
        count: receipts.length,
        data: receipts
      });

    } catch (error) {
      console.error("Error fetching receipts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch receipts",
        error: error.message
      });
    }
  },

  // Get receipt by ID
  async getReceiptById(req, res) {
    try {
      const { id } = req.params;
      const receipt = await Payment.getReceiptById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: "Receipt not found"
        });
      }

      res.status(200).json({
        success: true,
        data: receipt
      });

    } catch (error) {
      console.error("Error fetching receipt:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch receipt",
        error: error.message
      });
    }
  },

  // Preview receipt (HTML)
  async previewReceipt(req, res) {
    try {
      const { id } = req.params;
      const receipt = await Payment.getReceiptById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: "Receipt not found"
        });
      }

      const html = generateReceiptHTML(receipt);
      res.send(html);

    } catch (error) {
      console.error("Error previewing receipt:", error);
      res.status(500).json({
        success: false,
        message: "Failed to preview receipt",
        error: error.message
      });
    }
  },

  // Download receipt as PDF
  async downloadReceipt(req, res) {
    try {
      const { id } = req.params;
      const receipt = await Payment.getReceiptById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: "Receipt not found"
        });
      }

      // Create PDF document with better styling
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: `Payment Receipt #${receipt.id}`,
          Author: 'RoomAC',
          Subject: 'Payment Receipt'
        }
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=receipt-${receipt.id}.pdf`);
      
      doc.pipe(res);
      
      // Generate professional receipt PDF
      await generateProfessionalReceiptPDF(doc, receipt);
      
      doc.end();

    } catch (error) {
      console.error("Error downloading receipt:", error);
      res.status(500).json({
        success: false,
        message: "Failed to download receipt",
        error: error.message
      });
    }
  },

  // Create demand payment
// Add to your existing paymentController object

// Create demand payment
async createDemandPayment(req, res) {
  try {
    const {
      tenant_id,
      amount,
      due_date,
      payment_type,
      description,
      include_late_fee,
      late_fee_amount,
      send_email,
      send_sms
    } = req.body;

    if (!tenant_id || !amount || !due_date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: tenant_id, amount, and due_date are required"
      });
    }

    // Calculate late fee
    const lateFee = include_late_fee ? (late_fee_amount || 0) : 0;
    const totalAmount = amount + lateFee;

    // Create demand payment
    const demandData = {
      tenant_id,
      amount,
      due_date,
      payment_type: payment_type || 'rent',
      description,
      late_fee: lateFee,
      created_by: req.user?.id || null
    };

    const newDemand = await Payment.createDemand(demandData);

    // Create notification for tenant
    if (newDemand) {
      // Build notification message with all details
      let notificationMessage = `Payment request details:\n`;
      notificationMessage += `Base Amount: ₹${amount}\n`;
      if (lateFee > 0) {
        notificationMessage += `Late Fee: ₹${lateFee}\n`;
      }
      notificationMessage += `Total Amount: ₹${totalAmount}\n`;
      notificationMessage += `Due Date: ${new Date(due_date).toLocaleDateString()}\n`;
      if (description) {
        notificationMessage += `Note: ${description}`;
      }

      // Import notification controller
      const notificationController = require('../controllers/tenantNotificationController');
      
      await notificationController.createNotification({
        tenantId: tenant_id,
        title: 'Payment Request',
        message: notificationMessage,
        notificationType: 'payment',
        relatedEntityType: 'demand',
        relatedEntityId: newDemand.id,
        priority: 'high'
      });

      // Log email/SMS preferences
      if (send_email) console.log(`📧 Email notification would be sent to tenant ${tenant_id}`);
      if (send_sms) console.log(`📱 SMS notification would be sent to tenant ${tenant_id}`);
    }

    res.status(201).json({
      success: true,
      message: "Payment demand created successfully",
      data: {
        ...newDemand,
        total_amount: totalAmount,
        base_amount: amount,
        late_fee: lateFee
      }
    });

  } catch (error) {
    console.error("Error creating demand payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment demand",
      error: error.message
    });
  }
},

// Get all demands
// Get all demands
async getDemands(req, res) {
  try {
    const filters = {
      status: req.query.status,
      tenant_id: req.query.tenant_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };

    const demands = await Payment.getDemands(filters);
    
    // Ensure we always return a valid response even if demands is null/undefined
    res.status(200).json({
      success: true,
      count: demands ? demands.length : 0,
      data: demands || [] // Always return an array
    });

  } catch (error) {
    console.error("Error fetching demands:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch demands",
      error: error.message,
      data: [] // Return empty array on error
    });
  }
},

// Get demand by ID
async getDemandById(req, res) {
  try {
    const { id } = req.params;
    const demand = await Payment.getDemandById(id);

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: "Demand not found"
      });
    }

    res.status(200).json({
      success: true,
      data: demand
    });

  } catch (error) {
    console.error("Error fetching demand:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch demand",
      error: error.message
    });
  }
},

// Update demand status
async updateDemandStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await Payment.updateDemandStatus(id, status);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Demand not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Demand status updated successfully"
    });

  } catch (error) {
    console.error("Error updating demand status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update demand status",
      error: error.message
    });
  }
},

// Get tenant pending demands
async getTenantPendingDemands(req, res) {
  try {
    const { tenantId } = req.params;
    const demands = await Payment.getTenantPendingDemands(tenantId);

    res.status(200).json({
      success: true,
      data: demands
    });

  } catch (error) {
    console.error("Error fetching tenant pending demands:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tenant pending demands",
      error: error.message
    });
  }
},


};

// Helper function to generate receipt HTML
// Beautiful Professional Receipt HTML
function generateReceiptHTML(receipt) {
  const paymentDate = new Date(receipt.payment_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const createdDate = new Date(receipt.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt - RoomAC</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .receipt-card {
          max-width: 900px;
          width: 100%;
          background: white;
          border-radius: 30px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          overflow: hidden;
          position: relative;
        }
        
        .receipt-header {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          padding: 40px;
          color: white;
          position: relative;
          overflow: hidden;
        }
        
        .receipt-header::before {
          content: "RECEIPT";
          position: absolute;
          top: -20px;
          right: 20px;
          font-size: 120px;
          font-weight: 900;
          color: rgba(255,255,255,0.1);
          letter-spacing: 10px;
        }
        
        .receipt-header::after {
          content: "";
          position: absolute;
          bottom: -50px;
          right: -50px;
          width: 200px;
          height: 200px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
        }
        
        .header-content {
          position: relative;
          z-index: 2;
        }
        
        .company-name {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 5px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .company-tagline {
          font-size: 14px;
          opacity: 0.9;
          font-weight: 300;
          letter-spacing: 1px;
        }
        
        .receipt-badge {
          position: absolute;
          top: 30px;
          right: 30px;
          background: rgba(255,255,255,0.2);
          padding: 12px 24px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 18px;
          letter-spacing: 1px;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255,255,255,0.3);
        }
        
        .receipt-body {
          padding: 40px;
          background: white;
        }
        
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 100px;
          font-weight: 900;
          color: rgba(0,0,0,0.03);
          white-space: nowrap;
          pointer-events: none;
          z-index: 1;
        }
        
        .amount-section {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 20px;
          padding: 30px;
          text-align: center;
          margin-bottom: 40px;
          border: 2px dashed #4a5568;
          position: relative;
          overflow: hidden;
        }
        
        .amount-section::before {
          content: "₹";
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 80px;
          opacity: 0.1;
          font-weight: 900;
        }
        
        .amount-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #4a5568;
          margin-bottom: 10px;
        }
        
        .amount-value {
          font-size: 64px;
          font-weight: 800;
          color: #2d3748;
          line-height: 1;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        
        .amount-in-words {
          font-size: 14px;
          color: #718096;
          margin-top: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 25px;
          margin-bottom: 30px;
          position: relative;
          z-index: 2;
        }
        
        .detail-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }
        
        .detail-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border-color: #4299e1;
        }
        
        .detail-icon {
          display: inline-block;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4299e1 0%, #667eea 100%);
          border-radius: 12px;
          margin-bottom: 15px;
          position: relative;
        }
        
        .detail-icon::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 6px;
        }
        
        .detail-label {
          font-size: 12px;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 5px;
        }
        
        .detail-value {
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
        }
        
        .detail-sub {
          font-size: 14px;
          color: #718096;
          margin-top: 5px;
        }
        
        .payment-info {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          border-radius: 16px;
          padding: 25px;
          color: white;
          margin-bottom: 30px;
          position: relative;
          overflow: hidden;
        }
        
        .payment-info::before {
          content: "✓";
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 80px;
          opacity: 0.1;
          font-weight: 900;
        }
        
        .payment-info-title {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 10px;
          opacity: 0.9;
        }
        
        .payment-info-content {
          font-size: 20px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .payment-info-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .payment-info-item::before {
          content: "•";
          font-size: 24px;
          color: rgba(255,255,255,0.5);
        }
        
        .payment-info-item:first-child::before {
          display: none;
        }
        
        .footer {
          background: #1a202c;
          padding: 30px 40px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        
        .footer-left {
          flex: 1;
        }
        
        .footer-logo {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 5px;
        }
        
        .footer-text {
          font-size: 12px;
          opacity: 0.7;
          line-height: 1.6;
        }
        
        .footer-right {
          text-align: right;
        }
        
        .qr-placeholder {
          width: 80px;
          height: 80px;
          background: linear-gradient(45deg, #2d3748 25%, #4a5568 25%, #4a5568 50%, #2d3748 50%, #2d3748 75%, #4a5568 75%);
          background-size: 10px 10px;
          border-radius: 10px;
          margin-bottom: 10px;
        }
        
        .footer-note {
          font-size: 10px;
          opacity: 0.5;
        }
        
        .barcode {
          margin-top: 20px;
          text-align: center;
          font-family: 'Libre Barcode 39', cursive;
          font-size: 32px;
          color: #718096;
          letter-spacing: 5px;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .receipt-card {
            box-shadow: none;
          }
        }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Libre+Barcode+39&display=swap" rel="stylesheet">
    </head>
    <body>
      <div class="receipt-card">
        <div class="receipt-header">
          <div class="header-content">
            <div class="company-name">ROOMAC</div>
            <div class="company-tagline">Premium Living Spaces</div>
          </div>
          <div class="receipt-badge">PAID</div>
        </div>
        
        <div class="receipt-body">
          <div class="watermark">ROOMAC.IN</div>
          
          <div class="amount-section">
            <div class="amount-label">Total Amount Paid</div>
            <div class="amount-value">₹${parseFloat(receipt.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
            <div class="amount-in-words">
              ${numberToWords(parseFloat(receipt.amount))} Rupees Only
            </div>
          </div>
          
          <div class="details-grid">
            <div class="detail-card">
              <div class="detail-icon"></div>
              <div class="detail-label">Tenant Details</div>
              <div class="detail-value">${receipt.tenant_name}</div>
              <div class="detail-sub">${receipt.tenant_phone || ''}</div>
              <div class="detail-sub">${receipt.tenant_email || ''}</div>
            </div>
            
            <div class="detail-card">
              <div class="detail-icon"></div>
              <div class="detail-label">Property Details</div>
              <div class="detail-value">${receipt.property_name || 'RoomAC Properties'}</div>
              <div class="detail-sub">${receipt.room_number || ''} ${receipt.bed_number ? `• Bed #${receipt.bed_number}` : ''}</div>
              <div class="detail-sub">${receipt.property_address || ''}</div>
            </div>
            
            <div class="detail-card">
              <div class="detail-icon"></div>
              <div class="detail-label">Payment Details</div>
              <div class="detail-value">${receipt.payment_mode.toUpperCase()}</div>
              <div class="detail-sub">${receipt.bank_name ? `Bank: ${receipt.bank_name}` : ''}</div>
              <div class="detail-sub">Transaction ID: ${receipt.transaction_id || 'N/A'}</div>
            </div>
            
            <div class="detail-card">
              <div class="detail-icon"></div>
              <div class="detail-label">Period</div>
              <div class="detail-value">${receipt.month} ${receipt.year}</div>
              <div class="detail-sub">Payment Date: ${paymentDate}</div>
            </div>
          </div>
          
          <div class="payment-info">
            <div class="payment-info-title">Payment Summary</div>
            <div class="payment-info-content">
              <span class="payment-info-item">Monthly Rent: ₹${receipt.monthly_rent ? receipt.monthly_rent.toLocaleString('en-IN') : 'N/A'}</span>
              <span class="payment-info-item">Paid: ₹${parseFloat(receipt.amount).toLocaleString('en-IN')}</span>
              <span class="payment-info-item">Status: Completed</span>
            </div>
          </div>
          
          ${receipt.remark ? `
          <div style="background: #fff3cd; border-left: 5px solid #ffc107; padding: 15px 20px; border-radius: 10px; margin-top: 20px;">
            <strong style="color: #856404;">📝 Remark:</strong>
            <p style="color: #856404; margin-top: 5px;">${receipt.remark}</p>
          </div>
          ` : ''}
          
          <div class="barcode">*${receipt.id}${paymentDate.replace(/\//g, '')}*</div>
        </div>
        
        <div class="footer">
          <div class="footer-left">
            <div class="footer-logo">roomac.in</div>
            <div class="footer-text">
              This is a computer generated receipt.<br>
              Generated on: ${createdDate}
            </div>
          </div>
          <div class="footer-right">
            <div class="qr-placeholder"></div>
            <div class="footer-note">Scan to verify</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper function to convert number to words (for amount in words)
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const numToWords = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + numToWords(n%100) : '');
    if (n < 100000) return numToWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + numToWords(n%1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + numToWords(n%100000) : '');
    return numToWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + numToWords(n%10000000) : '');
  };
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = numToWords(rupees);
  if (paise > 0) {
    result += ' and ' + numToWords(paise) + ' Paise';
  }
  
  return result;
}

// Enhanced Professional PDF Receipt Generator
async function generateProfessionalReceiptPDF(doc, receipt) {
  const paymentDate = new Date(receipt.payment_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const createdDate = new Date(receipt.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Background watermark
  doc.save();
  doc.fontSize(100);
  doc.fillColor('#f0f0f0');
  doc.opacity(0.2);
  doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
  doc.font('Helvetica-Bold')
     .text('ROOMAC.IN', doc.page.width / 2 - 250, doc.page.height / 2 - 50);
  doc.restore();
  doc.opacity(1);

  // Header with gradient effect
  const gradient = doc.linearGradient(50, 40, doc.page.width - 50, 140);
  gradient.stop(0, '#1e3c72')
         .stop(1, '#2a5298');
  
  doc.roundedRect(40, 40, doc.page.width - 80, 120, 15)
     .fill(gradient);
  
  doc.fillColor('white')
     .fontSize(36)
     .font('Helvetica-Bold')
     .text('ROOMAC', 60, 70);
  
  doc.fontSize(14)
     .font('Helvetica')
     .text('Premium Living Spaces', 60, 110);
  
  doc.fontSize(12)
     .fillColor('white')
     .text(`RECEIPT #${receipt.id}`, doc.page.width - 200, 70, { width: 150, align: 'right' });
  
  doc.fontSize(10)
     .text(`Date: ${paymentDate}`, doc.page.width - 200, 90, { width: 150, align: 'right' });

  // Amount Box
  doc.roundedRect(70, 180, doc.page.width - 140, 100, 10)
     .fillAndStroke('#f8f9fa', '#dee2e6');
  
  doc.fillColor('#495057')
     .fontSize(12)
     .font('Helvetica')
     .text('TOTAL AMOUNT', 70, 195, { width: doc.page.width - 140, align: 'center' });
  
  doc.fillColor('#1e3c72')
     .fontSize(48)
     .font('Helvetica-Bold')
     .text(`₹${parseFloat(receipt.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}`, 
           70, 215, { width: doc.page.width - 140, align: 'center' });

  // Two column layout for details
  const leftCol = 70;
  const rightCol = doc.page.width / 2 + 30;
  let yPos = 310;

  // Left Column - Tenant Details
  doc.roundedRect(leftCol, yPos - 15, 250, 120, 8)
     .fillAndStroke('#f8f9fa', '#dee2e6');
  
  doc.fillColor('#1e3c72')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('TENANT DETAILS', leftCol + 15, yPos);
  
  doc.fillColor('#2d3748')
     .fontSize(10)
     .font('Helvetica');
  
  yPos += 25;
  doc.text(`Name: ${receipt.tenant_name}`, leftCol + 15, yPos);
  yPos += 18;
  doc.text(`Phone: ${receipt.tenant_phone || 'N/A'}`, leftCol + 15, yPos);
  yPos += 18;
  doc.text(`Email: ${receipt.tenant_email || 'N/A'}`, leftCol + 15, yPos);

  // Right Column - Property Details
  yPos = 310;
  doc.roundedRect(rightCol, yPos - 15, 250, 120, 8)
     .fillAndStroke('#f8f9fa', '#dee2e6');
  
  doc.fillColor('#1e3c72')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('PROPERTY DETAILS', rightCol + 15, yPos);
  
  doc.fillColor('#2d3748')
     .fontSize(10)
     .font('Helvetica');
  
  yPos += 25;
  doc.text(`Property: ${receipt.property_name || 'RoomAC'}`, rightCol + 15, yPos);
  yPos += 18;
  doc.text(`Room: ${receipt.room_number || 'N/A'} ${receipt.bed_number ? `(Bed #${receipt.bed_number})` : ''}`, rightCol + 15, yPos);
  yPos += 18;
  doc.text(`Address: ${receipt.property_address || 'N/A'}`, rightCol + 15, yPos, { width: 220 });

  // Payment Details Section
  yPos = 460;
  doc.roundedRect(70, yPos - 15, doc.page.width - 140, 100, 8)
     .fillAndStroke('#f0f9ff', '#b8daff');
  
  doc.fillColor('#004085')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('PAYMENT DETAILS', 70, yPos, { align: 'center' });
  
  yPos += 25;
  doc.fontSize(10)
     .font('Helvetica');
  
  // Payment details in columns
  const colWidth = (doc.page.width - 140) / 3;
  
  doc.fillColor('#2d3748')
     .text(`Mode: ${receipt.payment_mode.toUpperCase()}`, 80, yPos, { width: colWidth })
     .text(`Bank: ${receipt.bank_name || 'N/A'}`, 80 + colWidth, yPos, { width: colWidth })
     .text(`Transaction ID: ${receipt.transaction_id || 'N/A'}`, 80 + colWidth * 2, yPos, { width: colWidth });
  
  yPos += 25;
  doc.text(`Month/Year: ${receipt.month} ${receipt.year}`, 80, yPos, { width: colWidth })
     .text(`Payment Date: ${paymentDate}`, 80 + colWidth, yPos, { width: colWidth })
     .text(`Generated: ${createdDate}`, 80 + colWidth * 2, yPos, { width: colWidth });

  // Remark if exists
  if (receipt.remark) {
    yPos += 50;
    doc.roundedRect(70, yPos - 10, doc.page.width - 140, 50, 5)
       .fillAndStroke('#fff3cd', '#ffeeba');
    
    doc.fillColor('#856404')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('REMARK:', 80, yPos);
    
    doc.font('Helvetica')
       .fontSize(9)
       .text(receipt.remark, 80, yPos + 15, { width: doc.page.width - 160 });
  }

  // Footer
  const footerY = doc.page.height - 80;
  
  // Decorative line
  doc.lineWidth(2)
     .strokeColor('#1e3c72')
     .moveTo(50, footerY)
     .lineTo(doc.page.width - 50, footerY)
     .stroke();
  
  doc.fontSize(12)
     .fillColor('#1e3c72')
     .font('Helvetica-Bold')
     .text('roomac.in', 50, footerY + 15, { align: 'center', width: doc.page.width - 100 });
  
  doc.fontSize(8)
     .fillColor('#6c757d')
     .font('Helvetica')
     .text('This is a computer generated receipt. No signature required.', 
           50, footerY + 30, { align: 'center', width: doc.page.width - 100 })
     .text(`Generated on: ${createdDate}`, 50, footerY + 40, { align: 'center', width: doc.page.width - 100 })
     .text('Thank you for your payment!', 50, footerY + 55, { 
       align: 'center', 
       width: doc.page.width - 100,
       fontSize: 10,
       color: '#1e3c72'
     });
}

module.exports = paymentController;