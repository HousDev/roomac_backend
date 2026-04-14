// controllers/bookingController.js
const Booking = require("../models/BookingModel");
const Payment = require("../models/PaymentModel");
const TenantModel = require("../models/tenantModel");
const EnquiryModel = require("../models/enquiryModel");
const RoomModel = require("../models/roomModel");
const db = require("../config/db");

const bookingController = {
  // controllers/bookingController.js

 async createBooking(req, res) {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      let data = req.body;
      const files = req.files || {};
      console.log("📥 Received booking data:", data);

      
      // Validate required fields
      if (!data.propertyId || !data.roomId || !data.fullName || !data.phone) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "Missing fields" });
      }

      // Validate bed number is provided
      if (!data.bedNumber) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "Please select a specific bed" });
      }

      if (!data.gender) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "Gender is required" });
      }

      // Parse boolean values properly
      data.isCouple = data.isCouple === "true" || data.isCouple === true;

      // Validate partner details if couple booking
      if (data.isCouple) {
        if (!data.partner_full_name || !data.partner_phone || !data.partner_gender) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({
            success: false,
            message: "Partner details are required for couple booking",
          });
        }
      }

      // Check if bed is available
      const [roomInfo] = await conn.execute(
        `SELECT id, total_bed, occupied_beds FROM rooms WHERE id = ?`,
        [data.roomId],
      );

      if (roomInfo.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      // CHECK BED AVAILABILITY
      const [bedCheck] = await conn.execute(
        `SELECT id, bed_number, is_available, tenant_id 
         FROM bed_assignments 
         WHERE room_id = ? AND bed_number = ?`,
        [data.roomId, data.bedNumber],
      );


      if (bedCheck.length === 0) {
      } else {
        const bed = bedCheck[0];
        if (bed.is_available === 0 || bed.tenant_id !== null) {
          await conn.rollback();
          conn.release();
          return res.status(409).json({
            success: false,
            message: `Bed ${data.bedNumber} is already occupied. Please select another bed.`,
          });
        }
      }

      // Check if files exist for main documents
      if (!files.id_proof_url || !files.id_proof_url[0]) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "ID proof document is required" });
      }

      if (!files.address_proof_url || !files.address_proof_url[0]) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "Address proof document is required" });
      }

      // Validate document types and numbers
      if (!data.id_proof_type || !data.id_proof_number) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "ID proof type and number are required" });
      }

      if (!data.address_proof_type || !data.address_proof_number) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "Address proof type and number are required" });
      }

      // Validate partner documents if couple booking
      if (data.isCouple) {
        if (!data.partner_id_proof_type || !data.partner_id_proof_number) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ success: false, message: "Partner ID proof type and number are required" });
        }

        if (!data.partner_address_proof_type || !data.partner_address_proof_number) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ success: false, message: "Partner address proof type and number are required" });
        }

        if (!files.partner_id_proof_url || !files.partner_id_proof_url[0]) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ success: false, message: "Partner ID proof document is required" });
        }

        if (!files.partner_address_proof_url || !files.partner_address_proof_url[0]) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ success: false, message: "Partner address proof document is required" });
        }
      }

