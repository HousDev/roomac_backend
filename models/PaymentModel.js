// const db = require("../config/db");

// const Payment = {
//   // Create a new payment
//   // DB columns: id, tenant_id, booking_id, amount, payment_date, payment_mode,
//   //             transaction_id, status, month, year, notes, created_at, updated_at
//   // NOTE: payment_type is NOT a DB column — stored in notes if needed
//   async create(paymentData) {
//     const query = `
//       INSERT INTO payments (
//         tenant_id, booking_id, amount, payment_date, payment_mode,
//         transaction_id, status, month, year, notes, due_date, created_at, updated_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
//     `;

//     // If caller passed payment_type, append it to notes for record-keeping
//     let notes = paymentData.notes || null;
//     if (paymentData.payment_type && paymentData.payment_type !== 'rent') {
//       notes = notes
//         ? `[${paymentData.payment_type}] ${notes}`
//         : `[${paymentData.payment_type}]`;
//     }

//     // Extract month/year from payment_date for easy filtering
//     const paymentDate = paymentData.payment_date
//       ? new Date(paymentData.payment_date)
//       : new Date();
//     const monthName = paymentDate.toLocaleString('default', { month: 'long' });
//     const year = paymentDate.getFullYear();

//     const values = [
//       paymentData.tenant_id || null,
//       paymentData.booking_id || null,           // nullable FK
//       paymentData.amount,
//       paymentData.payment_date || new Date().toISOString().split('T')[0],
//       paymentData.payment_mode,                 // enum: cash|cheque|online|bank_transfer|card
//       paymentData.transaction_id || null,
//       paymentData.status || 'pending',          // enum: pending|completed|failed|refunded
//       monthName,
//       year,
//       notes,
//       paymentData.due_date || null,             // due_date (new column)
//     ];

//     try {
//       const [result] = await db.execute(query, values);
//       return { id: result.insertId, ...paymentData };
//     } catch (error) {
//       console.error("Payment insert error:", error.message);
//       throw error;
//     }
//   },

//   // Get payment by ID
//   async findById(id) {
//     const query = `
//       SELECT p.*, b.tenant_name, b.email, b.phone, b.property_id
//       FROM payments p
//       LEFT JOIN bookings b ON p.booking_id = b.id
//       WHERE p.id = ?
//     `;
//     try {
//       const [rows] = await db.execute(query, [id]);
//       return rows[0];
//     } catch (error) {
//       throw error;
//     }
//   },

//   // Get payments by booking ID
//   async findByBooking(bookingId) {
//     const query = 'SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC';
//     try {
//       const [rows] = await db.execute(query, [bookingId]);
//       return rows;
//     } catch (error) {
//       throw error;
//     }
//   },

//   // Get payments by tenant ID
//   async findByTenant(tenantId) {
//     const query = 'SELECT * FROM payments WHERE tenant_id = ? ORDER BY created_at DESC';
//     try {
//       const [rows] = await db.execute(query, [tenantId]);
//       return rows;
//     } catch (error) {
//       throw error;
//     }
//   },

//   // Update payment status
//   async updateStatus(id, status, transactionId = null) {
//     let query = 'UPDATE payments SET status = ?, updated_at = NOW()';
//     let params = [status];

//     if (transactionId) {
//       query += ', transaction_id = ?';
//       params.push(transactionId);
//     }

//     query += ' WHERE id = ?';
//     params.push(id);

//     try {
//       const [result] = await db.execute(query, params);
//       return result.affectedRows > 0;
//     } catch (error) {
//       throw error;
//     }
//   },

//   // Get all payments with filters
//   async getAll(filters = {}) {
//     let query = `
//       SELECT p.*, b.tenant_name AS booking_tenant_name, b.property_id, b.booking_type
//       FROM payments p
//       LEFT JOIN bookings b ON p.booking_id = b.id
//       WHERE 1=1
//     `;
//     let params = [];

//     if (filters.status) {
//       query += ' AND p.status = ?';
//       params.push(filters.status);
//     }

//     if (filters.payment_mode) {
//       query += ' AND p.payment_mode = ?';
//       params.push(filters.payment_mode);
//     }

//     if (filters.booking_id) {
//       query += ' AND p.booking_id = ?';
//       params.push(filters.booking_id);
//     }

