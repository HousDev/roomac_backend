const db = require("../config/db");

const Payment = {
  // Create a new payment
  // DB columns: id, tenant_id, booking_id, amount, payment_date, payment_mode,
  //             transaction_id, status, month, year, notes, created_at, updated_at
  // NOTE: payment_type is NOT a DB column — stored in notes if needed
  async create(paymentData) {
    const query = `
      INSERT INTO payments (
        tenant_id, booking_id, amount, payment_date, payment_mode,
        transaction_id, status, month, year, notes, due_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    // If caller passed payment_type, append it to notes for record-keeping
    let notes = paymentData.notes || null;
    if (paymentData.payment_type && paymentData.payment_type !== 'rent') {
      notes = notes
        ? `[${paymentData.payment_type}] ${notes}`
        : `[${paymentData.payment_type}]`;
    }

    // Extract month/year from payment_date for easy filtering
    const paymentDate = paymentData.payment_date
      ? new Date(paymentData.payment_date)
      : new Date();
    const monthName = paymentDate.toLocaleString('default', { month: 'long' });
    const year = paymentDate.getFullYear();

    const values = [
      paymentData.tenant_id || null,
      paymentData.booking_id || null,           // nullable FK
      paymentData.amount,
      paymentData.payment_date || new Date().toISOString().split('T')[0],
      paymentData.payment_mode,                 // enum: cash|cheque|online|bank_transfer|card
      paymentData.transaction_id || null,
      paymentData.status || 'pending',          // enum: pending|completed|failed|refunded
      monthName,
      year,
      notes,
      paymentData.due_date || null,             // due_date (new column)
    ];

    try {
      const [result] = await db.execute(query, values);
      return { id: result.insertId, ...paymentData };
    } catch (error) {
      console.error("Payment insert error:", error.message);
      throw error;
    }
  },

  // Get payment by ID
  async findById(id) {
    const query = `
      SELECT p.*, b.tenant_name, b.email, b.phone, b.property_id
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.id = ?
    `;
    try {
      const [rows] = await db.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get payments by booking ID
  async findByBooking(bookingId) {
    const query = 'SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC';
    try {
      const [rows] = await db.execute(query, [bookingId]);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  // Get payments by tenant ID
  async findByTenant(tenantId) {
    const query = 'SELECT * FROM payments WHERE tenant_id = ? ORDER BY created_at DESC';
    try {
      const [rows] = await db.execute(query, [tenantId]);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  // Update payment status
  async updateStatus(id, status, transactionId = null) {
    let query = 'UPDATE payments SET status = ?, updated_at = NOW()';
    let params = [status];

    if (transactionId) {
      query += ', transaction_id = ?';
      params.push(transactionId);
    }

    query += ' WHERE id = ?';
    params.push(id);

    try {
      const [result] = await db.execute(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  },

  // Get all payments with filters
  async getAll(filters = {}) {
    let query = `
      SELECT p.*, b.tenant_name AS booking_tenant_name, b.property_id, b.booking_type
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE 1=1
    `;
    let params = [];

    if (filters.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }

    if (filters.payment_mode) {
      query += ' AND p.payment_mode = ?';
      params.push(filters.payment_mode);
    }

    if (filters.booking_id) {
      query += ' AND p.booking_id = ?';
      params.push(filters.booking_id);
    }

    if (filters.tenant_id) {
      query += ' AND p.tenant_id = ?';
      params.push(filters.tenant_id);
    }

    if (filters.start_date && filters.end_date) {
      query += ' AND DATE(p.payment_date) BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }

    query += ' ORDER BY p.created_at DESC';

    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  // Get payment statistics
  async getStats(propertyId = null) {
    let query = `
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN status = 'pending'   THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN payment_mode = 'online'        AND status = 'completed' THEN amount ELSE 0 END) as online_payments,
        SUM(CASE WHEN payment_mode = 'cash'          AND status = 'completed' THEN amount ELSE 0 END) as cash_payments,
        SUM(CASE WHEN payment_mode = 'card'          AND status = 'completed' THEN amount ELSE 0 END) as card_payments,
        SUM(CASE WHEN payment_mode = 'bank_transfer' AND status = 'completed' THEN amount ELSE 0 END) as bank_transfers,
        SUM(CASE WHEN payment_mode = 'cheque'        AND status = 'completed' THEN amount ELSE 0 END) as cheque_payments
      FROM payments
      WHERE 1=1
    `;
    let params = [];

    if (propertyId) {
      query += ' AND booking_id IN (SELECT id FROM bookings WHERE property_id = ?)';
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

module.exports = Payment;