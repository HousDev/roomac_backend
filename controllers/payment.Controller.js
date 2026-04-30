// controllers/paymentController.js
const Payment = require("../models/PaymentModel");
const Booking = require("../models/BookingModel");
const db = require("../config/db");
const { uploadProof } = require("../middleware/paymentUpload");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const { getTemplate, replaceVariables } = require("../utils/templateService");
const { sendEmail } = require("../utils/emailService");
const PDFGenerator = require("../utils/pdfGenerator");
const { generateLedgerHTML } = require("../utils/ledgerGenerator");
const ReceiptGenerator = require("../utils/receiptGenerator");

// In paymentController.js - Professional Clean PDF Receipt Generator

async function generateProfessionalReceiptPDF(doc, receipt, settings) {
  const paymentDate = new Date(receipt.payment_date).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  );

  const createdDate = new Date(receipt.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Get settings with defaults
  const siteName = settings?.site_name?.value || "ROOMAC";
  const siteTagline = settings?.site_tagline?.value || "Premium Living Spaces";
  const contactAddress = settings?.contact_address?.value || "";
  const contactPhone = settings?.contact_phone?.value || "";
  const contactEmail = settings?.contact_email?.value || "";
  const logoPath = settings?.logo_header?.value;

  // Colors
  const primaryColor = "#1e3c72"; // Dark blue
  const secondaryColor = "#4a5568"; // Gray
  const accentColor = "#3182ce"; // Blue
  const successColor = "#2f855a"; // Green
  const lightGray = "#f7fafc";
  const borderColor = "#e2e8f0";

  let yPos = 50;

  // Header with Logo
  if (logoPath) {
    try {
      const cleanPath = logoPath.startsWith("/")
        ? logoPath.substring(1)
        : logoPath;
      const fullLogoPath = path.join(__dirname, "..", cleanPath);

      if (fs.existsSync(fullLogoPath)) {
        doc.image(fullLogoPath, 50, yPos, { width: 70 });
      }
    } catch (err) {
      console.error("Error adding logo:", err);
    }
  }

  // Company Name and Tagline
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text(siteName, 140, yPos + 5);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(secondaryColor)
    .text(siteTagline, 140, yPos + 30);

  // Receipt Badge
  doc
    .roundedRect(450, yPos, 100, 30, 5)
    .fillAndStroke(primaryColor, primaryColor);

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("white")
    .text("RECEIPT", 465, yPos + 8);

  yPos += 60;

  // Receipt Title with Number
  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text("PAYMENT RECEIPT", 50, yPos);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(secondaryColor)
    .text(`#RCP-${receipt.id.toString().padStart(6, "0")}`, 400, yPos + 8, {
      align: "right",
    });

  yPos += 20;

  // Date
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(secondaryColor)
    .text(`Date: ${paymentDate}`, 400, yPos, { align: "right" });

  yPos += 30;

  // Decorative line
  doc
    .strokeColor(primaryColor)
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
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text("TENANT INFORMATION", col1X, yPos);

  yPos += 20;

  doc.fontSize(10).font("Helvetica").fillColor("#333333");

  // Left Column Details
  doc.text("Full Name:", col1X, yPos);
  doc
    .font("Helvetica-Bold")
    .text(receipt.tenant_name || "N/A", col1X + 80, yPos);

  yPos += rowHeight;

  doc.font("Helvetica").text("Phone:", col1X, yPos);
  doc
    .font("Helvetica-Bold")
    .text(receipt.tenant_phone || "N/A", col1X + 80, yPos);

  yPos += rowHeight;

  doc.font("Helvetica").text("Email:", col1X, yPos);
  doc
    .font("Helvetica-Bold")
    .text(receipt.tenant_email || "N/A", col1X + 80, yPos);

  // Reset Y for right column
  let rightY = yPos - rowHeight * 3;

  // Property Details
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text("PROPERTY DETAILS", col2X, rightY);

  rightY += 20;

  doc.fontSize(10).font("Helvetica").fillColor("#333333");

  doc.text("Property:", col2X, rightY);
  doc
    .font("Helvetica-Bold")
    .text(receipt.property_name || "RoomAC", col2X + 70, rightY);

  rightY += rowHeight;

  doc.font("Helvetica").text("Room:", col2X, rightY);

  let roomDisplay = receipt.room_number || "N/A";
  if (receipt.bed_number) {
    roomDisplay += ` (Bed #${receipt.bed_number})`;
  }
  doc.font("Helvetica-Bold").text(roomDisplay, col2X + 70, rightY);

  rightY += rowHeight;

  if (receipt.bed_type) {
    doc.font("Helvetica").text("Bed Type:", col2X, rightY);
    doc.font("Helvetica-Bold").text(receipt.bed_type, col2X + 70, rightY);
    rightY += rowHeight;
  }

  // Set Y to the maximum of both columns
  yPos = Math.max(yPos, rightY) + 30;

  // Payment Summary Box
  doc.roundedRect(50, yPos, 500, 80, 8).fillAndStroke("#ebf8ff", "#bee3f8");

  // Payment Amount - Large
  doc
    .fontSize(12)
    .font("Helvetica")
    .fillColor(secondaryColor)
    .text("TOTAL AMOUNT", 70, yPos + 15);

  doc
    .fontSize(32)
    .font("Helvetica-Bold")
    .fillColor(successColor)
    .text(
      `Rs ${parseFloat(receipt.amount).toLocaleString("en-IN")}`,
      70,
      yPos + 30,
    );

  // Payment Details on Right
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(secondaryColor)
    .text("Payment Mode:", 350, yPos + 15);
  doc
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text(receipt.payment_mode.toUpperCase(), 350, yPos + 30);

  doc
    .font("Helvetica")
    .fillColor(secondaryColor)
    .text("Period:", 350, yPos + 45);
  doc
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text(`${receipt.month} ${receipt.year}`, 350, yPos + 60);

  yPos += 100;

  // Bank Details Section (if available)
  if (receipt.bank_name || receipt.transaction_id) {
    doc.roundedRect(50, yPos, 500, 60, 5).fillAndStroke(lightGray, borderColor);

    let bankX = 70;

    if (receipt.bank_name) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text("Bank Name:", bankX, yPos + 15);
      doc
        .font("Helvetica-Bold")
        .fillColor("#333333")
        .text(receipt.bank_name, bankX, yPos + 30);
      bankX += 200;
    }

    if (receipt.transaction_id) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text("Transaction ID:", bankX, yPos + 15);
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#333333")
        .text(receipt.transaction_id, bankX, yPos + 30);
    }

    yPos += 80;
  }

  // Remark if exists
  if (receipt.remark) {
    doc.roundedRect(50, yPos, 500, 50, 5).fillAndStroke("#fff3cd", "#ffeeba");

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#856404")
      .text("Remark:", 70, yPos + 12);

    doc
      .font("Helvetica")
      .fontSize(9)
      .text(receipt.remark, 70, yPos + 27, { width: 460 });

    yPos += 70;
  }

  // Footer - Fixed position
  const footerY = 720;

  // Decorative line
  doc
    .strokeColor(primaryColor)
    .lineWidth(1)
    .moveTo(50, footerY - 15)
    .lineTo(550, footerY - 15)
    .stroke();

  // Contact Information
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(secondaryColor)
    .text(contactAddress, 50, footerY, { align: "center", width: 500 });

  if (contactPhone || contactEmail) {
    doc.text(
      `Tel: ${contactPhone} | Email: ${contactEmail}`,
      50,
      footerY + 12,
      { align: "center", width: 500 },
    );
  }

  // Generated Info
  doc
    .fontSize(7)
    .fillColor("#a0aec0")
    .text(`Generated on: ${createdDate}`, 50, footerY + 30, {
      align: "center",
      width: 500,
    })
    .text("This is a computer generated receipt.", 50, footerY + 40, {
      align: "center",
      width: 500,
    });

  // Thank You Note
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(primaryColor)
    .text("Thank you for your payment!", 50, footerY + 55, {
      align: "center",
      width: 500,
    });
}