//     if (filters.tenant_id) {
//       query += ' AND p.tenant_id = ?';
//       params.push(filters.tenant_id);
//     }

//     if (filters.start_date && filters.end_date) {
//       query += ' AND DATE(p.payment_date) BETWEEN ? AND ?';
//       params.push(filters.start_date, filters.end_date);
//     }

//     query += ' ORDER BY p.created_at DESC';

//     try {
//       const [rows] = await db.execute(query, params);
//       return rows;
//     } catch (error) {
//       throw error;
//     }
//   },

//   // Get payment statistics
//   async getStats(propertyId = null) {
//     let query = `
//       SELECT
//         COUNT(*) as total_transactions,
//         SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_collected,
//         SUM(CASE WHEN status = 'pending'   THEN amount ELSE 0 END) as pending_amount,
//         SUM(CASE WHEN payment_mode = 'online'        AND status = 'completed' THEN amount ELSE 0 END) as online_payments,
//         SUM(CASE WHEN payment_mode = 'cash'          AND status = 'completed' THEN amount ELSE 0 END) as cash_payments,
//         SUM(CASE WHEN payment_mode = 'card'          AND status = 'completed' THEN amount ELSE 0 END) as card_payments,
//         SUM(CASE WHEN payment_mode = 'bank_transfer' AND status = 'completed' THEN amount ELSE 0 END) as bank_transfers,
//         SUM(CASE WHEN payment_mode = 'cheque'        AND status = 'completed' THEN amount ELSE 0 END) as cheque_payments
//       FROM payments
//       WHERE 1=1
//     `;
//     let params = [];

//     if (propertyId) {
//       query += ' AND booking_id IN (SELECT id FROM bookings WHERE property_id = ?)';
//       params.push(propertyId);
//     }

//     try {
//       const [rows] = await db.execute(query, params);
//       return rows[0];
//     } catch (error) {
//       throw error;
//     }
//   }
// };

// module.exports = Payment;


const db = require("../config/db");