// Normalize booking type - handle both frontend values
if (data.bookingType === "short" || data.bookingType === "daily") {
    data.bookingType = "daily";  // Short stay
} else if (data.bookingType === "long" || data.bookingType === "monthly") {
    data.bookingType = "monthly"; // Long stay
}
      data.paymentStatus = "pending";
      data.tenantId = null;

      // Get file URLs
      const idProofFile = files.id_proof_url[0];
      const addressProofFile = files.address_proof_url[0];
      const partnerIdProofFile = files.partner_id_proof_url?.[0];
      const partnerAddressProofFile = files.partner_address_proof_url?.[0];

      const idProofUrl = `/uploads/id_proofs/${idProofFile.filename}`;
      const addressProofUrl = `/uploads/address_proofs/${addressProofFile.filename}`;
      const partnerIdProofUrl = partnerIdProofFile ? `/uploads/partner_id_proofs/${partnerIdProofFile.filename}` : null;
      const partnerAddressProofUrl = partnerAddressProofFile ? `/uploads/partner_address_proofs/${partnerAddressProofFile.filename}` : null;

      // For couple bookings, validate that room allows couples
      if (data.isCouple) {
        const [roomRows] = await conn.execute(
          "SELECT room_gender_preference FROM rooms WHERE id = ?",
          [data.roomId],
        );

        if (roomRows.length > 0) {
          const preferences = roomRows[0].room_gender_preference;
          let prefArray = [];

          if (preferences) {
            prefArray = Array.isArray(preferences)
              ? preferences
              : typeof preferences === "string"
                ? preferences.split(",").map((p) => p.trim())
                : [];
          }

          const allowsCouples = prefArray.some(
            (p) =>
              p.toLowerCase() === "couples" ||
              p.toLowerCase() === "both" ||
              p.toLowerCase() === "mixed",
          );

          if (!allowsCouples) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({
              success: false,
              message: "Selected room does not allow couple bookings",
            });
          }
        }
      }

      // Check room availability for daily bookings
      if (data.bookingType === "daily" && data.checkInDate && data.checkOutDate) {
        const available = await Booking.checkRoomAvailability(
          data.roomId,
          data.checkInDate,
          data.checkOutDate,
        );

        if (!available) {
          await conn.rollback();
          conn.release();
          return res.status(409).json({ success: false, message: "Room not available" });
        }
      }

      // Parse numeric values
      data.monthlyRent = parseFloat(data.monthlyRent) || 0;
      data.discountAmount = parseFloat(data.discountAmount) || 0;
      data.totalAmount = parseFloat(data.totalAmount) || 0;
      data.originalAmount = parseFloat(data.originalAmount) || 0;
      data.securityDeposit = parseFloat(data.securityDeposit) || 0;
      data.discountedRent = parseFloat(data.discountedRent) || 0;
      data.rentAmount = parseFloat(data.rentAmount) || 0;

      let tenant = null;
      let enquiry = null;
      let booking = null;

      if (data.paymentMethod === "online") {
        // ========== STEP 1: CREATE/FIND TENANT ==========
        tenant = await TenantModel.findByEmailOrPhone(data.email, data.phone);

        if (!tenant) {
          // Create tenant with all details including partner and documents
          const tenantId = await TenantModel.createFromBooking(
            {
              ...data,
               moveInDate: data.moveInDate,     
      checkInDate: data.checkInDate,    
      checkOutDate: data.checkOutDate, 
      bookingType: data.bookingType,    
              partner_salutation: data.partner_salutation || null,      
          partner_country_code: data.partner_country_code || null,
              id_proof_url: idProofUrl,
              address_proof_url: addressProofUrl,
              partner_id_proof_url: partnerIdProofUrl,
              partner_address_proof_url: partnerAddressProofUrl,
            },
            { sharing_type: data.sharingType },
            { name: data.propertyName },
          );
          tenant = { id: tenantId };
        } else {

          // Check if existing tenant already has an active bed assignment
          const [existingAssignment] = await conn.execute(
            `SELECT 
              ba.id, 
              ba.room_id, 
              ba.bed_number, 
              ba.tenant_rent,
              r.room_number,
              p.name as property_name
             FROM bed_assignments ba
             JOIN rooms r ON ba.room_id = r.id
             JOIN properties p ON r.property_id = p.id
             WHERE ba.tenant_id = ? AND ba.is_available = FALSE`,
            [tenant.id],
          );

          if (existingAssignment.length > 0) {
            const assign = existingAssignment[0];

            await conn.rollback();
            conn.release();
            return res.status(409).json({
              success: false,
              message: `This tenant (${tenant.full_name}) is already assigned to Room ${assign.room_number}, Bed ${assign.bed_number}. Please vacate the existing assignment first.`,
              existingAssignment: {
                id: assign.id,
                room_id: assign.room_id,
                bed_number: assign.bed_number,
                room_number: assign.room_number,
                property_name: assign.property_name,
              },
            });
          }

          // Update existing tenant with partner details if couple booking
          if (data.isCouple && (!tenant.partner_full_name || !tenant.partner_phone)) {
            await TenantModel.update(tenant.id, {
               partner_salutation: data.partner_salutation || null,
              partner_full_name: data.partner_full_name,
              partner_phone: data.partner_phone,
                partner_country_code: data.partner_country_code || null,
              partner_email: data.partner_email,
              partner_gender: data.partner_gender,
              partner_date_of_birth: data.partner_date_of_birth,
              partner_relationship: data.partner_relationship,
              partner_id_proof_type: data.partner_id_proof_type,
              partner_id_proof_number: data.partner_id_proof_number,
              partner_id_proof_url: partnerIdProofUrl,
              partner_address_proof_type: data.partner_address_proof_type,
              partner_address_proof_number: data.partner_address_proof_number,
              partner_address_proof_url: partnerAddressProofUrl,
              is_couple_booking: true,
              // ADD THESE LINES to update check_in_date and check_out_date for existing tenants
    check_in_date: data.bookingType === "monthly" ? data.moveInDate : data.checkInDate,
    check_out_date: data.bookingType !== "monthly" ? data.checkOutDate : null,
            });
          }
        }

        // ========== STEP 2: CREATE BOOKING WITH TENANT_ID ==========
        data.tenantId = tenant.id;
        booking = await Booking.create(data);

        // ========== STEP 3: ASSIGN THE BED ==========
        let rentValue =  data.rentAmount || data.discountedRent || data.monthlyRent || 0;
        rentValue = parseFloat(rentValue);
        if (isNaN(rentValue)) rentValue = 0;

        const isCoupleValue = data.isCouple === true;

        

        const bedAssignmentResult = await RoomModel.assignBed(
          parseInt(data.roomId),
          parseInt(data.bedNumber),
          tenant.id,
          data.gender,
          data.originalRentAmount,
          isCoupleValue,
        );

        if (!bedAssignmentResult.success) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({
            success: false,
            message: bedAssignmentResult.message || "Failed to assign bed",
          });
        }

 // ========== STEP 4: CREATE PAYMENTS ==========