const paymentController = {
 sendPropertyManagerPaymentEmail: async function(paymentData, tenantData, propertyData, bedAssignment) {

    try {
      // Get email template for payment success notification
      const template = await getTemplate("Payment", "email", "Payment Success");

      if (!template) {
        console.error("❌ Template not found for category 'Payment', sub_category 'Payment Success'");
        return false;
      }

      // Format payment date
      const paymentDate = new Date(paymentData.payment_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Prepare month info for rent payments
      let monthInfo = '';
if (paymentData.payment_type === 'rent' && paymentData.month && paymentData.year) {
  monthInfo = `
    <div style="background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; border-bottom: 2px solid #004aad; padding-bottom: 8px;">
        <span style="font-size: 16px;">📅</span>
        <h3 style="color: #1e293b; font-size: 13px; font-weight: 700; margin: 0;">Rent Period</h3>
      </div>
      <div style="background: #e6f0ff; border-radius: 8px; padding: 12px; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #004aad; font-weight: 600;">
          ${paymentData.month} ${paymentData.year}
        </p>
      </div>
    </div>
  `;
}

      // Prepare bank info if available
      let bankInfo = '';
if (paymentData.bank_name) {
  bankInfo = `
    <div>
      <p style="margin: 0 0 3px 0; font-size: 10px; color: #64748b; font-weight: 600; letter-spacing: 0.5px;">BANK NAME</p>
      <p style="margin: 0; font-size: 13px; color: #1e293b;">${paymentData.bank_name}</p>
    </div>
  `;
}

      // Prepare bed info
      let bedInfo = '';
      if (bedAssignment?.bed_number) {
        bedInfo = ` • Bed #${bedAssignment.bed_number}`;
      }

      // Prepare property address
      let propertyAddressHtml = '';
      if (propertyData.address) {
        propertyAddressHtml = `<p style="margin: 8px 0; font-size: 14px; color: #334155;">
          <strong style="color: #004aad;">Address:</strong> ${propertyData.address}
        </p>`;
      }

      // Prepare variables for template
      const variables = {
          property_manager_name: propertyData.property_manager_name || 'Property Manager',
        tenant_name: tenantData.full_name || paymentData.tenant_name || 'Tenant',
        tenant_phone: tenantData.phone || paymentData.tenant_phone || 'N/A',
        tenant_email: tenantData.email || paymentData.tenant_email || 'N/A',
        amount: paymentData.amount.toLocaleString('en-IN'),
        payment_type: paymentData.payment_type === 'rent' ? 'Rent Payment' : 'Security Deposit',
        payment_date: paymentDate,
        payment_mode: paymentData.payment_mode || 'Online',
        transaction_id: paymentData.transaction_id || paymentData.razorpay_payment_id || 'N/A',
        property_name: propertyData.name || 'Property',
        room_number: bedAssignment?.room_number || propertyData.room_number || 'N/A',
        bed_number: bedAssignment?.bed_number || '',
        bed_info: bedInfo,
        month_info: monthInfo,
        bank_info: bankInfo,
        property_address: propertyAddressHtml,
        dashboard_link: `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/payments`,
        year: new Date().getFullYear()
      };

      // Replace variables in subject and content
      const emailSubject = replaceVariables(template.subject, variables);
      const emailBody = replaceVariables(template.content, variables);


      if (!propertyData.property_manager_email) {
        console.error("❌ No property manager email found for property:", propertyData.name);
        return false;
      }

      const emailResult = await sendEmail(propertyData.property_manager_email, emailSubject, emailBody);

      if (emailResult) {
        console.log(`✅ Payment notification email sent successfully to property manager: ${propertyData.property_manager_email}`);
      } else {
        console.error(`❌ Failed to send email to property manager: ${propertyData.property_manager_email}`);
      }

      return true;
    } catch (error) {
      console.error("❌ Error in sendPropertyManagerPaymentEmail:", error);
      console.error("❌ Error stack:", error.stack);
      return false;
    }
  },

async createPayment(req, res) {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const paymentData = req.body;
    console.log("payment dataaaa", paymentData);

    if (!paymentData.amount || !paymentData.payment_mode) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Missing required fields: amount and payment_mode are required",
      });
    }

    if (!paymentData.tenant_id) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "tenant_id is required",
      });
    }

    // Handle booking_id
    if (!paymentData.booking_id || paymentData.booking_id === "") {
      paymentData.booking_id = null;
    }

    // Set payment_type if not provided
    if (!paymentData.payment_type) {
      paymentData.payment_type = "rent";
    }

    // ========== NEW: Handle Security Deposit separately ==========
    if (paymentData.payment_type === "security_deposit") {
      // For security deposit, just create payment record without updating monthly_rent
      const paymentRecord = {
        tenant_id: paymentData.tenant_id,
        booking_id: paymentData.booking_id,
        payment_type: "security_deposit",
        amount: parseFloat(paymentData.amount),
        total_amount: parseFloat(paymentData.amount),
        previous_balance: 0,
        new_balance: 0,
        discount_amount: paymentData.discount_amount || 0,
        payment_mode: paymentData.payment_mode,
        bank_name: paymentData.bank_name || null,
        transaction_id: paymentData.transaction_id || null,
        payment_date: paymentData.payment_date,
        month: paymentData.month || new Date().toLocaleString("default", { month: "long" }),
        year: paymentData.year || new Date().getFullYear(),
        remark: paymentData.remark || "Security deposit payment",
         status: paymentData.source === 'admin' ? 'paid' : 'pending',
        source: paymentData.source || "admin"
      };

      const [paymentResult] = await connection.execute(`
        INSERT INTO payments (
          tenant_id, booking_id, payment_type, amount, total_amount, 
          previous_balance, new_balance, discount_amount, payment_mode, 
          bank_name, transaction_id, payment_date, month, year, remark, 
          status,source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, NOW(), NOW())
      `, [
        paymentRecord.tenant_id,
        paymentRecord.booking_id,
        paymentRecord.payment_type,
        paymentRecord.amount,
        paymentRecord.total_amount,
        paymentRecord.previous_balance,
        paymentRecord.new_balance,
        paymentRecord.discount_amount,
        paymentRecord.payment_mode,
        paymentRecord.bank_name,
        paymentRecord.transaction_id,
        paymentRecord.payment_date,
        paymentRecord.month,
        paymentRecord.year,
        paymentRecord.remark,
        paymentRecord.status,
        paymentData.source || "admin"
      ]);

      await connection.commit();
      connection.release();

        // ✅ Send email to property manager ONLY if payment is from tenant dashboard
  if (paymentData.source === 'tenant') {
    try {
      // Fetch tenant details
      const [tenantRows] = await db.execute(
        `SELECT id, full_name, email, phone FROM tenants WHERE id = ?`,
        [paymentData.tenant_id]
      );
      const tenant = tenantRows[0];
      
      // Fetch property details from bed assignment
      const [propertyRows] = await db.execute(`
        SELECT 
          p.id, p.name, p.address, p.property_manager_name, p.property_manager_email, p.property_manager_phone,
          r.room_number,
          ba.bed_number
        FROM bed_assignments ba
        JOIN rooms r ON ba.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        WHERE ba.tenant_id = ? AND ba.is_available = 0
      `, [paymentData.tenant_id]);
      
      const propertyInfo = propertyRows[0];
      
      if (propertyInfo && propertyInfo.property_manager_email) {
        await paymentController.sendPropertyManagerPaymentEmail(
          paymentData,
          tenant,
          propertyInfo,
          { bed_number: propertyInfo.bed_number, room_number: propertyInfo.room_number }
        );
      }
    } catch (emailError) {
      console.error("Failed to send property manager email:", emailError);
      // Don't block the response
    }
  } else {
    console.log(`📧 Skipping email - Payment source is: ${paymentData.source} (not tenant)`);
  }


      return res.status(201).json({
        success: true,
        message: "Security deposit payment recorded successfully",
        data: {
          id: paymentResult.insertId,
          payment_status: "pending",
          payment_type: "security_deposit"
        }
      });
    }

    // ========== For Rent payments only - continue with existing logic ==========
    // Get monthly rent records for this tenant
    const [monthlyRecords] = await connection.execute(`
      SELECT id, month, year, rent, paid, balance, discount, status
      FROM monthly_rent 
      WHERE tenant_id = ? 
      ORDER BY 
        year ASC,
        FIELD(month, 
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ) ASC
    `, [paymentData.tenant_id]);

    if (monthlyRecords.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "No monthly rent records found for this tenant. Please ensure check-in date is set.",
      });
    }

    // Calculate payment distribution (oldest months first)
    let remainingAmount = parseFloat(paymentData.amount);
    let distribution = [];
    let updates = [];

    for (const record of monthlyRecords) {
      if (remainingAmount <= 0) break;

      const currentBalance = parseFloat(record.balance);
      if (currentBalance > 0) {
        const amountToPay = Math.min(remainingAmount, currentBalance);
        const newBalance = currentBalance - amountToPay;
        const newPaid = parseFloat(record.paid) + amountToPay;
        const newStatus = newBalance === 0 ? "paid" : newPaid > 0 ? "partial" : "pending";

        distribution.push({
          monthly_rent_id: record.id,
          month: record.month,
          year: record.year,
          amount: amountToPay,
          old_balance: currentBalance,
          new_balance: newBalance,
          old_paid: parseFloat(record.paid),
          new_paid: newPaid,
          status: newStatus,
        });

        updates.push({
          id: record.id,
          paid: newPaid,
          balance: newBalance,
          status: newStatus,
        });

        remainingAmount -= amountToPay;
      }
    }

    if (distribution.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "No pending months found. All months are already paid!",
      });
    }

    // Update monthly_rent table
    for (const update of updates) {
      await connection.execute(`
        UPDATE monthly_rent 
        SET paid = ?, balance = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `, [update.paid, update.balance, update.status, update.id]);
    }

    // Create payment record
    const totalPaidAmount = parseFloat(paymentData.amount);
    const totalRent = monthlyRecords.reduce((sum, r) => sum + parseFloat(r.rent), 0);
    const totalPaidBefore = monthlyRecords.reduce((sum, r) => sum + parseFloat(r.paid), 0);
    const totalPendingBefore = totalRent - totalPaidBefore;
    const totalPendingAfter = totalPendingBefore - totalPaidAmount;

    const paymentRecord = {
      tenant_id: paymentData.tenant_id,
      booking_id: paymentData.booking_id,
      payment_type: "rent",
      amount: totalPaidAmount,
      total_amount: totalRent,
      previous_balance: totalPendingBefore,
      new_balance: totalPendingAfter,
      discount_amount: paymentData.discount_amount || 0,
      payment_mode: paymentData.payment_mode,
      bank_name: paymentData.bank_name || null,
      transaction_id: paymentData.transaction_id || null,
      payment_date: paymentData.payment_date,
      month: paymentData.month || new Date().toLocaleString("default", { month: "long" }),
      year: paymentData.year || new Date().getFullYear(),
      remark: paymentData.remark || `Payment of ₹${totalPaidAmount} distributed to ${distribution.length} month(s)`,
      status: paymentData.source === 'admin' ? 'paid' : 'pending',
       source: paymentData.source || "admin",
    };

    const [paymentResult] = await connection.execute(`
      INSERT INTO payments (
        tenant_id, booking_id, payment_type, amount, total_amount, 
        previous_balance, new_balance, discount_amount, payment_mode, 
        bank_name, transaction_id, payment_date, month, year, remark, 
        status,source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, NOW(), NOW())
    `, [
      paymentRecord.tenant_id,
      paymentRecord.booking_id,
      paymentRecord.payment_type,
      paymentRecord.amount,
      paymentRecord.total_amount,
      paymentRecord.previous_balance,
      paymentRecord.new_balance,
      paymentRecord.discount_amount,
      paymentRecord.payment_mode,
      paymentRecord.bank_name,
      paymentRecord.transaction_id,
      paymentRecord.payment_date,
      paymentRecord.month,
      paymentRecord.year,
      paymentRecord.remark,
      paymentRecord.status,
      paymentRecord.source
    ]);

    await connection.commit();
    connection.release();

   // ✅ Send email to property manager ONLY if payment is from tenant dashboard
