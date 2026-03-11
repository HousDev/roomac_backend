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




// models/paymentModel.js
const db = require("../config/db");

const Payment = {
  // Create a new payment
async create(paymentData) {
  const query = `
    INSERT INTO payments (
      tenant_id, booking_id, amount, payment_date, payment_mode,
      transaction_id, payment_proof, proof_uploaded_at, status, month, year, 
      notes, due_date, payment_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

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
    paymentData.payment_proof || null,
    paymentData.payment_proof ? new Date() : null,
    paymentData.status || 'pending',
    monthName,
    year,
    paymentData.notes || null,
    paymentData.due_date || null,
    paymentData.payment_type || 'rent'
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

async findByTenant(tenantId) {
  const query = `
    SELECT 
      p.*,
      DATE_FORMAT(p.payment_date, '%Y-%m') as month_key,
      MONTH(p.payment_date) as month_num,
      YEAR(p.payment_date) as year,
      t.full_name as tenant_name,
      t.email as tenant_email,
      t.phone as tenant_phone,
      ba.id as bed_assignment_id,
      ba.bed_number,
      ba.bed_type,
      ba.tenant_rent,
      ba.is_couple,
      r.id as room_id,
      r.room_number,
      r.floor,
      r.sharing_type,
      prop.id as property_id,
      prop.name as property_name
    FROM payments p
    LEFT JOIN tenants t ON p.tenant_id = t.id
    LEFT JOIN bed_assignments ba ON p.tenant_id = ba.tenant_id AND ba.is_available = 0
    LEFT JOIN rooms r ON ba.room_id = r.id
    LEFT JOIN properties prop ON r.property_id = prop.id
    WHERE p.tenant_id = ? 
    ORDER BY p.payment_date DESC
  `;
  try {
    const [rows] = await db.execute(query, [tenantId]);
    console.log(`Found ${rows.length} payments for tenant ${tenantId}`);
    return rows;
  } catch (error) {
    console.error("Error in findByTenant:", error);
    throw error;
  }
},

async getTenantRentSummary(tenantId) {
  try {
    // Get tenant details with current bed assignment
    const [tenantData] = await db.execute(
      `SELECT 
        t.id as tenant_id,
        t.full_name as tenant_name,
        t.email,
        t.phone,
        ba.id as bed_assignment_id,
        ba.bed_number,
        ba.bed_type,
        ba.tenant_rent,
        ba.is_couple,
        r.id as room_id,
        r.room_number,
        r.floor,
        r.sharing_type,
        r.has_ac,
        r.has_attached_bathroom,
        r.has_balcony,
        p.id as property_id,
        p.name as property_name,
        p.address as property_address
      FROM tenants t
      LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN rooms r ON ba.room_id = r.id
      LEFT JOIN properties p ON r.property_id = p.id
      WHERE t.id = ?`,
      [tenantId]
    );

    // Get all payments for this tenant
    const [payments] = await db.execute(
      `SELECT * FROM payments 
       WHERE tenant_id = ? 
       ORDER BY payment_date DESC`,
      [tenantId]
    );

    // Get the tenant's active booking
    const [bookings] = await db.execute(
      `SELECT * FROM bookings 
       WHERE tenant_id = ? AND status = 'active'
       LIMIT 1`,
      [tenantId]
    );

    const tenantInfo = tenantData[0] || { tenant_id: tenantId };
    const monthlyRent = tenantInfo?.tenant_rent || bookings[0]?.monthly_rent || 0;

    return {
      tenant: {
        id: tenantInfo.tenant_id,
        name: tenantInfo.tenant_name,
        email: tenantInfo.email,
        phone: tenantInfo.phone
      },
      bed_assignment: tenantInfo.bed_assignment_id ? {
        id: tenantInfo.bed_assignment_id,
        bed_number: tenantInfo.bed_number,
        bed_type: tenantInfo.bed_type,
        monthly_rent: tenantInfo.tenant_rent,
        is_couple: tenantInfo.is_couple === 1,
        room: {
          id: tenantInfo.room_id,
          room_number: tenantInfo.room_number,
          floor: tenantInfo.floor,
          sharing_type: tenantInfo.sharing_type,
          has_ac: tenantInfo.has_ac === 1,
          has_attached_bathroom: tenantInfo.has_attached_bathroom === 1,
          has_balcony: tenantInfo.has_balcony === 1
        },
        property: {
          id: tenantInfo.property_id,
          name: tenantInfo.property_name,
          address: tenantInfo.property_address
        }
      } : null,
      active_booking: bookings[0] || null,
      payments: payments,
      monthly_rent: monthlyRent
    };
  } catch (error) {
    console.error("Error in getTenantRentSummary:", error);
    throw error;
  }
},

// models/PaymentModel.js - Update getMonthWiseRentHistory method

// models/paymentModel.js - Update getMonthWiseRentHistory to show all months from bed assignment

async getMonthWiseRentHistory(tenantId, months = 6) {
  try {
    // First, get the bed assignment date to know when the tenant started
    const [assignmentData] = await db.execute(
      `SELECT 
        ba.created_at as assignment_date,
        ba.tenant_rent,
        ba.bed_number,
        ba.bed_type,
        r.room_number
      FROM bed_assignments ba
      LEFT JOIN rooms r ON ba.room_id = r.id
      WHERE ba.tenant_id = ? AND ba.is_available = 0
      LIMIT 1`,
      [tenantId]
    );
    
    const bedAssignment = assignmentData[0];
    
    // If no active bed assignment, return empty array
    if (!bedAssignment) {
      return {
        months: [],
        bed_info: null,
        monthly_rent: 0,
        total_paid: 0,
        total_pending: 0,
        assignment_date: null
      };
    }

    const monthlyRent = parseFloat(bedAssignment.tenant_rent) || 0;
    const assignmentDate = new Date(bedAssignment.assignment_date);
    const currentDate = new Date();
    
    // Get all payments for this tenant
    const [payments] = await db.execute(
      `SELECT * FROM payments 
       WHERE tenant_id = ? 
       AND payment_type = 'rent'
       ORDER BY payment_date ASC`,
      [tenantId]
    );

    // Calculate total months from assignment date to current date
    const startYear = assignmentDate.getFullYear();
    const startMonth = assignmentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    const totalMonths = (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1;
    
    // Generate all months from assignment date to current date
    const result = [];
    let totalPaid = 0;
    let totalPending = 0;
    
    for (let i = 0; i < totalMonths; i++) {
      const date = new Date(startYear, startMonth + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthDisplay = date.toLocaleString('default', { month: 'long' }) + ' ' + date.getFullYear();
      
      // Find payments for this specific month
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate.getMonth() === date.getMonth() && 
               paymentDate.getFullYear() === date.getFullYear();
      });

      const completedPayments = monthPayments.filter(p => p.status === 'completed');
      const paidAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      const isPastMonth = date < new Date(currentYear, currentMonth, 1);
      
      // Determine status
      let status = 'pending';
      if (paidAmount >= monthlyRent) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      } else if (isPastMonth) {
        status = 'overdue';
      }
      
      const monthData = {
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
        isFirstMonth: i === 0,
        payments: monthPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          date: p.payment_date,
          mode: p.payment_mode,
          transaction_id: p.transaction_id
        })),
        lastPaymentDate: completedPayments[0]?.payment_date || null
      };
      
      result.push(monthData);
      totalPaid += paidAmount;
      totalPending += (monthlyRent - paidAmount);
    }
    
    return {
      months: result,
      bed_info: {
        bed_number: bedAssignment.bed_number,
        bed_type: bedAssignment.bed_type,
        room_number: bedAssignment.room_number,
        assignment_date: bedAssignment.assignment_date
      },
      monthly_rent: monthlyRent,
      total_paid: totalPaid,
      total_pending: totalPending,
      total_months: totalMonths
    };
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