// First, define all the variables we need
const originalRent = parseFloat(data.rentAmount) || parseFloat(data.originalRentAmount) || 0;
const discountedRent = parseFloat(data.discountedRentAmount) || parseFloat(data.monthlyRent) || 0;
const securityDeposit = parseFloat(data.securityDeposit) || 0;
const discountAmount = parseFloat(data.discountAmount) || 0;
const hasOffer = data.offerCode && data.offerCode !== '';
const proratedDaysFromFrontend = parseInt(data.prorated_days) || 0;
const proratedDailyRateFromFrontend = parseFloat(data.prorated_daily_rate) || 0;
const calculatedRentAmount = parseFloat(data.calculatedRentAmount) || 0;
const originalRentAmount = parseFloat(data.originalRentAmount) || parseFloat(data.rentAmount) || 0;

console.log(`💰 Rent payment calculation:`);
console.log(`   Original Rent: ₹${originalRentAmount}`);
console.log(`   Prorated Days: ${proratedDaysFromFrontend}`);
console.log(`   Discount Amount: ₹${discountAmount}`);
console.log(`   Discounted Rent Amount: ₹${discountedRent}`);
console.log(`   Calculated Rent Amount: ₹${calculatedRentAmount}`);

// Calculate the correct rent amount to pay
let rentAmountToPay = 0;

if (hasOffer) {
  // For offer bookings, use discountedRentAmount (already includes proration + discount)
  rentAmountToPay = discountedRent;
} else {
  // For non-offer bookings, use calculatedRentAmount (prorated amount)
  rentAmountToPay = calculatedRentAmount || discountedRent || parseFloat(data.monthlyRent) || 0;
}

console.log(`💰 Final Rent payment amount: ₹${rentAmountToPay}`);

// Get move-in date or check-in date
const moveInDate = data.moveInDate || data.checkInDate;
const moveInDateObj = moveInDate ? new Date(moveInDate) : new Date();
const paymentMonth = moveInDateObj.toLocaleString('default', { month: 'long' });
const paymentYear = moveInDateObj.getFullYear();

