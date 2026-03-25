
// controllers/bookingController.js
const Booking = require("../models/BookingModel");
const Payment = require("../models/PaymentModel");
const TenantModel = require("../models/tenantModel");
const EnquiryModel = require("../models/enquiryModel");
const db = require("../config/db");

const bookingController = {
  async createBooking(req, res) {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      let data = req.body;

      if (!data.propertyId || !data.roomId || !data.fullName || !data.phone) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "Missing fields" });
      }

      if (!data.gender) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "Gender is required" });
      }

      // normalize
      data.bookingType = data.bookingType === "short" ? "daily" : "monthly";
      data.paymentStatus = "pending";
      data.tenantId = null;
      data.isCouple = data.isCouple || false;

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

      const booking = await Booking.create(data);

      let tenant = null;
      let enquiry = null;

      if (data.paymentMethod === "online") {
        tenant = await TenantModel.findByEmailOrPhone(data.email, data.phone);

        if (!tenant) {
          const tenantId = await TenantModel.createFromBooking(
            { ...data, gender: data.gender },
            { sharing_type: data.sharingType },
            { name: data.propertyName },
          );
          tenant = { id: tenantId };
        }

        await Payment.create({
          tenant_id: tenant.id,
          booking_id: booking.id,
          amount: data.totalAmount,
          payment_mode: "online",
          status: "completed",
        });

        await Booking.updatePaymentStatus(booking.id, "paid");
      } else {
        enquiry = await EnquiryModel.createFromBooking(
          { ...data, gender: data.gender }, 
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