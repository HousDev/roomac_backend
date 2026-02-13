const db = require("../config/db");

const Booking = {
  // Create a new booking
  async create(bookingData) {
    const query = `
      INSERT INTO bookings (
        property_id, room_id, booking_type, tenant_name, email, phone,
        status, monthly_rent, daily_rate, security_deposit, total_amount,
        payment_status, check_in_date, check_out_date, move_in_date,
        salutation, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      bookingData.propertyId,
      bookingData.roomId,
      bookingData.bookingType,
      bookingData.fullName,
      bookingData.email,
      bookingData.phone,
      bookingData.bookingStatus || 'pending',
      bookingData.monthlyRent || 0,
      bookingData.dailyRate || 0,
      bookingData.securityDeposit || 0,
      bookingData.totalAmount,
      bookingData.paymentStatus || 'pending',
      bookingData.checkInDate || null,
      bookingData.checkOutDate || null,
      bookingData.moveInDate || null,
      bookingData.salutation || null
    ];

    try {
      const [result] = await db.execute(query, values);
      return { id: result.insertId, ...bookingData };
    } catch (error) {
      throw error;
    }
  },

  // Get booking by ID
  async findById(id) {
    const query = `
      SELECT b.*, p.name as property_name, r.room_number 
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ?
    `;
    
    try {
      const [rows] = await db.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get bookings by property
  async findByProperty(propertyId) {
    const query = `
      SELECT b.*, r.room_number 
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.property_id = ?
      ORDER BY b.created_at DESC
    `;
    
    try {
      const [rows] = await db.execute(query, [propertyId]);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  // Get bookings by tenant email/phone
  async findByTenant(email, phone) {
    let query = 'SELECT * FROM bookings WHERE ';
    let params = [];
    
    if (email && phone) {
      query += 'email = ? OR phone = ?';
      params = [email, phone];
    } else if (email) {
      query += 'email = ?';
      params = [email];
    } else if (phone) {
      query += 'phone = ?';
      params = [phone];
    }
    
    query += ' ORDER BY created_at DESC';
    
    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  // Update booking status
  async updateStatus(id, status) {
    const query = 'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?';
    
    try {
      const [result] = await db.execute(query, [status, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  },

  // Update payment status
  async updatePaymentStatus(id, paymentStatus) {
    const query = 'UPDATE bookings SET payment_status = ?, updated_at = NOW() WHERE id = ?';
    
    try {
      const [result] = await db.execute(query, [paymentStatus, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  },

  // Get all bookings with filters
  async getAll(filters = {}) {
    let query = `
      SELECT b.*, p.name as property_name, r.room_number 
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    let params = [];

    if (filters.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }

    if (filters.payment_status) {
      query += ' AND b.payment_status = ?';
      params.push(filters.payment_status);
    }

    if (filters.booking_type) {
      query += ' AND b.booking_type = ?';
      params.push(filters.booking_type);
    }

    if (filters.property_id) {
      query += ' AND b.property_id = ?';
      params.push(filters.property_id);
    }

    if (filters.start_date && filters.end_date) {
      query += ' AND DATE(b.created_at) BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }

    query += ' ORDER BY b.created_at DESC';

    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  // Check room availability for dates
  async checkRoomAvailability(roomId, checkInDate, checkOutDate, bookingId = null) {
    let query = `
      SELECT COUNT(*) as conflicting_bookings
      FROM bookings
      WHERE room_id = ?
      AND status IN ('confirmed', 'pending')
      AND (
        (check_in_date <= ? AND check_out_date >= ?) OR
        (check_in_date <= ? AND check_out_date >= ?) OR
        (check_in_date >= ? AND check_out_date <= ?)
      )
    `;
    
    let params = [
      roomId, 
      checkOutDate, checkInDate,
      checkOutDate, checkInDate,
      checkInDate, checkOutDate
    ];

    // Exclude current booking when checking availability
    if (bookingId) {
      query += ' AND id != ?';
      params.push(bookingId);
    }

    try {
      const [rows] = await db.execute(query, params);
      return rows[0].conflicting_bookings === 0;
    } catch (error) {
      throw error;
    }
  },

  // Get booking statistics
  async getStats(propertyId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN booking_type = 'long' THEN 1 ELSE 0 END) as long_stay_bookings,
        SUM(CASE WHEN booking_type = 'short' THEN 1 ELSE 0 END) as short_stay_bookings
      FROM bookings
      WHERE 1=1
    `;
    let params = [];

    if (propertyId) {
      query += ' AND property_id = ?';
      params.push(propertyId);
    }

    try {
      const [rows] = await db.execute(query, params);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
};

module.exports = Booking;