// ========== PAYMENT 1: RENT PAYMENT ==========
if (rentAmountToPay > 0) {
  const rentPayment = await Payment.create({
    tenant_id: tenant.id,
    booking_id: booking.id,
    amount: rentAmountToPay,
    total_amount: rentAmountToPay,
    new_balance: 0,
    discount_amount: discountAmount,
    payment_date: moveInDate || new Date().toISOString().split('T')[0],
    payment_mode: "online",
    payment_type: "rent",
    month: paymentMonth,
    year: paymentYear,
    transaction_id: data.transaction_id,
    remark: `Rent payment for ${data.roomNumber} - Bed ${data.bedNumber} | Original: ₹${originalRentAmount.toLocaleString()} | ${proratedDaysFromFrontend > 0 ? `Prorated: ${proratedDaysFromFrontend} days | ` : ''}Discount: ₹${discountAmount.toLocaleString()} | Offer: ${data.offerCode || 'None'} | Transaction: ${data.transaction_id}`,
    status: "paid"
  });
  console.log(`✅ Rent payment created: ₹${rentAmountToPay}`);
} else {
  console.log(`⚠️ Rent amount is 0, skipping rent payment`);
}

// ========== PAYMENT 2: SECURITY DEPOSIT PAYMENT ==========
if (securityDeposit > 0) {
  const depositPayment = await Payment.create({
    tenant_id: tenant.id,
    booking_id: booking.id,
    total_amount: securityDeposit,
    amount: securityDeposit,
    new_balance: 0,
    payment_date: moveInDate || new Date().toISOString().split('T')[0],
    payment_mode: "online",
    payment_type: "security_deposit",
    month: paymentMonth,
    year: paymentYear,
    transaction_id: data.transaction_id,
    remark: `Security deposit for ${data.roomNumber} - Bed ${data.bedNumber} | Transaction: ${data.transaction_id}`,
    status: "paid"
  });
  console.log(`✅ Security deposit payment created: ₹${securityDeposit}`);
}

