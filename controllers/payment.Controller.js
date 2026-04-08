


// controllers/paymentController.js 
const Payment = require("../models/PaymentModel");
const Booking = require("../models/BookingModel");
const db = require("../config/db");
const { uploadProof } = require("../middleware/paymentUpload");
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// In paymentController.js - Professional Clean PDF Receipt Generator

async function generateProfessionalReceiptPDF(doc, receipt, settings) {
  const paymentDate = new Date(receipt.payment_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  const createdDate = new Date(receipt.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Get settings with defaults
  const siteName = settings?.site_name?.value || 'ROOMAC';
  const siteTagline = settings?.site_tagline?.value || 'Premium Living Spaces';
  const contactAddress = settings?.contact_address?.value || '';
  const contactPhone = settings?.contact_phone?.value || '';
  const contactEmail = settings?.contact_email?.value || '';
  const logoPath = settings?.logo_header?.value;

  // Colors
  const primaryColor = '#1e3c72'; // Dark blue
  const secondaryColor = '#4a5568'; // Gray
  const accentColor = '#3182ce'; // Blue
  const successColor = '#2f855a'; // Green
  const lightGray = '#f7fafc';
  const borderColor = '#e2e8f0';

  let yPos = 50;

  // Header with Logo
  if (logoPath) {
    try {
      const cleanPath = logoPath.startsWith('/') ? logoPath.substring(1) : logoPath;
      const fullLogoPath = path.join(__dirname, '..', cleanPath);
      
      if (fs.existsSync(fullLogoPath)) {
        doc.image(fullLogoPath, 50, yPos, { width: 70 });
      }
    } catch (err) {
      console.error('Error adding logo:', err);
    }
  }

  // Company Name and Tagline
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor(primaryColor)
     .text(siteName, 140, yPos + 5);

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(secondaryColor)
     .text(siteTagline, 140, yPos + 30);

  // Receipt Badge
  doc.roundedRect(450, yPos, 100, 30, 5)
     .fillAndStroke(primaryColor, primaryColor);
  
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('white')
     .text('RECEIPT', 465, yPos + 8);

  yPos += 60;

  // Receipt Title with Number
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .fillColor(primaryColor)
     .text('PAYMENT RECEIPT', 50, yPos);

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(secondaryColor)
     .text(`#RCP-${receipt.id.toString().padStart(6, '0')}`, 400, yPos + 8, { align: 'right' });

  yPos += 20;

  // Date
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(secondaryColor)
     .text(`Date: ${paymentDate}`, 400, yPos, { align: 'right' });

  yPos += 30;

  // Decorative line
  doc.strokeColor(primaryColor)
     .lineWidth(1.5)
     .moveTo(50, yPos)
     .lineTo(550, yPos)
     .stroke();

  yPos += 25;

  // Two Column Layout for Details
  const col1X = 50;
  const col2X = 300;
  const rowHeight = 25;

  // Tenant Details
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor(primaryColor)
     .text('TENANT INFORMATION', col1X, yPos);

  yPos += 20;

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#333333');

  // Left Column Details
  doc.text('Full Name:', col1X, yPos);
  doc.font('Helvetica-Bold')
     .text(receipt.tenant_name || 'N/A', col1X + 80, yPos);
  
  yPos += rowHeight;

  doc.font('Helvetica')
     .text('Phone:', col1X, yPos);
  doc.font('Helvetica-Bold')
     .text(receipt.tenant_phone || 'N/A', col1X + 80, yPos);

  yPos += rowHeight;

  doc.font('Helvetica')
     .text('Email:', col1X, yPos);
  doc.font('Helvetica-Bold')
     .text(receipt.tenant_email || 'N/A', col1X + 80, yPos);

  // Reset Y for right column
  let rightY = yPos - (rowHeight * 3);

  // Property Details
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor(primaryColor)
     .text('PROPERTY DETAILS', col2X, rightY);

  rightY += 20;

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#333333');

  doc.text('Property:', col2X, rightY);
  doc.font('Helvetica-Bold')
     .text(receipt.property_name || 'RoomAC', col2X + 70, rightY);

  rightY += rowHeight;

  doc.font('Helvetica')
     .text('Room:', col2X, rightY);
  
  let roomDisplay = receipt.room_number || 'N/A';
  if (receipt.bed_number) {
    roomDisplay += ` (Bed #${receipt.bed_number})`;
  }
  doc.font('Helvetica-Bold')
     .text(roomDisplay, col2X + 70, rightY);

  rightY += rowHeight;

  if (receipt.bed_type) {
    doc.font('Helvetica')
       .text('Bed Type:', col2X, rightY);
    doc.font('Helvetica-Bold')
       .text(receipt.bed_type, col2X + 70, rightY);
    rightY += rowHeight;
  }

  // Set Y to the maximum of both columns
  yPos = Math.max(yPos, rightY) + 30;

  // Payment Summary Box
  doc.roundedRect(50, yPos, 500, 80, 8)
     .fillAndStroke('#ebf8ff', '#bee3f8');

  // Payment Amount - Large
  doc.fontSize(12)
     .font('Helvetica')
     .fillColor(secondaryColor)
     .text('TOTAL AMOUNT', 70, yPos + 15);

  doc.fontSize(32)
     .font('Helvetica-Bold')
     .fillColor(successColor)
     .text(`Rs ${parseFloat(receipt.amount).toLocaleString('en-IN')}`, 70, yPos + 30);

  // Payment Details on Right
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(secondaryColor)
     .text('Payment Mode:', 350, yPos + 15);
  doc.font('Helvetica-Bold')
     .fillColor(primaryColor)
     .text(receipt.payment_mode.toUpperCase(), 350, yPos + 30);

  doc.font('Helvetica')
     .fillColor(secondaryColor)
     .text('Period:', 350, yPos + 45);
  doc.font('Helvetica-Bold')
     .fillColor(primaryColor)
     .text(`${receipt.month} ${receipt.year}`, 350, yPos + 60);

  yPos += 100;

  // Bank Details Section (if available)
  if (receipt.bank_name || receipt.transaction_id) {
    doc.roundedRect(50, yPos, 500, 60, 5)
       .fillAndStroke(lightGray, borderColor);

    let bankX = 70;
    
    if (receipt.bank_name) {
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text('Bank Name:', bankX, yPos + 15);
      doc.font('Helvetica-Bold')
         .fillColor('#333333')
         .text(receipt.bank_name, bankX, yPos + 30);
      bankX += 200;
    }

    if (receipt.transaction_id) {
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text('Transaction ID:', bankX, yPos + 15);
      doc.font('Helvetica-Bold')
         .fontSize(8)
         .fillColor('#333333')
         .text(receipt.transaction_id, bankX, yPos + 30);
    }

    yPos += 80;
  }

  // Remark if exists
  if (receipt.remark) {
    doc.roundedRect(50, yPos, 500, 50, 5)
       .fillAndStroke('#fff3cd', '#ffeeba');
    
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#856404')
       .text('Remark:', 70, yPos + 12);
    
    doc.font('Helvetica')
       .fontSize(9)
       .text(receipt.remark, 70, yPos + 27, { width: 460 });

    yPos += 70;
  }

  // Footer - Fixed position
  const footerY = 720;

  // Decorative line
  doc.strokeColor(primaryColor)
     .lineWidth(1)
     .moveTo(50, footerY - 15)
     .lineTo(550, footerY - 15)
     .stroke();

  // Contact Information
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor(secondaryColor)
     .text(contactAddress, 50, footerY, { align: 'center', width: 500 });

  if (contactPhone || contactEmail) {
    doc.text(`Tel: ${contactPhone} | Email: ${contactEmail}`, 50, footerY + 12, { align: 'center', width: 500 });
  }

  // Generated Info
  doc.fontSize(7)
     .fillColor('#a0aec0')
     .text(`Generated on: ${createdDate}`, 50, footerY + 30, { align: 'center', width: 500 })
     .text('This is a computer generated receipt.', 50, footerY + 40, { align: 'center', width: 500 });

  // Thank You Note
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor(primaryColor)
     .text('Thank you for your payment!', 50, footerY + 55, { align: 'center', width: 500 });
}

const paymentController = {
  // Create a new payment
  async createPayment(req, res) {
    try {
      const paymentData = req.body;
      console.log("payment dataaaa", paymentData)
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

      const status = Number(paymentData.new_balance) ===  0 ? 'paid' : Number(paymentData.amount) > 0 && Number(paymentData.total_amount) - Number(paymentData.discount_amount) > Number(paymentData.amount) ? 'partial' : 'pending';

      const newPayment = await Payment.create({...paymentData, status: status});

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

   async getLatestRentPayment(req, res){
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const data = await Payment.getLatestRentPayment(tenantId);

    return res.status(200).json({
      success: true,
      message: "Latest rent payment fetched successfully",
      data: data || null,
    });
  } catch (error) {
    console.error("getLatestRentPayment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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

// In paymentController.js - Update downloadReceipt

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

    // Fetch settings from database
    const [settingsRows] = await db.execute(
      'SELECT setting_key, value FROM app_settings'
    );
    
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.setting_key] = { value: row.value };
    });

    // Create PDF document with better settings
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      info: {
        Title: `Payment Receipt #${receipt.id}`,
        Author: settings?.site_name?.value || 'RoomAC',
        Subject: 'Payment Receipt',
        Keywords: 'receipt, payment, rent',
        Creator: 'RoomAC PMS'
      },
      bufferPages: true // Better performance for larger documents
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${receipt.id}.pdf`);
    res.setHeader('Cache-Control', 'no-cache');
    
    doc.pipe(res);
    
    // Generate professional PDF
    await generateProfessionalReceiptPDF(doc, receipt, settings);
    
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
async createDemandPayment(req, res) {
  try {
    const {
      tenant_id,
      amount,
      due_date,
      payment_type,
      description,
      send_email,
      send_sms
    } = req.body;

    if (!tenant_id || !amount || !due_date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: tenant_id, amount, and due_date are required"
      });
    }

    // Create demand payment
    const demandData = {
      tenant_id,
      amount,
      due_date,
      payment_type: payment_type || 'rent',
      description,
      late_fee: 0, // Always 0 since we removed late fee
      created_by: req.user?.id || null
    };

    const newDemand = await Payment.createDemand(demandData);

    // Create notification for tenant
    if (newDemand) {
      // Build notification message
      let notificationMessage = `Payment request details:\n`;
      notificationMessage += `Amount: ₹${amount}\n`;
      notificationMessage += `Due Date: ${new Date(due_date).toLocaleDateString()}\n`;
      notificationMessage += `Payment Type: ${payment_type}\n`;
      if (description) {
        notificationMessage += `Note: ${description}`;
      }

      // Import notification controller
      const notificationController = require('../controllers/tenantNotificationController');
      
      await notificationController.createNotification({
        tenantId: tenant_id,
        title: `💰 Payment Request - ${payment_type === 'rent' ? 'Rent' : 'Security Deposit'}`,
        message: notificationMessage,
        notificationType: 'payment',
        relatedEntityType: 'demand',
        relatedEntityId: newDemand.id,
        priority: 'high'
      });

      
    }

    res.status(201).json({
      success: true,
      message: "Payment demand created successfully",
      data: {
        ...newDemand,
        total_amount: amount
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

// Add these methods to your paymentController object

// controllers/paymentController.js - Update approvePayment

async approvePayment(req, res) {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }
    
    if (payment.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: "Payment is already approved"
      });
    }
    
    if (payment.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: "Rejected payments cannot be approved"
      });
    }
    
    const approved = await Payment.approvePayment(id, approved_by);
    
    if (approved) {
      // ✅ Update monthly_rent table after approval
      await Payment.updateMonthlyRentAfterApproval(id);
      
      const approvedPayment = await Payment.getReceiptById(id);
      
      res.status(200).json({
        success: true,
        message: "Payment approved successfully",
        data: { id, status: 'approved', receipt: approvedPayment }
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to approve payment"
      });
    }
  } catch (error) {
    console.error("Error approving payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve payment",
      error: error.message
    });
  }
},

// Reject payment

async rejectPayment(req, res) {
  try {
    const { id } = req.params;
    const { rejection_reason, rejection_reason_category_id, rejected_by } = req.body;
    
    if (!rejection_reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }
    
    // Check if payment is already approved or rejected
    if (payment.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: "Approved payments cannot be rejected"
      });
    }
    
    if (payment.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: "Payment is already rejected"
      });
    }
    
    const rejected = await Payment.rejectPayment(
      id, 
      rejection_reason, 
      rejection_reason_category_id, 
      rejected_by
    );
    
    if (rejected) {
      res.status(200).json({
        success: true,
        message: "Payment rejected successfully",
        data: { id, status: 'rejected' }
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to reject payment"
      });
    }
  } catch (error) {
    console.error("Error rejecting payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject payment",
      error: error.message
    });
  }
},

// Update payment
async updatePayment(req, res) {
  try {
    const { id } = req.params;
    const paymentData = req.body;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }
    
    // Check if payment can be updated
    if (payment.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: "Approved payments cannot be updated"
      });
    }
    
    const updated = await Payment.updatePayment(id, paymentData);
    
    if (updated) {
      const updatedPayment = await Payment.findById(id);
      res.status(200).json({
        success: true,
        message: "Payment updated successfully",
        data: updatedPayment
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to update payment"
      });
    }
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment",
      error: error.message
    });
  }
},

// Delete payment
async deletePayment(req, res) {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }
    
    // Optional: Add permission check here
    // Only allow admins to delete approved payments, or anyone to delete pending/rejected
    
    const deleted = await Payment.deletePayment(id);
    
    if (deleted) {
      res.status(200).json({
        success: true,
        message: "Payment deleted successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to delete payment"
      });
    }
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete payment",
      error: error.message
    });
  }
},

// Get security deposit info
async getSecurityDepositInfo(req, res) {
  try {
    const { tenantId } = req.params;
    const depositInfo = await Payment.getSecurityDepositInfo(tenantId);

    if (!depositInfo) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found or no active bed assignment"
      });
    }

    res.status(200).json({
      success: true,
      data: depositInfo
    });

  } catch (error) {
    console.error("Error fetching security deposit info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch security deposit info",
      error: error.message
    });
  }
},

// Create notification for admin
async createAdminNotification(req, res) {
  try {
    const {
      title,
      message,
      notification_type,
      related_entity_type,
      related_entity_id,
      priority
    } = req.body;

    // Insert notification for all admins (you can modify this to target specific admins)
    const query = `
      INSERT INTO notifications (
        recipient_id, recipient_type, title, message, 
        notification_type, related_entity_type, related_entity_id, priority
      ) 
      SELECT id, 'admin', ?, ?, ?, ?, ?, ?
      FROM users WHERE role = 'admin'
    `;

    const [result] = await db.execute(query, [
      title,
      message,
      notification_type,
      related_entity_type || null,
      related_entity_id || null,
      priority || 'medium'
    ]);

    res.status(201).json({
      success: true,
      message: "Admin notifications created successfully",
      count: result.affectedRows
    });

  } catch (error) {
    console.error("Error creating admin notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create notification",
      error: error.message
    });
  }
}


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




module.exports = paymentController;