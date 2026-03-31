
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

      // Log the incoming data for debugging
      console.log('📋 Booking data received:', {
        id_proof_type: data.id_proof_type,
        id_proof_number: data.id_proof_number,
        address_proof_type: data.address_proof_type,
        address_proof_number: data.address_proof_number,
        partner_id_proof_type: data.partner_id_proof_type,
        partner_id_proof_number: data.partner_id_proof_number,
        partner_address_proof_type: data.partner_address_proof_type,
        partner_address_proof_number: data.partner_address_proof_number,
        bedNumber: data.bedNumber,
        roomId: data.roomId,
        files: Object.keys(files)
      });

      // Validate required fields
      if (!data.propertyId || !data.roomId || !data.fullName || !data.phone) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "Missing fields" });
      }

      // Validate bed number is provided
      if (!data.bedNumber) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "Please select a specific bed" });
      }

      if (!data.gender) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "Gender is required" });
      }

      // Parse boolean values properly
      data.isCouple = data.isCouple === "true" || data.isCouple === true;

      // Validate partner details if couple booking
      if (data.isCouple) {
        if (!data.partner_full_name || !data.partner_phone || !data.partner_gender) {
          await conn.rollback();
          conn.release();
          return res
            .status(400)
            .json({ success: false, message: "Partner details are required for couple booking" });
        }
      }

      // ========== FIX: Check if bed is available ==========
      // First, get room info to know total beds
      const [roomInfo] = await conn.execute(
        `SELECT id, total_bed, occupied_beds FROM rooms WHERE id = ?`,
        [data.roomId]
      );

      if (roomInfo.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({
          success: false,
          message: "Room not found"
        });
      }

      // Check if bed assignment exists for this room and bed number
      const [bedCheck] = await conn.execute(
        `SELECT id, bed_number, is_available, tenant_id 
         FROM bed_assignments 
         WHERE room_id = ? AND bed_number = ?`,
        [data.roomId, data.bedNumber]
      );

      console.log('🔍 Bed check result:', bedCheck);

      // If bed doesn't exist, we need to create it first
      if (bedCheck.length === 0) {
        console.log('📝 Bed does not exist, will create it');
        // Bed will be created in the assignBed function
      } else {
        // Bed exists, check if it's occupied
        const bed = bedCheck[0];
        // is_available = 1 means available, 0 means occupied
        if (bed.is_available === 0 || bed.tenant_id !== null) {
          await conn.rollback();
          conn.release();
          return res.status(409).json({
            success: false,
            message: `Bed ${data.bedNumber} is already occupied. Please select another bed.`
          });
        }
      }

      // Check if files exist for main documents
      if (!files.id_proof_url || !files.id_proof_url[0]) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "ID proof document is required" });
      }

      if (!files.address_proof_url || !files.address_proof_url[0]) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "Address proof document is required" });
      }

      // Validate document types and numbers
      if (!data.id_proof_type || !data.id_proof_number) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "ID proof type and number are required" });
      }

      if (!data.address_proof_type || !data.address_proof_number) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "Address proof type and number are required" });
      }

      // Validate partner documents if couple booking
      if (data.isCouple) {
        if (!data.partner_id_proof_type || !data.partner_id_proof_number) {
          await conn.rollback();
          conn.release();
          return res
            .status(400)
            .json({ success: false, message: "Partner ID proof type and number are required" });
        }

        if (!data.partner_address_proof_type || !data.partner_address_proof_number) {
          await conn.rollback();
          conn.release();
          return res
            .status(400)
            .json({ success: false, message: "Partner address proof type and number are required" });
        }

        if (!files.partner_id_proof_url || !files.partner_id_proof_url[0]) {
          await conn.rollback();
          conn.release();
          return res
            .status(400)
            .json({ success: false, message: "Partner ID proof document is required" });
        }

        if (!files.partner_address_proof_url || !files.partner_address_proof_url[0]) {
          await conn.rollback();
          conn.release();
          return res
            .status(400)
            .json({ success: false, message: "Partner address proof document is required" });
        }
      }

      // Normalize booking type
      data.bookingType = data.bookingType === "short" ? "daily" : "monthly";
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
          [data.roomId]
        );
        
        if (roomRows.length > 0) {
          const preferences = roomRows[0].room_gender_preference;
          let prefArray = [];
          
          if (preferences) {
            prefArray = Array.isArray(preferences) 
              ? preferences 
              : typeof preferences === 'string' 
                ? preferences.split(',').map(p => p.trim())
                : [];
          }
          
          const allowsCouples = prefArray.some(p => 
            p.toLowerCase() === 'couples' || 
            p.toLowerCase() === 'both' || 
            p.toLowerCase() === 'mixed'
          );
          
          if (!allowsCouples) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ 
              success: false, 
              message: "Selected room does not allow couple bookings" 
            });
          }
        }
      }

      // Check room availability for daily bookings
      if (
        data.bookingType === "daily" &&
        data.checkInDate &&
        data.checkOutDate
      ) {
        const available = await Booking.checkRoomAvailability(
          data.roomId,
          data.checkInDate,
          data.checkOutDate,
        );

        if (!available) {
          await conn.rollback();
          conn.release();
          return res
            .status(409)
            .json({ success: false, message: "Room not available" });
        }
      }

      // Create booking record
      const booking = await Booking.create(data);

      let tenant = null;
      let enquiry = null;

      if (data.paymentMethod === "online") {
        tenant = await TenantModel.findByEmailOrPhone(data.email, data.phone);

        if (!tenant) {
          // Create tenant with all details including partner and documents
          const tenantId = await TenantModel.createFromBooking(
            { 
              ...data,
              // Document URLs
              id_proof_url: idProofUrl,
              address_proof_url: addressProofUrl,
              partner_id_proof_url: partnerIdProofUrl,
              partner_address_proof_url: partnerAddressProofUrl,
            },
            { sharing_type: data.sharingType },
            { name: data.propertyName }
          );
          tenant = { id: tenantId };
        } else {
          // Update existing tenant with partner details if not already set
          if (data.isCouple && (!tenant.partner_full_name || !tenant.partner_phone)) {
            await TenantModel.update(tenant.id, {
              partner_full_name: data.partner_full_name,
              partner_phone: data.partner_phone,
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
            });
          }
        }

        // ========== ASSIGN THE BED TO THE TENANT ==========
        // Get the rent value from the booking
        let rentValue = data.monthlyRent || data.rentAmount || 0;
        
        // Parse rent as number
        rentValue = parseFloat(rentValue);
        if (isNaN(rentValue)) rentValue = 0;
        
        const isCoupleValue = data.isCouple === true;
        
        console.log('📝 Assigning bed:', {
          roomId: parseInt(data.roomId),
          bedNumber: parseInt(data.bedNumber),
          tenantId: tenant.id,
          gender: data.gender,
          rent: rentValue,
          isCouple: isCoupleValue
        });

        // Call RoomModel.assignBed
        const bedAssignmentResult = await RoomModel.assignBed(
          parseInt(data.roomId),
          parseInt(data.bedNumber),
          tenant.id,
          data.gender,
          rentValue,
          isCoupleValue
        );

        if (!bedAssignmentResult.success) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({
            success: false,
            message: bedAssignmentResult.message || "Failed to assign bed"
          });
        }

        console.log('✅ Bed assigned successfully:', bedAssignmentResult.data);

        // Create payment record
        await Payment.create({
          tenant_id: tenant.id,
          booking_id: booking.id,
          amount: data.totalAmount,
          payment_mode: "online",
          status: "completed",
        });

        await Booking.updatePaymentStatus(booking.id, "paid");
      } else {
        // In-person booking - create enquiry (no bed assignment yet)
        enquiry = await EnquiryModel.createFromBooking(
          { 
            ...data,
            gender: data.gender,
            id_proof_url: idProofUrl,
            address_proof_url: addressProofUrl,
            partner_id_proof_url: partnerIdProofUrl,
            partner_address_proof_url: partnerAddressProofUrl,
          }, 
          { name: data.propertyName }
        );
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
          : "Booking submitted! We'll contact you to complete the booking."
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