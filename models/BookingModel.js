
// models/BookingModel.js
const db = require("../config/db");

const Booking = {

async create(data) {
  const sql = `
    INSERT INTO bookings (
      tenant_id,
      property_id,
      room_id,
      is_couple,
      booking_type,
      tenant_name,
      email,
      phone,
      status,
      monthly_rent,
      daily_rate,
      security_deposit,
      total_amount,
      original_amount,
      discount_amount,
      offer_code,
      offer_id,
      offer_title,
      discount_type,
      payment_status,
      check_in_date,
      check_out_date,
      move_in_date,
      salutation,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const values = [
    data.tenantId || null,
    data.propertyId,
    data.roomId,
    data.isCouple ? 1 : 0,
    data.bookingType,
    data.fullName,
    data.email,
    data.phone,
    "active",
    data.monthlyRent || 0,
    data.dailyRate || 0,
    data.securityDeposit || 0,
    data.totalAmount,           // Final amount after discount
    data.originalAmount,        // Original amount before discount
    data.discountAmount,        // Discount amount applied
    data.offerCode || null,     // Offer code used
    data.offerId || null,       // Offer ID
    data.offerTitle || null,    // Offer title
    data.discountType || null,  // Percentage or fixed
    data.paymentStatus || "pending",
    data.checkInDate || null,
    data.checkOutDate || null,
    data.moveInDate || null,
    data.salutation || null,
  ];

  const [result] = await db.execute(sql, values);
  return { id: result.insertId };
},

  async findById(id) {
    const [rows] = await db.execute("SELECT * FROM bookings WHERE id = ?", [
      id,
    ]);
    return rows[0];
  },

  async findByProperty(propertyId) {
    const [rows] = await db.execute(
      "SELECT * FROM bookings WHERE property_id = ? ORDER BY created_at DESC",
      [propertyId],
    );
    return rows;
  },

  async findByTenant(email, phone) {
    let sql = "SELECT * FROM bookings WHERE ";
    let params = [];

    if (email && phone) {
      sql += "email = ? OR phone = ?";
      params = [email, phone];
    } else if (email) {
      sql += "email = ?";
      params = [email];
    } else {
      sql += "phone = ?";
      params = [phone];
    }

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async updateStatus(id, status) {
    const [result] = await db.execute(
      "UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, id],
    );
    return result.affectedRows > 0;
  },

  async updatePaymentStatus(id, status) {
    const [result] = await db.execute(
      "UPDATE bookings SET payment_status = ?, updated_at = NOW() WHERE id = ?",
      [status, id],
    );
    return result.affectedRows > 0;
  },

  async getAll(filters = {}) {
    let sql = "SELECT * FROM bookings WHERE 1=1";
    let params = [];

    if (filters.status) {
      sql += " AND status = ?";
      params.push(filters.status);
    }

    if (filters.payment_status) {
      sql += " AND payment_status = ?";
      params.push(filters.payment_status);
    }

    if (filters.booking_type) {
      sql += " AND booking_type = ?";
      params.push(filters.booking_type);
    }

    if (filters.is_couple !== undefined) {
      sql += " AND is_couple = ?";
      params.push(filters.is_couple ? 1 : 0);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async checkRoomAvailability(roomId, checkIn, checkOut) {
    const sql = `
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE room_id = ?
      AND booking_type = 'daily'
      AND status = 'active'
      AND (
        (check_in_date <= ? AND check_out_date >= ?)
      )
    `;

    const [rows] = await db.execute(sql, [roomId, checkOut, checkIn]);

    return rows[0].count === 0;
  },

  async getStats(propertyId) {
    let sql = `
      SELECT
        COUNT(*) total,
        SUM(status='active') active,
        SUM(status='completed') completed,
        SUM(status='cancelled') cancelled,
        SUM(is_couple=1) couple_bookings,
        SUM(is_couple=0) individual_bookings
      FROM bookings
      WHERE 1=1
    `;
    let params = [];

    if (propertyId) {
      sql += " AND property_id = ?";
      params.push(propertyId);
    }

    const [rows] = await db.execute(sql, params);
    return rows[0];
  },

  async getCoupleBookings(propertyId) {
    let sql = "SELECT * FROM bookings WHERE is_couple = 1";
    let params = [];

    if (propertyId) {
      sql += " AND property_id = ?";
      params.push(propertyId);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
  },
};

module.exports = Booking;