const Payment = {
  // Create a new payment
  async create(paymentData) {
    const query = `
      INSERT INTO payments (
        tenant_id, booking_id, amount, payment_date, payment_mode,
        transaction_id, status, month, year, notes, due_date, payment_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    // Extract month/year from payment_date for easy filtering
    const paymentDate = paymentData.payment_date
      ? new Date(paymentData.payment_date)
      : new Date();
    const monthName = paymentDate.toLocaleString('default', { month: 'long' });
    const year = paymentDate.getFullYear();

    const values = [
      paymentData.tenant_id || null,
      paymentData.booking_id || null,
      paymentData.amount,
      paymentData.payment_date || new Date().toISOString().split('T')[0],
      paymentData.payment_mode,
      paymentData.transaction_id || null,
      paymentData.status || 'pending',
      monthName,
      year,
      paymentData.notes || null,
      paymentData.due_date || null,
      paymentData.payment_type || 'rent' // Add payment_type column
    ];

    try {
      const [result] = await db.execute(query, values);
      return { id: result.insertId, ...paymentData };
    } catch (error) {
      console.error("Payment insert error:", error.message);
      throw error;
    }
  },

  // Get payment by ID with tenant details
  async findById(id) {
    const query = `
      SELECT p.*, 
             t.full_name as tenant_name, 
             t.email as tenant_email, 
             t.phone as tenant_phone,
             b.monthly_rent,
             b.room_id,
             r.room_number,
             r.property_id,
             prop.name as property_name
      FROM payments p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN properties prop ON r.property_id = prop.id
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
    const query = `
      SELECT p.*, t.full_name as tenant_name
      FROM payments p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      WHERE p.booking_id = ? 
      ORDER BY p.created_at DESC
    `;
    try {
      const [rows] = await db.execute(query, [bookingId]);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  // Get payments by tenant ID with month-wise grouping
  async findByTenant(tenantId) {
    const query = `
      SELECT p.*, 
             b.monthly_rent,
             DATE_FORMAT(p.payment_date, '%Y-%m') as payment_month
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.tenant_id = ? 
      ORDER BY p.payment_date DESC
    `;
    try {
      const [rows] = await db.execute(query, [tenantId]);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  // Get tenant rent summary with month-wise breakdown
  async getTenantRentSummary(tenantId) {
    const query = `
      SELECT 
        p.*,
        b.monthly_rent,
        b.id as booking_id,
        b.booking_type,
        DATE_FORMAT(p.payment_date, '%Y-%m') as month_year,
        MONTH(p.payment_date) as payment_month,
        YEAR(p.payment_date) as payment_year
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.tenant_id = ? AND p.payment_type = 'rent'
      ORDER BY p.payment_date DESC
    `;
    
    try {
      const [rows] = await db.execute(query, [tenantId]);
      
      // Get active booking for current rent
      const [activeBooking] = await db.execute(
        'SELECT * FROM bookings WHERE tenant_id = ? AND status = "active" LIMIT 1',
        [tenantId]
      );

      return {
        payments: rows,
        activeBooking: activeBooking[0] || null
      };
    } catch (error) {
      throw error;
    }
  },

  // Get month-wise rent history for a tenant
// In models/PaymentModel.js - Replace the getMonthWiseRentHistory function

// Get month-wise rent history for a tenant
async getMonthWiseRentHistory(tenantId, months = 6) {
  try {
    // First, get the tenant's active booking to know their monthly rent
    const [booking] = await db.execute(
      'SELECT monthly_rent FROM bookings WHERE tenant_id = ? AND status = "active" LIMIT 1',
      [tenantId]
    );
    
    const monthlyRent = booking[0]?.monthly_rent || 0;
    
    // Get all payments for this tenant grouped by month
    const query = `
      SELECT 
        DATE_FORMAT(payment_date, '%Y-%m') as month_key,
        DATE_FORMAT(payment_date, '%M %Y') as month_display,
        MONTH(payment_date) as month_num,
        YEAR(payment_date) as year,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as payment_count,
        MAX(CASE WHEN status = 'completed' THEN payment_date END) as last_payment_date,
        GROUP_CONCAT(
          DISTINCT CONCAT(
            '{"id":"', id, '","amount":', amount, ',"status":"', status, '","date":"', payment_date, '"}'
          ) SEPARATOR '|'
        ) as payment_details
      FROM payments 
      WHERE tenant_id = ? 
        AND payment_type = 'rent'
        AND payment_date >= DATE_SUB(CURDATE(), INTERVAL ${months} MONTH)
      GROUP BY month_key, month_display, month_num, year
      ORDER BY year DESC, month_num DESC
    `;
    
    const [rows] = await db.execute(query, [tenantId]);
    
    // Generate last N months including months with no payments
    const currentDate = new Date();
    const result = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthDisplay = date.toLocaleString('default', { month: 'long' }) + ' ' + date.getFullYear();
      
      // Find if we have data for this month
      const monthData = rows.find(r => r.month_key === monthKey);
      
      const isCurrentMonth = i === months - 1;
      const isPastMonth = date < new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      let paidAmount = monthData ? parseFloat(monthData.total_paid) : 0;
      let pendingAmount = monthData ? parseFloat(monthData.total_pending) : 0;
      
      // Calculate status
      let status = 'pending';
      if (paidAmount >= monthlyRent) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      } else if (isPastMonth && paidAmount === 0) {
        status = 'overdue';
      }
      
      // Parse payment details if available
      let payments = [];
      if (monthData && monthData.payment_details) {
        payments = monthData.payment_details.split('|').map(p => JSON.parse(p));
      }
      
      result.push({
        month: monthDisplay,
        month_key: monthKey,
        year: date.getFullYear(),
        month_num: date.getMonth() + 1,
        rentAmount: monthlyRent,
        paidAmount,
        pendingAmount: Math.max(0, monthlyRent - paidAmount),
        status,
        isCurrentMonth,
        isPastMonth,
        payments,
        lastPaymentDate: monthData?.last_payment_date || null
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error in getMonthWiseRentHistory:", error);
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
      
      // If payment is completed, update any pending dues for the same month
      if (status === 'completed') {
        const payment = await this.findById(id);
        if (payment) {
          await this.updateMonthPendingStatus(payment.tenant_id, payment.payment_date);
        }
      }
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  },

  // Update pending status for a month when payment is completed
  async updateMonthPendingStatus(tenantId, paymentDate) {
    const date = new Date(paymentDate);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const query = `
      UPDATE payments 
      SET status = 'completed' 
      WHERE tenant_id = ? 
        AND payment_type = 'rent'
        AND status = 'pending'
        AND MONTH(payment_date) = ? 
        AND YEAR(payment_date) = ?
    `;

    try {
      await db.execute(query, [tenantId, month, year]);
    } catch (error) {
      console.error("Error updating month pending status:", error);
    }
  },

  // Get all payments with enhanced filters
  async getAll(filters = {}) {
    let query = `
      SELECT p.*, 
             t.full_name as tenant_name,
             t.email as tenant_email,
             t.phone as tenant_phone,
             b.monthly_rent,
             b.booking_type,
             r.room_number,
             prop.name as property_name
      FROM payments p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN properties prop ON r.property_id = prop.id
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

    if (filters.payment_type) {
      query += ' AND p.payment_type = ?';
      params.push(filters.payment_type);
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

    if (filters.month && filters.year) {
      query += ' AND MONTH(p.payment_date) = ? AND YEAR(p.payment_date) = ?';
      params.push(filters.month, filters.year);
    }

    query += ' ORDER BY p.created_at DESC';

    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  // Get detailed payment statistics
  async getStats(propertyId = null, tenantId = null) {
    let query = `
      SELECT
        COUNT(*) as total_transactions,
        COUNT(DISTINCT tenant_id) as total_tenants_with_payments,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'completed' AND payment_type = 'rent' THEN amount ELSE 0 END) as total_rent_collected,
        SUM(CASE WHEN status = 'pending' AND payment_type = 'rent' THEN amount ELSE 0 END) as pending_rent,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as average_payment,
        
        -- Payment mode breakdown
        SUM(CASE WHEN payment_mode = 'online' AND status = 'completed' THEN amount ELSE 0 END) as online_payments,
        SUM(CASE WHEN payment_mode = 'cash' AND status = 'completed' THEN amount ELSE 0 END) as cash_payments,
        SUM(CASE WHEN payment_mode = 'card' AND status = 'completed' THEN amount ELSE 0 END) as card_payments,
        SUM(CASE WHEN payment_mode = 'bank_transfer' AND status = 'completed' THEN amount ELSE 0 END) as bank_transfers,
        SUM(CASE WHEN payment_mode = 'cheque' AND status = 'completed' THEN amount ELSE 0 END) as cheque_payments,
        
        -- Monthly stats
        SUM(CASE 
          WHEN status = 'completed' 
            AND MONTH(payment_date) = MONTH(CURDATE()) 
            AND YEAR(payment_date) = YEAR(CURDATE()) 
          THEN amount ELSE 0 
        END) as current_month_collected,
        
        COUNT(CASE 
          WHEN status = 'pending' 
            AND due_date < CURDATE() 
          THEN 1 
        END) as overdue_payments,
        
        SUM(CASE 
          WHEN status = 'pending' 
            AND due_date < CURDATE() 
          THEN amount ELSE 0 
        END) as overdue_amount
      FROM payments p
      WHERE 1=1
    `;
    let params = [];

    if (propertyId) {
      query += ' AND p.booking_id IN (SELECT id FROM bookings WHERE property_id = ?)';
      params.push(propertyId);
    }

    if (tenantId) {
      query += ' AND p.tenant_id = ?';
      params.push(tenantId);
    }

    try {
      const [rows] = await db.execute(query, params);
      
      // Get current month expected rent
      let expectedRent = 0;
      if (tenantId) {
        const [booking] = await db.execute(
          'SELECT monthly_rent FROM bookings WHERE tenant_id = ? AND status = "active" LIMIT 1',
          [tenantId]
        );
        expectedRent = booking[0]?.monthly_rent || 0;
      }

      return {
        ...rows[0],
        expected_current_rent: expectedRent
      };
    } catch (error) {
      throw error;
    }
  },

  // Get pending payments with due dates
  async getPendingPayments(filters = {}) {
    let query = `
      SELECT p.*, 
             t.full_name as tenant_name,
             t.phone as tenant_phone,
             t.email as tenant_email,
             b.monthly_rent,
             DATEDIFF(CURDATE(), p.due_date) as days_overdue
      FROM payments p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.status = 'pending'
    `;
    let params = [];

    if (filters.tenant_id) {
      query += ' AND p.tenant_id = ?';
      params.push(filters.tenant_id);
    }

    if (filters.overdue_only) {
      query += ' AND p.due_date < CURDATE()';
    }

    query += ' ORDER BY p.due_date ASC';

    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = Payment;