if (paymentData.source === 'tenant') {
  try {
    // Fetch tenant details
    const [tenantRows] = await db.execute(
      `SELECT id, full_name, email, phone FROM tenants WHERE id = ?`,
      [paymentData.tenant_id]
    );
    const tenant = tenantRows[0];
    
    // Fetch property details from bed assignment
    const [propertyRows] = await db.execute(`
      SELECT 
        p.id, p.name, p.address, p.property_manager_name, p.property_manager_email, p.property_manager_phone,
        r.room_number,
        ba.bed_number
      FROM bed_assignments ba
      JOIN rooms r ON ba.room_id = r.id
      JOIN properties p ON r.property_id = p.id
      WHERE ba.tenant_id = ? AND ba.is_available = 0
    `, [paymentData.tenant_id]);
    
    const propertyInfo = propertyRows[0];
    
    if (propertyInfo && propertyInfo.property_manager_email) {
      await paymentController.sendPropertyManagerPaymentEmail(
        paymentData,
        tenant,
        propertyInfo,
        { bed_number: propertyInfo.bed_number, room_number: propertyInfo.room_number }
      );
    }
  } catch (emailError) {
    console.error("Failed to send property manager email:", emailError);
    // Don't block the response
  }
} else {
  console.log(`📧 Skipping email - Payment source is: ${paymentData.source} (not tenant)`);
}

    res.status(201).json({
      success: true,
      message: "Rent payment created and distributed successfully",
      data: {
        id: paymentResult.insertId,
        payment_status: paymentRecord.status,
        distribution: distribution,
        remaining_amount: remainingAmount,
        summary: {
          total_paid: totalPaidAmount,
          months_affected: distribution.length,
          previous_pending: totalPendingBefore,
          current_pending: totalPendingAfter,
        },
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment",
      error: error.message,
    });
  }
},

  async getLatestRentPayment(req, res) {
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

  async getTenantPaymentsForCheck(req, res) {
  try {
    const { tenantId } = req.params;
    
    const [payments] = await db.execute(`
      SELECT id, amount, status, payment_type, payment_date
      FROM payments 
      WHERE tenant_id = ? 
      AND status IN ('approved', 'pending', 'paid')
      ORDER BY payment_date DESC
    `, [tenantId]);
    
    res.status(200).json({
      success: true,
      data: payments,
      hasPayments: payments.length > 0,
      count: payments.length
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

  // Get payment by ID
  async getPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment",
        error: error.message,
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
        year: req.query.year,
      };

      const payments = await Payment.getAll(filters);

      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments,
      });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
        error: error.message,
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
        data: payments,
      });
    } catch (error) {
      console.error("Error fetching booking payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking payments",
        error: error.message,
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
        data: payments,
      });
    } catch (error) {
      console.error("Error fetching tenant payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tenant payments",
        error: error.message,
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
          message: "Tenant not found or no active bed assignment",
        });
      }

      res.status(200).json({
        success: true,
        data: formData,
      });
    } catch (error) {
      console.error("Error fetching payment form data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment form data",
        error: error.message,
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
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching payment stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment statistics",
        error: error.message,
      });
    }
  },

  // Upload payment proof
  async uploadPaymentProof(req, res) {
    try {
      const { id } = req.params;

      uploadProof(req, res, async function (err) {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No file uploaded",
          });
        }

        const proofUrl = `/uploads/payment-proofs/${req.file.filename}`;

        const [result] = await db.execute(
          `UPDATE payments 
           SET payment_proof = ?, proof_uploaded_at = NOW() 
           WHERE id = ?`,
          [proofUrl, id],
        );

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Payment not found",
          });
        }

        res.json({
          success: true,
          message: "Payment proof uploaded successfully",
          data: {
            proof_url: proofUrl,
          },
        });
      });
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload payment proof",
      });
    }
  },

  // Get payment proof
  async getPaymentProof(req, res) {
    try {
      const { id } = req.params;

      const [rows] = await db.execute(
        "SELECT payment_proof FROM payments WHERE id = ?",
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      res.json({
        success: true,
        data: {
          proof_url: rows[0].payment_proof,
        },
      });
    } catch (error) {
      console.error("Error fetching payment proof:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment proof",
      });
    }
  },

  // Get all receipts
  async getReceipts(req, res) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
      };

      const receipts = await Payment.getReceipts(filters);

      res.status(200).json({
        success: true,
        count: receipts.length,
        data: receipts,
      });
    } catch (error) {
      console.error("Error fetching receipts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch receipts",
        error: error.message,
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
          message: "Receipt not found",
        });
      }

      res.status(200).json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      console.error("Error fetching receipt:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch receipt",
        error: error.message,
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
          message: "Receipt not found",
        });
      }

      const html = generateReceiptHTML(receipt);
      res.send(html);
    } catch (error) {
      console.error("Error previewing receipt:", error);
      res.status(500).json({
        success: false,
        message: "Failed to preview receipt",
        error: error.message,
      });
    }
  },