// ========== STEP 5: CREATE MONTHLY RENT RECORDS ==========
const checkInDate = data.moveInDate || data.checkInDate;
if (checkInDate && data.bookingType === "monthly") {
  const startDate = new Date(checkInDate);
  const currentDate = new Date();
  let createdCount = 0;
  
  // Use the already defined variables
  console.log(`📊 Booking data for first month calculation:`);
  console.log(`   Original Rent: ₹${originalRentAmount}`);
  console.log(`   Prorated Days: ${proratedDaysFromFrontend}`);
  console.log(`   Prorated Daily Rate: ₹${proratedDailyRateFromFrontend}`);
  console.log(`   Calculated Rent (before discount): ₹${calculatedRentAmount}`);
  console.log(`   Discounted Rent Amount: ₹${discountedRent}`);
  console.log(`   Discount Amount: ₹${discountAmount}`);
  console.log(`   Has Offer: ${hasOffer}`);
  
  // Calculate first month rent - use discountedRent for offer bookings
  let firstMonthRent = discountedRent;  // This already has proration + discount applied
  let firstMonthDays = proratedDaysFromFrontend;
  let discountApplied = discountAmount;
  
  // If no offer, use the calculated prorated amount
  if (!hasOffer) {
    firstMonthRent = calculatedRentAmount;
  }
  
  // If frontend didn't send calculated rent, calculate it
  if (firstMonthRent === 0 && firstMonthDays > 0) {
    const lastDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    const dailyRate = originalRentAmount / lastDayOfMonth;
    firstMonthRent = Math.round(dailyRate * firstMonthDays);
    console.log(`   Calculated prorated rent: ₹${firstMonthRent}`);
  }
  
  // If no proration (check-in on 1st), use full rent
  if (firstMonthDays === 0 || startDate.getDate() === 1) {
    firstMonthRent = hasOffer ? discountedRent : originalRentAmount;
    firstMonthDays = null;
  }
  
  console.log(`📊 First month final: ${firstMonthDays ? `Prorated - ${firstMonthDays} days = ₹${firstMonthRent}` : `Full month - ₹${firstMonthRent}`}`);
  
  // Generate months from check-in to current date
  let tempDate = new Date(startDate);
  tempDate.setDate(1);
  
  while (tempDate <= currentDate) {
    const monthName = tempDate.toLocaleString('default', { month: 'long' });
    const year = tempDate.getFullYear();
    
    const [existing] = await conn.execute(
      `SELECT id FROM monthly_rent WHERE tenant_id = ? AND month = ? AND year = ?`,
      [tenant.id, monthName, year]
    );
    
    if (existing.length === 0) {
      let rentAmount = originalRentAmount;
      let discountAmountForMonth = 0;
      let paidAmount = 0;
      let balance = rentAmount;
      let status = 'pending';
      let daysCount = null;
      let originalRentValue = null;
      
      const isFirstMonth = (tempDate.getMonth() === startDate.getMonth() && 
                           tempDate.getFullYear() === startDate.getFullYear());
      
      if (isFirstMonth) {
        rentAmount = firstMonthRent;
        discountAmountForMonth = discountApplied;
        daysCount = firstMonthDays;
        originalRentValue = originalRentAmount;
        paidAmount = rentAmount;
        balance = 0;
        status = 'paid';
      }
      
      await conn.execute(`
        INSERT INTO monthly_rent (
          tenant_id, month, year, rent, paid, balance, discount, status,
          days, original_rent,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        tenant.id,
        monthName,
        year,
        rentAmount,
        paidAmount,
        balance,
        discountAmountForMonth,
        status,
        daysCount,
        originalRentValue
      ]);
      createdCount++;
      console.log(`✅ Created record for ${monthName} ${year} - Rent: ₹${rentAmount}${daysCount ? ` (Prorated: ${daysCount} days)` : ''}${discountAmountForMonth > 0 ? ` (Discount: ₹${discountAmountForMonth})` : ''}`);
    }
    
    tempDate.setMonth(tempDate.getMonth() + 1);
  }
}


        // Update booking payment status
        await Booking.updatePaymentStatus(booking.id, "paid");
        
      } else {
        // ========== IN-PERSON BOOKING ==========
        // Create enquiry first
        enquiry = await EnquiryModel.createFromBooking(
          {
            ...data,
            gender: data.gender,
            id_proof_url: idProofUrl,
            address_proof_url: addressProofUrl,
            partner_id_proof_url: partnerIdProofUrl,
            partner_address_proof_url: partnerAddressProofUrl,
          },
          { name: data.propertyName },
        );
        
        // Create booking without tenant_id (will be assigned later)
        booking = await Booking.create(data);
      }

      await conn.commit();
      conn.release();

      res.status(201).json({
        success: true,
        bookingId: booking.id,
        tenant,
        enquiry,
        isCouple: data.isCouple,
        assignedBed: data.bedNumber,
        message: data.paymentMethod === "online"
          ? "Booking confirmed and bed assigned successfully!"
          : "Booking submitted! We'll contact you to complete the booking.",
      });
      
    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error("Booking creation error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getBooking(req, res) {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false });
    res.json({ success: true, data: booking });
  },

  async getAllBookings(req, res) {
    const data = await Booking.getAll(req.query);
    res.json({ success: true, data });
  },

  async updateBookingStatus(req, res) {
    const ok = await Booking.updateStatus(req.params.id, req.body.status);
    res.json({ success: ok });
  },

  async getBookingsByProperty(req, res) {
    const data = await Booking.findByProperty(req.params.propertyId);
    res.json({ success: true, data });
  },

  async getBookingsByTenant(req, res) {
    const data = await Booking.findByTenant(req.query.email, req.query.phone);
    res.json({ success: true, data });
  },

  async checkAvailability(req, res) {
    const ok = await Booking.checkRoomAvailability(
      req.query.roomId,
      req.query.checkInDate,
      req.query.checkOutDate,
    );
    res.json({ success: true, available: ok });
  },

  async getBookingStats(req, res) {
    const stats = await Booking.getStats(req.query.propertyId);
    res.json({ success: true, data: stats });
  },

  async cancelBooking(req, res) {
    await Booking.updateStatus(req.params.id, "cancelled");
    res.json({ success: true });
  },

  // New endpoint to get couple bookings
  async getCoupleBookings(req, res) {
    const data = await Booking.getCoupleBookings(req.query.propertyId);
    res.json({ success: true, data });
  },
};

module.exports = bookingController;
