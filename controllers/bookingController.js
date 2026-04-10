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
          rentValue,
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
        const originalRent = parseFloat(data.rentAmount);
        const discountedRent = parseFloat(data.discountedRent);
        const securityDeposit = parseFloat(data.securityDeposit);
        const discountAmount = parseFloat(data.discountAmount);
        const hasOffer = data.offerCode && data.offerCode !== '';

        // Get move-in date or check-in date
      const moveInDate = data.moveInDate || data.checkInDate;
      const moveInDateObj = moveInDate ? new Date(moveInDate) : new Date();
      const paymentMonth = moveInDateObj.toLocaleString('default', { month: 'long' });
      const paymentYear = moveInDateObj.getFullYear();


      // Payment 1: RENT payment with discounted amount (FIRST MONTH - FULLY PAID)
  if (discountedRent > 0) {
    // For first month with offer, the discounted amount is fully paid
    // So new_balance should be 0, status should be 'paid'
    const rentPayment = await Payment.create({
      tenant_id: tenant.id,
      booking_id: booking.id,
      amount: discountedRent,
      total_amount: discountedRent,  // Total is the discounted amount since that's what they pay
      new_balance: 0,  // Fully paid, no balance
      discount_amount: discountAmount,
      payment_date: moveInDate || new Date().toISOString().split('T')[0],
      payment_mode: "online",
      payment_type: "rent",
      month: paymentMonth,
      year: paymentYear,
      transaction_id: data.transaction_id,
      remark: `Rent payment for ${data.roomNumber} - Bed ${data.bedNumber} | Original: ₹${originalRent.toLocaleString()} | Discount: ₹${discountAmount.toLocaleString()} | Offer: ${data.offerCode || 'None'} | First month fully paid Transaction: ${data.transaction_id}`,
      status: "paid"  // ✅ Set to 'paid' since they paid online
    });
  }

  // Payment 2: SECURITY DEPOSIT payment (full amount, fully paid)
  if (securityDeposit > 0) {
    const depositPayment = await Payment.create({
      tenant_id: tenant.id,
      booking_id: booking.id,
      total_amount: securityDeposit,
      amount: securityDeposit,
      new_balance: 0,  // Fully paid
      payment_date: moveInDate || new Date().toISOString().split('T')[0],
      payment_mode: "online",
      payment_type: "security_deposit",
      month: paymentMonth,
      year: paymentYear,
       transaction_id: data.transaction_id, 
      remark: `Security deposit for ${data.roomNumber} - Bed ${data.bedNumber} | Transaction: ${data.transaction_id}`,
      status: "paid"  // ✅ Set to 'paid'
    });
  }

  // ========== STEP 5: CREATE MONTHLY RENT RECORDS ==========
  const checkInDate = data.moveInDate || data.checkInDate;
  if (checkInDate && data.bookingType === "monthly") {
    const startDate = new Date(checkInDate);
    const currentDate = new Date();
    let createdCount = 0;
    
    // Generate months from check-in date to current date
    let tempDate = new Date(startDate);
    tempDate.setDate(1); // Start from first day of month
    
    while (tempDate <= currentDate) {
      const monthName = tempDate.toLocaleString('default', { month: 'long' });
      const year = tempDate.getFullYear();
      
      // Check if record already exists
      const [existing] = await conn.execute(
        `SELECT id FROM monthly_rent WHERE tenant_id = ? AND month = ? AND year = ?`,
        [tenant.id, monthName, year]
      );
      
      if (existing.length === 0) {
        // Calculate rent amount (first month gets discount and is FULLY PAID)
        let rentAmount = originalRent;
        let discountApplied = 0;
        let paidAmount = 0;
        let balance = rentAmount;
        let status = 'pending';
        
        const isFirstMonth = (tempDate.getMonth() === startDate.getMonth() && 
                             tempDate.getFullYear() === startDate.getFullYear());
        
         // 🔧 FIX: For first month, it should be FULLY PAID regardless of offer
      if (isFirstMonth) {
        if (hasOffer && discountedRent < originalRent) {
          // With offer: use discounted rent
          rentAmount = discountedRent;
          discountApplied = discountAmount;
        }
        // ✅ FIRST MONTH IS ALWAYS PAID (since payment is made online)
        paidAmount = rentAmount;  // ← CHANGE THIS: was 0, now rentAmount
        balance = 0;              // ← CHANGE THIS: was rentAmount, now 0
        status = 'paid';          // ← CHANGE THIS: was 'pending', now 'paid'
      }
        
        // Insert monthly rent record
        await conn.execute(
          `INSERT INTO monthly_rent (tenant_id, month, year, rent, paid, balance, discount, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            tenant.id,
            monthName,
            year,
            rentAmount,
            paidAmount,  // ✅ Set paid amount for first month
            balance,     // ✅ Set balance to 0 for first month
            discountApplied,
            status       // ✅ Set status to 'paid' for first month
          ]
        );
        createdCount++;
        console.log(`✅ Created monthly rent record for ${monthName} ${year} - Rent: ₹${rentAmount}, Paid: ₹${paidAmount}, Status: ${status}`);
      } else {
        // Update existing record if it's the first month and should be paid
        const isFirstMonth = (tempDate.getMonth() === startDate.getMonth() && 
                             tempDate.getFullYear() === startDate.getFullYear());
        
        if (hasOffer && isFirstMonth && discountedRent < originalRent) {
          await conn.execute(
            `UPDATE monthly_rent 
             SET paid = ?, balance = ?, status = ?, updated_at = NOW()
             WHERE tenant_id = ? AND month = ? AND year = ?`,
            [discountedRent, 0, 'paid', tenant.id, monthName, year]
          );
          console.log(`✅ Updated monthly rent record for ${monthName} ${year} to paid status`);
        }
      }
      
      tempDate.setMonth(tempDate.getMonth() + 1);
    }
    
    console.log(`📊 Created/Updated ${createdCount} monthly rent records for tenant ${tenant.id}`);
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