async downloadReceipt(req, res) {
  try {
    const { id } = req.params;
    const receipt = await Payment.getReceiptById(id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    // Fetch settings from database
    const [settingsRows] = await db.execute(
      "SELECT setting_key, value FROM app_settings",
    );

    const settings = {};
    settingsRows.forEach((row) => {
      settings[row.setting_key] = { value: row.value };
    });

    // Generate professional PDF using Puppeteer
    const pdfBuffer = await ReceiptGenerator.generateReceiptPDF(receipt, settings);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${receipt.id}.pdf`,
    );
    res.setHeader("Cache-Control", "no-cache");
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("Error downloading receipt:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download receipt",
      error: error.message,
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
        send_sms,
      } = req.body;

      if (!tenant_id || !amount || !due_date) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: tenant_id, amount, and due_date are required",
        });
      }

      // Create demand payment
      const demandData = {
        tenant_id,
        amount,
        due_date,
        payment_type: payment_type || "rent",
        description,
        late_fee: 0,
        created_by: req.user?.id || null,
      };

      const newDemand = await Payment.createDemand(demandData);

      // Send email notification if requested
      let emailSent = false;
      let emailError = null;

      if (newDemand && send_email === true) {
        try {
          // Get tenant details with property info
          const [tenantInfo] = await db.execute(
            `
          SELECT 
            t.id,
            t.full_name as tenant_name,
            t.email as tenant_email,
            t.phone as tenant_phone,
            r.room_number,
            ba.bed_number,
            p.name as property_name
          FROM tenants t
          LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
          LEFT JOIN rooms r ON ba.room_id = r.id
          LEFT JOIN properties p ON r.property_id = p.id
          WHERE t.id = ?
        `,
            [tenant_id],
          );

          const tenant = tenantInfo[0];

          if (!tenant || !tenant.tenant_email) {
            emailError = "Tenant email not found";
          } else {
            // Prepare variables for template
            const variables = {
              tenant_name: tenant.tenant_name || "Tenant",
              amount: amount.toLocaleString("en-IN"),
              due_date: new Date(due_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
              payment_type:
                payment_type === "rent" ? "Rent" : "Security Deposit",
              property_name: tenant.property_name || "Property",
              room_number: tenant.room_number || "N/A",
              bed_number: tenant.bed_number || "",
              bed_info: tenant.bed_number
                ? `<p>🛏️ Bed: #${tenant.bed_number}</p>`
                : "",
              payment_link: `${process.env.CLIENT_URL || "http://localhost:3000"}/tenant/payments?demand_id=${newDemand.id}&action=pay`,
              request_id: newDemand.id,
              status: "pending",
            };

            // Get email template
            const template = await getTemplate("reminder", "email");

            // Replace variables in subject and content
            const emailSubject = replaceVariables(template.subject, variables);
            const emailBody = replaceVariables(template.content, variables);

            // Send email
            await sendEmail(tenant.tenant_email, emailSubject, emailBody);
            emailSent = true;
            
          }
        } catch (emailErr) {
          console.error("Failed to send demand payment email:", emailErr);
          emailError = emailErr.message;
        }
      }

      // Create notification for tenant (in-app notification)
      if (newDemand) {
        try {
          const notificationController = require("../controllers/tenantNotificationController");

          let notificationMessage = `💰 Payment Request\n`;
          notificationMessage += `Amount: ₹${amount.toLocaleString()}\n`;
          notificationMessage += `Due Date: ${new Date(due_date).toLocaleDateString()}\n`;
          notificationMessage += `Payment Type: ${payment_type === "rent" ? "Rent" : "Security Deposit"}`;
          if (description) {
            notificationMessage += `\nNote: ${description}`;
          }

          await notificationController.createNotification({
            tenantId: tenant_id,
            title: `💰 Payment Request - ${payment_type === "rent" ? "Rent" : "Security Deposit"}`,
            message: notificationMessage,
            notificationType: "payment",
            relatedEntityType: "demand",
            relatedEntityId: newDemand.id,
            priority: "high",
          });
        } catch (notifError) {
          console.error("Failed to create in-app notification:", notifError);
        }
      }

      res.status(201).json({
        success: true,
        message: emailSent
          ? "Payment demand created and email sent successfully"
          : "Payment demand created successfully" +
            (emailError ? ` (Email failed: ${emailError})` : ""),
        data: {
          ...newDemand,
          total_amount: amount,
          email_sent: emailSent,
          email_error: emailError,
        },
      });
    } catch (error) {
      console.error("Error creating demand payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create payment demand",
        error: error.message,
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
        to_date: req.query.to_date,
      };

      const demands = await Payment.getDemands(filters);

      // Ensure we always return a valid response even if demands is null/undefined
      res.status(200).json({
        success: true,
        count: demands ? demands.length : 0,
        data: demands || [], // Always return an array
      });
    } catch (error) {
      console.error("Error fetching demands:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch demands",
        error: error.message,
        data: [], // Return empty array on error
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
          message: "Demand not found",
        });
      }

      res.status(200).json({
        success: true,
        data: demand,
      });
    } catch (error) {
      console.error("Error fetching demand:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch demand",
        error: error.message,
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
          message: "Demand not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Demand status updated successfully",
      });
    } catch (error) {
      console.error("Error updating demand status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update demand status",
        error: error.message,
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
        data: demands,
      });
    } catch (error) {
      console.error("Error fetching tenant pending demands:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tenant pending demands",
        error: error.message,
      });
    }
  },

  async approvePayment(req, res) {
    try {
      const { id } = req.params;
      const { approved_by } = req.body;

      const payment = await Payment.findById(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      if (payment.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Payment is already approved",
        });
      }

      if (payment.status === "rejected") {
        return res.status(400).json({
          success: false,
          message: "Rejected payments cannot be approved",
        });
      }

      // ✅ Only update payment status - monthly_rent already updated
      const approved = await Payment.approvePayment(id, approved_by);

      if (approved) {
        const approvedPayment = await Payment.getReceiptById(id);

        res.status(200).json({
          success: true,
          message: "Payment approved successfully. Receipt generated.",
          data: {
            id,
            status: "approved",
            receipt: approvedPayment,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to approve payment",
        });
      }
    } catch (error) {
      console.error("Error approving payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve payment",
        error: error.message,
      });
    }
  },

  // Helper function to update monthly_rent from payment
  async updateMonthlyRentFromPayment(payment) {
    const conn = await db.getConnection();

    try {
      // Get the monthly_rent record for this specific month
      const [monthlyRecord] = await conn.execute(
        `SELECT id, rent, paid, balance FROM monthly_rent 
       WHERE tenant_id = ? AND month = ? AND year = ?`,
        [payment.tenant_id, payment.month, payment.year],
      );

      if (monthlyRecord.length > 0) {
        // Update existing record
        const newPaid =
          parseFloat(monthlyRecord[0].paid) + parseFloat(payment.amount);
        const rent = parseFloat(monthlyRecord[0].rent);
        const newBalance = Math.max(0, rent - newPaid);
        const status =
          newPaid >= rent ? "paid" : newPaid > 0 ? "partial" : "pending";

        await conn.execute(
          `UPDATE monthly_rent 
         SET paid = ?, balance = ?, status = ?, updated_at = NOW()
         WHERE id = ?`,
          [newPaid, newBalance, status, monthlyRecord[0].id],
        );
      } else {
        // Create new record if it doesn't exist
        await conn.execute(
          `INSERT INTO monthly_rent (tenant_id, month, year, rent, paid, balance, discount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            payment.tenant_id,
            payment.month,
            payment.year,
            payment.total_amount || payment.amount,
            payment.amount,
            Math.max(
              0,
              (payment.total_amount || payment.amount) - payment.amount,
            ),
            0,
            "partial",
          ],
        );
      }

      conn.release();
      return true;
    } catch (error) {
      console.error("Error updating monthly_rent:", error);
      conn.release();
      return false;
    }
  },

  // Reject payment

  async rejectPayment(req, res) {
    try {
      const { id } = req.params;
      const { rejection_reason, rejection_reason_category_id, rejected_by } =
        req.body;

      if (!rejection_reason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      const payment = await Payment.findById(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      // Check if payment is already approved or rejected
      if (payment.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Approved payments cannot be rejected",
        });
      }

      if (payment.status === "rejected") {
        return res.status(400).json({
          success: false,
          message: "Payment is already rejected",
        });
      }

      const rejected = await Payment.rejectPayment(
        id,
        rejection_reason,
        rejection_reason_category_id,
        rejected_by,
      );

      if (rejected) {
        res.status(200).json({
          success: true,
          message: "Payment rejected successfully",
          data: { id, status: "rejected" },
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to reject payment",
        });
      }
    } catch (error) {
      console.error("Error rejecting payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reject payment",
        error: error.message,
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
          message: "Payment not found",
        });
      }

      // Check if payment can be updated
      if (payment.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Approved payments cannot be updated",
        });
      }

      const updated = await Payment.updatePayment(id, paymentData);

      if (updated) {
        const updatedPayment = await Payment.findById(id);
        res.status(200).json({
          success: true,
          message: "Payment updated successfully",
          data: updatedPayment,
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to update payment",
        });
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment",
        error: error.message,
      });
    }
  },

// In paymentController.js - Fixed deletePayment function

async deletePayment(req, res) {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // If it's an approved/paid payment, need to recalculate monthly_rent
    if (payment.status === 'approved' || payment.status === 'paid' || payment.status === 'pending') {
      // ✅ Get all monthly rent records for this tenant
      const [monthlyRecords] = await connection.execute(`
        SELECT id, month, year, rent, paid, balance, status
        FROM monthly_rent 
        WHERE tenant_id = ? 
        ORDER BY 
          year ASC,
          FIELD(month, 
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ) ASC
      `, [payment.tenant_id]);

      // ✅ Get all other approved payments (excluding the one being deleted)
      const [otherPayments] = await connection.execute(`
        SELECT id, amount, month, year, status
        FROM payments 
        WHERE tenant_id = ? 
          AND id != ?
          AND status IN ('approved', 'paid')
          AND payment_type = 'rent'
        ORDER BY payment_date ASC
      `, [payment.tenant_id, id]);

      // ✅ Recalculate paid amounts for each month from scratch
      // First, reset all months to 0 paid
      for (const record of monthlyRecords) {
        await connection.execute(`
          UPDATE monthly_rent 
          SET paid = 0, balance = rent, status = 'pending', updated_at = NOW()
          WHERE id = ?
        `, [record.id]);
      }

      // ✅ Apply all remaining payments to the months
      let remainingAmount = 0;
      for (const otherPayment of otherPayments) {
        let amountToDistribute = parseFloat(otherPayment.amount);
        
        for (const record of monthlyRecords) {
          if (amountToDistribute <= 0) break;
          
          const currentBalance = parseFloat(record.balance);
          if (currentBalance > 0) {
            const amountToPay = Math.min(amountToDistribute, currentBalance);
            const newPaid = parseFloat(record.paid) + amountToPay;
            const newBalance = currentBalance - amountToPay;
            const newStatus = newBalance === 0 ? "paid" : newPaid > 0 ? "partial" : "pending";

            await connection.execute(`
              UPDATE monthly_rent 
              SET paid = ?, balance = ?, status = ?, updated_at = NOW()
              WHERE id = ?
            `, [newPaid, newBalance, newStatus, record.id]);

            amountToDistribute -= amountToPay;
          }
        }
      }

      // ✅ Also update previous_balance and new_balance in payments table
      // Recalculate running totals for payments
      let runningBalance = monthlyRecords.reduce((sum, r) => sum + parseFloat(r.rent), 0);
      
      // Get all payments (excluding the one being deleted) sorted by date
      const [allPaymentsSorted] = await connection.execute(`
        SELECT id, amount, payment_date
        FROM payments 
        WHERE tenant_id = ? 
          AND id != ?
          AND status IN ('approved', 'paid')
          AND payment_type = 'rent'
        ORDER BY payment_date ASC
      `, [payment.tenant_id, id]);

      // Update running balances
      for (const p of allPaymentsSorted) {
        const paidAmount = parseFloat(p.amount);
        const newPreviousBalance = runningBalance;
        runningBalance = Math.max(0, runningBalance - paidAmount);
        
        await connection.execute(`
          UPDATE payments 
          SET previous_balance = ?, new_balance = ?, updated_at = NOW()
          WHERE id = ?
        `, [newPreviousBalance, runningBalance, p.id]);
      }
    }
    
    // Delete the payment
    const deleted = await Payment.deletePayment(id);
    
    if (deleted) {
      await connection.commit();
      connection.release();
      
      res.status(200).json({
        success: true,
        message: "Payment deleted successfully",
      });
    } else {
      await connection.rollback();
      connection.release();
      res.status(400).json({
        success: false,
        message: "Failed to delete payment",
      });
    }
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Error deleting payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete payment",
      error: error.message,
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
          message: "Tenant not found or no active bed assignment",
        });
      }

      res.status(200).json({
        success: true,
        data: depositInfo,
      });
    } catch (error) {
      console.error("Error fetching security deposit info:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch security deposit info",
        error: error.message,
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
        priority,
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
        priority || "medium",
      ]);

      res.status(201).json({
        success: true,
        message: "Admin notifications created successfully",
        count: result.affectedRows,
      });
    } catch (error) {
      console.error("Error creating admin notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create notification",
        error: error.message,
      });
    }
  },

async generateLedgerPDF(req, res) {
  try {
    const { tenantId } = req.params;

    // ✅ FIX: Get security deposit from bed_assignments, NOT from properties
    const [tenantRows] = await db.execute(`
      SELECT 
        t.id,
        t.full_name as name,
        t.salutation,
        t.phone,
        t.country_code,
        t.email,
        t.check_in_date,
        r.room_number,
        ba.bed_number,
        ba.tenant_rent as monthly_rent,
        ba.security_deposit as security_deposit,  -- ✅ FROM bed_assignments (correct)
        p.name as property_name,
        p.address as property_address
      FROM tenants t
      LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN rooms r ON ba.room_id = r.id
      LEFT JOIN properties p ON r.property_id = p.id
      WHERE t.id = ?
    `, [tenantId]);

    if (tenantRows.length === 0) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    const tenant = tenantRows[0];
    
    // ✅ Get security deposit amount from bed_assignments
    const securityDepositAmount = parseFloat(tenant.security_deposit) || 0;
    
    // ✅ Get ALL security deposit payments
    const [securityDepositPayments] = await db.execute(`
      SELECT id, amount, payment_date, payment_mode, transaction_id, status
      FROM payments 
      WHERE tenant_id = ? 
        AND payment_type = 'security_deposit'
        AND status IN ('approved', 'paid', 'pending')
      ORDER BY payment_date ASC
    `, [tenantId]);
    
    // ✅ Calculate correct total deposit paid
    const totalDepositPaid = securityDepositPayments
      .filter(p => p.status !== 'rejected')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    const depositPending = Math.max(0, securityDepositAmount - totalDepositPaid);

    // Fetch monthly rent records
    const [monthlyRentRecords] = await db.execute(`
      SELECT month, year, rent, paid, balance, discount, status, days
      FROM monthly_rent 
      WHERE tenant_id = ?
      ORDER BY 
        year ASC,
        FIELD(month, 
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ) ASC
    `, [tenantId]);

    // Fetch payments
    const [paymentRows] = await db.execute(`
      SELECT 
        id, amount, payment_date, payment_mode, bank_name,
        transaction_id, month, year, remark, status, payment_type,
        discount_amount, total_amount
      FROM payments 
      WHERE tenant_id = ?
      ORDER BY payment_date ASC
    `, [tenantId]);

    const payments = paymentRows.map(p => ({
      ...p,
      amount: parseFloat(p.amount),
      discount_amount: parseFloat(p.discount_amount) || 0,
      total_amount: parseFloat(p.total_amount) || p.amount
    }));

    // Build monthly summary from monthly_rent table
    const monthlySummary = {};
    let totalRentExpected = 0;
    let totalRentPaid = 0;
    let totalRentPending = 0;
    let totalDiscount = 0;

    for (const record of monthlyRentRecords) {
      const rentAmount = parseFloat(record.rent);
      const paidAmount = parseFloat(record.paid);
      const pendingAmount = rentAmount - paidAmount;
      
      const key = `${record.month} ${record.year}`;
      
      monthlySummary[key] = {
        month: record.month,
        year: record.year,
        totalRent: rentAmount,
        totalPaid: paidAmount,
        totalPending: pendingAmount,
        discount_amount: parseFloat(record.discount) || 0,
        status: record.status === 'paid' ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending'),
        is_prorated: record.days !== null && record.days > 0,
        prorated_days: record.days || 0
      };
      
      totalRentExpected += rentAmount;
      totalRentPaid += paidAmount;
      totalRentPending += pendingAmount;
      totalDiscount += parseFloat(record.discount) || 0;
    }

    // Get settings
    const [settingsRows] = await db.execute("SELECT setting_key, value FROM app_settings");
    const settings = {};
    settingsRows.forEach(row => { settings[row.setting_key] = { value: row.value }; });

    const siteName = settings.site_name?.value || "ROOMAC";
    const siteTagline = settings.site_tagline?.value || "Premium Living Spaces";
    const contactAddress = settings.contact_address?.value || "";
    const contactPhone = settings.contact_phone?.value || "";
    const contactEmail = settings.contact_email?.value || "";
    const companyLogo = settings.logo_header?.value 
      ? `${process.env.CLIENT_URL || "http://localhost:3001"}${settings.logo_header.value}`
      : null;

    // Calculate grand total
    const grandTotal = payments
      .filter(p => p.status === 'approved' || p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    // Prepare data for HTML template
    const templateData = {
      tenant: {
        name: tenant.name,
        salutation: tenant.salutation || "Mr.",
        phone: tenant.phone,
        country_code: tenant.country_code || "+91",
        email: tenant.email,
        check_in_date: tenant.check_in_date,
        room_number: tenant.room_number,
        bed_number: tenant.bed_number,
        property_name: tenant.property_name,
        property_address: tenant.property_address,
        monthly_rent: parseFloat(tenant.monthly_rent) || 0,
        security_deposit: securityDepositAmount,  // ✅ Correct value from bed_assignments
        months_since_joining: monthlyRentRecords.length
      },
      payments: payments,
      siteName,
      siteTagline,
      contactAddress,
      contactPhone,
      contactEmail,
      companyLogo,
      summary: {
        totalRentExpected: totalRentExpected,
        totalRentPaid: totalRentPaid,
        totalRentPending: totalRentPending,
        totalDiscount: totalDiscount,
        totalDiscountAmount: totalDiscount,
        totalDepositPaid: totalDepositPaid,  // ✅ Correct calculation
        depositPending: depositPending,      // ✅ Correct calculation
        grandTotal: grandTotal,
        monthlySummary: monthlySummary
      }
    };

    // Generate HTML and PDF
    const htmlContent = generateLedgerHTML(templateData);
    const pdfBuffer = await PDFGenerator.generateLedgerPDF(htmlContent);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ledger-${tenant.name.replace(/\s/g, "_")}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate PDF", error: error.message });
  }
},

async previewLedgerPDF(req, res) {
  try {
    const { tenantId } = req.params;

    // Fetch tenant data
    const [tenantRows] = await db.execute(`
      SELECT 
        t.id,
        t.full_name as name,
        t.salutation,
        t.phone,
        t.country_code,
        t.email,
        t.check_in_date,
        r.room_number,
        ba.bed_number,
        ba.tenant_rent as monthly_rent,
        ba.security_deposit as security_deposit,  -- ✅ FROM bed_assignments
        p.name as property_name,
        p.address as property_address
      FROM tenants t
      LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN rooms r ON ba.room_id = r.id
      LEFT JOIN properties p ON r.property_id = p.id
      WHERE t.id = ?
    `, [tenantId]);

    if (tenantRows.length === 0) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    const tenant = tenantRows[0];
     const securityDepositAmount = parseFloat(tenant.security_deposit) || 0;

    // Fetch monthly rent records
    const [monthlyRentRecords] = await db.execute(`
      SELECT month, year, rent, paid, balance, discount, status, days
      FROM monthly_rent 
      WHERE tenant_id = ?
      ORDER BY 
        year ASC,
        FIELD(month, 
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ) ASC
    `, [tenantId]);

    // Fetch payments
    const [paymentRows] = await db.execute(`
      SELECT 
        id, amount, payment_date, payment_mode, bank_name,
        transaction_id, month, year, remark, status, payment_type,
        discount_amount
      FROM payments 
      WHERE tenant_id = ?
      ORDER BY payment_date ASC
    `, [tenantId]);

    const payments = paymentRows.map(p => ({
      ...p,
      amount: parseFloat(p.amount),
      discount_amount: parseFloat(p.discount_amount) || 0
    }));


      // Get security deposit payments
    const [securityDepositPayments] = await db.execute(`
      SELECT id, amount, payment_date, payment_mode, transaction_id, status
      FROM payments 
      WHERE tenant_id = ? 
        AND payment_type = 'security_deposit'
        AND status IN ('approved', 'paid', 'pending')
      ORDER BY payment_date ASC
    `, [tenantId]);
    
    const totalDepositPaid = securityDepositPayments
      .filter(p => p.status !== 'rejected')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    const depositPending = Math.max(0, securityDepositAmount - totalDepositPaid);

    // Calculate deposit totals
    // const totalDepositPaid = payments
    //   .filter(p => p.payment_type === 'security_deposit' && (p.status === 'approved' || p.status === 'paid' || p.status === 'pending'))
    //   .reduce((sum, p) => sum + p.amount, 0);

    // const securityDeposit = parseFloat(tenant.security_deposit) || 0;
    // const depositPending = Math.max(0, securityDeposit - totalDepositPaid);

    // Create a map of payments by month to get discount amounts
    const paymentDiscountByMonth = {};
    for (const payment of payments) {
      if (payment.payment_type === 'rent') {
        const key = `${payment.month} ${payment.year}`;
        if (!paymentDiscountByMonth[key]) {
          paymentDiscountByMonth[key] = {
            discount: 0,
            amount: 0
          };
        }
        paymentDiscountByMonth[key].discount += payment.discount_amount;
        paymentDiscountByMonth[key].amount += payment.amount;
      }
    }

    // Build monthly summary from monthly_rent table
    const monthlySummary = {};
    let totalRentExpected = 0;
    let totalRentPaid = 0;
    let totalRentPending = 0;
    let totalDiscount = 0;

    for (const record of monthlyRentRecords) {
      const rentAmount = parseFloat(record.rent);
      const paidAmount = parseFloat(record.paid);
      const pendingAmount = rentAmount - paidAmount;
      
      const key = `${record.month} ${record.year}`;
      
      // Get discount from payments for this month
      const paymentDiscount = paymentDiscountByMonth[key]?.discount || 0;
      
      // Calculate original rent (rent + discount)
      const originalRent = rentAmount + paymentDiscount;
      
      monthlySummary[key] = {
        month: record.month,
        year: record.year,
        totalRent: rentAmount,
        original_rent: originalRent,
        full_monthly_rent: parseFloat(tenant.monthly_rent) || 0,
        discount_amount: paymentDiscount,
        totalPaid: paidAmount,
        totalPending: pendingAmount,
        status: record.status === 'paid' ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending'),
        is_prorated: record.days !== null && record.days > 0,
        prorated_days: record.days || 0
      };
      
      totalRentExpected += rentAmount;
      totalRentPaid += paidAmount;
      totalRentPending += pendingAmount;
      totalDiscount += paymentDiscount;
    }

    // Calculate total discount from payments
    const totalDiscountAmount = payments
      .filter(p => p.payment_type === 'rent' && (p.status === 'approved' || p.status === 'paid' || p.status === 'pending'))
      .reduce((sum, p) => sum + p.discount_amount, 0);

    // Get settings
    const [settingsRows] = await db.execute("SELECT setting_key, value FROM app_settings");
    const settings = {};
    settingsRows.forEach(row => { settings[row.setting_key] = { value: row.value }; });

    const siteName = settings.site_name?.value || "ROOMAC";
    const siteTagline = settings.site_tagline?.value || "Premium Living Spaces";
    const contactAddress = settings.contact_address?.value || "";
    const contactPhone = settings.contact_phone?.value || "";
    const contactEmail = settings.contact_email?.value || "";
    const companyLogo = settings.logo_header?.value 
      ? `${process.env.CLIENT_URL || "http://localhost:3001"}${settings.logo_header.value}`
      : null;

    const grandTotal = payments
      .filter(p => p.status === 'approved' || p.status === 'paid' || p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const templateData = {
      tenant: {
        name: tenant.name,
        salutation: tenant.salutation || "Mr.",
        phone: tenant.phone,
        country_code: tenant.country_code || "+91",
        email: tenant.email,
        check_in_date: tenant.check_in_date,
        room_number: tenant.room_number,
        bed_number: tenant.bed_number,
        property_name: tenant.property_name,
        property_address: tenant.property_address,
        monthly_rent: parseFloat(tenant.monthly_rent) || 0,
        security_deposit: securityDepositAmount,
        months_since_joining: monthlyRentRecords.length
      },
      payments: payments,
      siteName,
      siteTagline,
      contactAddress,
      contactPhone,
      contactEmail,
      companyLogo,
      summary: {
        totalRentExpected: totalRentExpected,
        totalRentPaid: totalRentPaid,
        totalRentPending: totalRentPending,
        totalDiscount: totalDiscount,
        totalDiscountAmount: totalDiscountAmount,
        totalDepositPaid: totalDepositPaid,
        depositPending: depositPending,
        grandTotal: grandTotal,
        monthlySummary: monthlySummary
      }
    };

    const htmlContent = generateLedgerHTML(templateData);
    const pdfBuffer = await PDFGenerator.generateLedgerPDF(htmlContent);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="ledger-preview.pdf"');
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("Preview Error:", error);
    res.status(500).json({ success: false, message: "Failed to preview report", error: error.message });
  }
},


// Add this endpoint in paymentController.js
async previewReceiptPDF(req, res) {
  try {
    const { id } = req.params;
    const receipt = await Payment.getReceiptById(id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    // Fetch settings from database
    const [settingsRows] = await db.execute(
      "SELECT setting_key, value FROM app_settings",
    );

    const settings = {};
    settingsRows.forEach((row) => {
      settings[row.setting_key] = { value: row.value };
    });

    // Generate PDF using Puppeteer
    const pdfBuffer = await ReceiptGenerator.generateReceiptPDF(receipt, settings);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=receipt.pdf");
    res.setHeader("Cache-Control", "no-cache");
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("Error previewing receipt:", error);
    res.status(500).json({
      success: false,
      message: "Failed to preview receipt",
      error: error.message,
    });
  }
},
};

// Helper function to generate receipt HTML
// Beautiful Professional Receipt HTML
function generateReceiptHTML(receipt) {
  const paymentDate = new Date(receipt.payment_date).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
  const createdDate = new Date(receipt.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
            <div class="amount-value">₹${parseFloat(receipt.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div class="amount-in-words">
              ${numberToWords(parseFloat(receipt.amount))} Rupees Only
            </div>
          </div>
          
          <div class="details-grid">
            <div class="detail-card">
              <div class="detail-icon"></div>
              <div class="detail-label">Tenant Details</div>
              <div class="detail-value">${receipt.tenant_name}</div>
              <div class="detail-sub">${receipt.tenant_phone || ""}</div>
              <div class="detail-sub">${receipt.tenant_email || ""}</div>
            </div>
            
            <div class="detail-card">
              <div class="detail-icon"></div>
              <div class="detail-label">Property Details</div>
              <div class="detail-value">${receipt.property_name || "RoomAC Properties"}</div>
              <div class="detail-sub">${receipt.room_number || ""} ${receipt.bed_number ? `• Bed #${receipt.bed_number}` : ""}</div>
              <div class="detail-sub">${receipt.property_address || ""}</div>
            </div>
            
            <div class="detail-card">
              <div class="detail-icon"></div>
              <div class="detail-label">Payment Details</div>
              <div class="detail-value">${receipt.payment_mode.toUpperCase()}</div>
              <div class="detail-sub">${receipt.bank_name ? `Bank: ${receipt.bank_name}` : ""}</div>
              <div class="detail-sub">Transaction ID: ${receipt.transaction_id || "N/A"}</div>
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
              <span class="payment-info-item">Monthly Rent: ₹${receipt.monthly_rent ? receipt.monthly_rent.toLocaleString("en-IN") : "N/A"}</span>
              <span class="payment-info-item">Paid: ₹${parseFloat(receipt.amount).toLocaleString("en-IN")}</span>
              <span class="payment-info-item">Status: Completed</span>
            </div>
          </div>
          
          ${
            receipt.remark
              ? `
          <div style="background: #fff3cd; border-left: 5px solid #ffc107; padding: 15px 20px; border-radius: 10px; margin-top: 20px;">
            <strong style="color: #856404;">📝 Remark:</strong>
            <p style="color: #856404; margin-top: 5px;">${receipt.remark}</p>
          </div>
          `
              : ""
          }
          
          <div class="barcode">*${receipt.id}${paymentDate.replace(/\//g, "")}*</div>
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
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";

  const numToWords = (n) => {
    if (n < 20) return ones[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + numToWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        numToWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + numToWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        numToWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + numToWords(n % 100000) : "")
      );
    return (
      numToWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + numToWords(n % 10000000) : "")
    );
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = numToWords(rupees);
  if (paise > 0) {
    result += " and " + numToWords(paise) + " Paise";
  }

  return result;
}



module.exports = paymentController;
