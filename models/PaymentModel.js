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
// models/paymentModel.js
const db = require("../config/db");

const Payment = {
  // Create a new payment
  async create(paymentData) {
    const query = `
      INSERT INTO payments (
        tenant_id, booking_id, amount, payment_date, payment_mode,
        bank_name, transaction_id, payment_proof, proof_uploaded_at, 
        month, year, remark, payment_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
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
      paymentData.bank_name || null,
      paymentData.transaction_id || null,
      paymentData.payment_proof || null,
      paymentData.payment_proof ? new Date() : null,
      monthName,
      year,
      paymentData.remark || null,
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

  // Get payments by tenant ID
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
      return rows;
    } catch (error) {
      console.error("Error in findByTenant:", error);
      throw error;
    }
  },

// models/paymentModel.js - Fixed FIFO calculation

async getTenantPaymentFormData(tenantId) {
  try {
    // Step 1: Get tenant and bed assignment details including check_in_date
    const [tenantData] = await db.execute(
      `SELECT 
        t.id,
        t.full_name,
        t.email,
        t.phone,
        t.check_in_date,
        ba.tenant_rent as monthly_rent,
        ba.bed_number,
        ba.bed_type,
        ba.created_at as assignment_date,
        r.room_number,
        r.id as room_id,
        prop.name as property_name,
        prop.id as property_id
      FROM tenants t
      LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN rooms r ON ba.room_id = r.id
      LEFT JOIN properties prop ON r.property_id = prop.id
      WHERE t.id = ?`,
      [tenantId]
    );

    if (!tenantData.length || !tenantData[0].assignment_date) {
      return null;
    }

    const tenant = tenantData[0];
    const monthlyRent = parseFloat(tenant.monthly_rent) || 0;
    
    // Use check_in_date if available, fallback to assignment_date
    const joiningDate = tenant.check_in_date 
      ? new Date(tenant.check_in_date) 
      : new Date(tenant.assignment_date);
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const joiningMonth = joiningDate.getMonth() + 1;
    const joiningYear = joiningDate.getFullYear();

    // Calculate total months since joining (including current month)
    const totalMonthsSinceJoining = (currentYear - joiningYear) * 12 + (currentMonth - joiningMonth) + 1;

    // Step 2: Get ALL payments for this tenant (ordered by date)
    const [allPayments] = await db.execute(
      `SELECT 
        id,
        amount,
        payment_date,
        payment_mode,
        month,
        year,
        transaction_id,
        bank_name,
        remark,
        DATE_FORMAT(payment_date, '%Y-%m') as month_key
       FROM payments 
       WHERE tenant_id = ? 
       ORDER BY payment_date ASC`, // ASC to process oldest first
      [tenantId]
    );

    // Step 3: Initialize all months with zero payments
    const months = [];
    for (let i = 0; i < totalMonthsSinceJoining; i++) {
      const date = new Date(joiningYear, joiningMonth - 1 + i, 1);
      months.push({
        month: date.toLocaleString('default', { month: 'long' }),
        month_num: date.getMonth() + 1,
        year: date.getFullYear(),
        month_key: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
        rent: monthlyRent,
        paid: 0,
        pending: monthlyRent, // Start with full rent pending
        isCurrentMonth: date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear,
        isPastMonth: date.getFullYear() < currentYear || 
                    (date.getFullYear() === currentYear && date.getMonth() + 1 < currentMonth),
        payments: []
      });
    }

    // Step 4: Apply FIFO logic - each payment goes to oldest pending month
    for (const payment of allPayments) {
      let remainingAmount = parseFloat(payment.amount);
      console.log(`Processing payment of ₹${remainingAmount} on ${payment.payment_date}`);
      
      // Find the oldest month with pending amount
      for (let i = 0; i < months.length && remainingAmount > 0; i++) {
        const month = months[i];
        
        if (month.pending > 0) {
          const amountToPay = Math.min(remainingAmount, month.pending);
          
          // Deduct from this month's pending
          month.paid += amountToPay;
          month.pending -= amountToPay;
          remainingAmount -= amountToPay;
          
          console.log(`  → Allocated ₹${amountToPay} to ${month.month} ${month.year} (Paid: ${month.paid}, Pending: ${month.pending})`);
          
          // Record which payment contributed to this month
          month.payments.push({
            id: payment.id,
            amount: amountToPay,
            date: payment.payment_date,
            mode: payment.payment_mode,
            bank_name: payment.bank_name,
            transaction_id: payment.transaction_id,
            remark: payment.remark
          });
        }
      }
      
      // If there's still remaining amount after all months, log it (shouldn't happen)
      if (remainingAmount > 0) {
        console.log(`Warning: Payment of ₹${payment.amount} had ₹${remainingAmount} unallocated`);
      }
    }

    // Step 5: Calculate status for each month based on paid amount
    months.forEach(month => {
      if (month.paid >= month.rent) {
        month.status = 'paid';
        month.pending = 0; // Ensure no negative
      } else if (month.paid > 0) {
        month.status = 'partial';
      } else if (month.isPastMonth && month.paid === 0) {
        month.status = 'overdue';
      } else {
        month.status = 'pending';
      }
      
      // Ensure pending is never negative
      month.pending = Math.max(0, month.pending);
    });

    // Step 6: Calculate totals
    const totalPaid = months.reduce((sum, m) => sum + m.paid, 0);
    const totalExpected = monthlyRent * totalMonthsSinceJoining;
    const totalPending = months.reduce((sum, m) => sum + m.pending, 0);

    // Find the first pending month (oldest unpaid month)
    const firstPendingMonth = months.find(m => m.pending > 0);
    
    // Get previous month details (second last month)
    const previousMonth = months.length > 1 ? months[months.length - 2] : null;
    
    // Get current month details (last month)
    const currentMonthData = months[months.length - 1];

    // Get recent months (last 3)
    const recentMonths = months.slice(-3).reverse();

    console.log('Final Month Data:', months.map(m => ({
      month: `${m.month} ${m.year}`,
      rent: m.rent,
      paid: m.paid,
      pending: m.pending,
      status: m.status
    })));

    const unpaid_months = months
  .filter(month => month.pending > 0) // Only months with pending amount
  .map(month => ({
    month: month.month,
    month_num: month.month_num,
    year: month.year,
    month_key: month.month_key,
    pending: month.pending,
    display: `${month.month} ${month.year} (₹${month.pending.toLocaleString()} pending)`
  }));

    // Build the response
    const result = {
      tenant: {
        id: tenant.id,
        name: tenant.full_name,
        email: tenant.email,
        phone: tenant.phone
      },
      room_info: {
        room_id: tenant.room_id,
        room_number: tenant.room_number,
        bed_number: tenant.bed_number,
        bed_type: tenant.bed_type,
        property_id: tenant.property_id,
        property_name: tenant.property_name
      },
      monthly_rent: monthlyRent,
      check_in_date: tenant.check_in_date,
      joining_date: joiningDate.toISOString().split('T')[0],
      joining_month: joiningMonth,
      joining_year: joiningYear,
      total_months_since_joining: totalMonthsSinceJoining,
      
      // Previous month details
      previous_month: previousMonth ? {
        month: previousMonth.month,
        year: previousMonth.year,
        paid: previousMonth.paid,
        pending: previousMonth.pending,
        status: previousMonth.status
      } : {
        month: '',
        year: 0,
        paid: 0,
        pending: 0,
        status: ''
      },
      
      // Current month details
      current_month: {
        month: currentMonthData.month,
        year: currentMonthData.year,
        paid: currentMonthData.paid,
        pending: currentMonthData.pending,
        status: currentMonthData.status
      },
      
      // Complete month-wise history
      month_wise_history: months,
      
      unpaid_months: unpaid_months,
      // Recent months for quick view
      recent_months: recentMonths,
      
      // Summary totals
      total_paid: totalPaid,
      total_expected: totalExpected,
      total_pending: totalPending,
      suggested_amount: totalPending,
      
      payment_count: allPayments.length,
      last_payment_date: allPayments.length ? allPayments[allPayments.length - 1].payment_date : null
    };

    // Add a detailed note
    if (firstPendingMonth) {
      if (firstPendingMonth.month_num === currentMonth && firstPendingMonth.year === currentYear) {
        result.note = `Current month rent pending: ₹${firstPendingMonth.pending}`;
      } else {
        const monthsOverdue = months.filter(m => m.pending > 0 && m.isPastMonth).length;
        result.note = `Oldest pending: ${firstPendingMonth.month} ${firstPendingMonth.year} - ₹${firstPendingMonth.pending} (${monthsOverdue} month(s) overdue)`;
      }
    } else {
      result.note = "All months paid up to date";
    }

    return result;

  } catch (error) {
    console.error("Error in getTenantPaymentFormData:", error);
    throw error;
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

  // Get all receipts
async getReceipts(filters = {}) {
  let query = `
    SELECT 
      p.id,
      p.amount,
      p.payment_date,
      p.payment_mode,
      p.bank_name,
      p.transaction_id,
      p.remark,
      p.payment_proof,
      p.month,
      p.year,
      p.created_at,
      p.status,
      t.full_name as tenant_name,
      t.phone as tenant_phone,
      t.email as tenant_email,
      r.room_number,
      prop.name as property_name,
      ba.bed_number,
      ba.bed_type
    FROM payments p
    LEFT JOIN tenants t ON p.tenant_id = t.id
    LEFT JOIN bed_assignments ba ON p.tenant_id = ba.tenant_id AND ba.is_available = 0
    LEFT JOIN rooms r ON ba.room_id = r.id
    LEFT JOIN properties prop ON r.property_id = prop.id
    WHERE p.status = 'approved'  /* Only show approved payments */
  `;
  let params = [];

  if (filters.tenant_id) {
    query += ' AND p.tenant_id = ?';
    params.push(filters.tenant_id);
  }

  if (filters.start_date && filters.end_date) {
    query += ' AND DATE(p.payment_date) BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  query += ' ORDER BY p.payment_date DESC';

  try {
    console.log('Executing receipts query...');
    const [rows] = await db.execute(query, params);
    console.log(`Found ${rows.length} receipts`);
    return rows;
  } catch (error) {
    console.error("Error in getReceipts:", error);
    throw error; // This will cause the 500 error
  }
},

  // Get receipt by ID
  async getReceiptById(id) {
    const query = `
      SELECT 
        p.id,
        p.amount,
        p.payment_date,
        p.payment_mode,
        p.bank_name,
        p.transaction_id,
        p.remark,
        p.payment_proof,
        p.month,
        p.year,
        p.created_at,
        t.full_name as tenant_name,
        t.phone as tenant_phone,
        t.email as tenant_email,
        t.address as tenant_address,
        r.room_number,
        r.floor,
        r.sharing_type,
        prop.name as property_name,
        prop.address as property_address,
        ba.tenant_rent as monthly_rent,
        ba.bed_number,
        ba.bed_type
      FROM payments p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN bed_assignments ba ON p.tenant_id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN rooms r ON ba.room_id = r.id
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

  // Get payment statistics
  async getStats(propertyId = null, tenantId = null) {
    let query = `
      SELECT
        COUNT(*) as total_transactions,
        COUNT(DISTINCT tenant_id) as total_tenants_with_payments,
        SUM(amount) as total_collected,
        AVG(amount) as average_payment,
        
        -- Payment mode breakdown
        SUM(CASE WHEN payment_mode = 'online' THEN amount ELSE 0 END) as online_payments,
        SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END) as cash_payments,
        SUM(CASE WHEN payment_mode = 'card' THEN amount ELSE 0 END) as card_payments,
        SUM(CASE WHEN payment_mode = 'bank_transfer' THEN amount ELSE 0 END) as bank_transfers,
        SUM(CASE WHEN payment_mode = 'cheque' THEN amount ELSE 0 END) as cheque_payments,
        
        -- Monthly stats
        SUM(CASE 
          WHEN MONTH(payment_date) = MONTH(CURDATE()) 
            AND YEAR(payment_date) = YEAR(CURDATE()) 
          THEN amount ELSE 0 
        END) as current_month_collected,
        
        -- Payment type breakdown
        SUM(CASE WHEN payment_type = 'rent' THEN amount ELSE 0 END) as rent_collected,
        SUM(CASE WHEN payment_type = 'security_deposit' THEN amount ELSE 0 END) as deposit_collected,
        SUM(CASE WHEN payment_type = 'maintenance' THEN amount ELSE 0 END) as maintenance_collected
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
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Create a demand payment
  async createDemand(demandData) {
    const query = `
      INSERT INTO demand_payments (
        tenant_id, amount, due_date, payment_type, 
        description, late_fee, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      demandData.tenant_id,
      demandData.amount,
      demandData.due_date,
      demandData.payment_type || 'rent',
      demandData.description || null,
      demandData.late_fee || 0,
      'pending',
      demandData.created_by || null
    ];

    try {
      const [result] = await db.execute(query, values);
      return { 
        id: result.insertId, 
        ...demandData, 
        status: 'pending',
        total_amount: demandData.amount + (demandData.late_fee || 0)
      };
    } catch (error) {
      console.error("Demand insert error:", error.message);
      throw error;
    }
  },

  // Get all demands with filters
  async getDemands(filters = {}) {
    try {
      let query = `
        SELECT 
          d.*,
          t.full_name as tenant_name,
          t.phone as tenant_phone,
          t.email as tenant_email,
          r.room_number,
          ba.bed_number,
          prop.name as property_name,
          DATEDIFF(d.due_date, CURDATE()) as days_until_due,
          CASE 
            WHEN d.due_date < CURDATE() AND d.status = 'pending' THEN 'overdue'
            ELSE d.status
          END as current_status
        FROM demand_payments d
        LEFT JOIN tenants t ON d.tenant_id = t.id
        LEFT JOIN bed_assignments ba ON d.tenant_id = ba.tenant_id AND ba.is_available = 0
        LEFT JOIN rooms r ON ba.room_id = r.id
        LEFT JOIN properties prop ON r.property_id = prop.id
        WHERE 1=1
      `;
      
      const params = [];

      if (filters.status && filters.status !== 'all') {
        query += ' AND d.status = ?';
        params.push(filters.status);
      }

      if (filters.tenant_id) {
        query += ' AND d.tenant_id = ?';
        params.push(filters.tenant_id);
      }

      if (filters.from_date) {
        query += ' AND DATE(d.created_at) >= ?';
        params.push(filters.from_date);
      }

      if (filters.to_date) {
        query += ' AND DATE(d.created_at) <= ?';
        params.push(filters.to_date);
      }

      query += ' ORDER BY d.created_at DESC';

      console.log('Executing demand query:', query, params);
      const [rows] = await db.execute(query, params);
      console.log(`Found ${rows.length} demands`);
      
      return rows;
    } catch (error) {
      console.error("Error in getDemands:", error);
      throw error;
    }
  },

  // Get demand by ID
  async getDemandById(id) {
    const query = `
      SELECT d.*, 
             t.full_name as tenant_name,
             t.phone as tenant_phone,
             t.email as tenant_email,
             r.room_number,
             ba.bed_number,
             prop.name as property_name
      FROM demand_payments d
      LEFT JOIN tenants t ON d.tenant_id = t.id
      LEFT JOIN bed_assignments ba ON d.tenant_id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN rooms r ON ba.room_id = r.id
      LEFT JOIN properties prop ON r.property_id = prop.id
      WHERE d.id = ?
    `;
    try {
      const [rows] = await db.execute(query, [id]);
      return rows[0];
    } catch (error) {
      console.error("Error fetching demand by ID:", error);
      throw error;
    }
  },

  // Update demand status
  async updateDemandStatus(id, status) {
    const query = 'UPDATE demand_payments SET status = ? WHERE id = ?';
    try {
      const [result] = await db.execute(query, [status, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error updating demand status:", error);
      throw error;
    }
  },

  // Get tenant's pending demands
  async getTenantPendingDemands(tenantId) {
    const query = `
      SELECT * FROM demand_payments 
      WHERE tenant_id = ? AND status IN ('pending', 'overdue')
      ORDER BY due_date ASC
    `;
    try {
      const [rows] = await db.execute(query, [tenantId]);
      return rows;
    } catch (error) {
      console.error("Error fetching tenant pending demands:", error);
      throw error;
    }
  },
  // Add these methods to your Payment model (inside the Payment object)

// Approve payment
async approvePayment(id, approvedBy) {
  const query = `
    UPDATE payments 
    SET status = 'approved', 
        approved_at = NOW(), 
        approved_by = ?,
        updated_at = NOW()
    WHERE id = ?
  `;
  try {
    const [result] = await db.execute(query, [approvedBy || null, id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error approving payment:", error);
    throw error;
  }
},

// Reject payment
async rejectPayment(id, rejectionReason, rejectedBy) {
  const query = `
    UPDATE payments 
    SET status = 'rejected', 
        rejected_at = NOW(), 
        rejected_by = ?,
        rejection_reason = ?,
        updated_at = NOW()
    WHERE id = ?
  `;
  try {
    const [result] = await db.execute(query, [rejectedBy || null, rejectionReason, id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error rejecting payment:", error);
    throw error;
  }
},

// Update payment
async updatePayment(id, paymentData) {
  // First, get the current payment to check status
  const [currentPayment] = await db.execute(
    'SELECT status FROM payments WHERE id = ?',
    [id]
  );
  
  if (!currentPayment.length) {
    throw new Error('Payment not found');
  }
  
  // Only allow updating pending or rejected payments
  if (currentPayment[0].status !== 'pending' && currentPayment[0].status !== 'rejected') {
    throw new Error('Only pending or rejected payments can be updated');
  }
  
  const query = `
    UPDATE payments 
    SET amount = ?,
        payment_date = ?,
        payment_mode = ?,
        bank_name = ?,
        transaction_id = ?,
        month = ?,
        year = ?,
        remark = ?,
        payment_type = ?,
        updated_at = NOW()
    WHERE id = ?
  `;
  
  const paymentDate = paymentData.payment_date 
    ? new Date(paymentData.payment_date) 
    : new Date();
  const monthName = paymentData.month || paymentDate.toLocaleString('default', { month: 'long' });
  const year = paymentData.year || paymentDate.getFullYear();
  
  const values = [
    paymentData.amount,
    paymentData.payment_date || new Date().toISOString().split('T')[0],
    paymentData.payment_mode,
    paymentData.bank_name || null,
    paymentData.transaction_id || null,
    monthName,
    year,
    paymentData.remark || null,
    paymentData.payment_type || 'rent',
    id
  ];
  
  try {
    const [result] = await db.execute(query, values);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
},

// Delete payment
async deletePayment(id) {
  const query = 'DELETE FROM payments WHERE id = ?';
  try {
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting payment:", error);
    throw error;
  }
},


// Get security deposit info for a tenant
async getSecurityDepositInfo(tenantId) {
  try {
    // Get tenant's current bed assignment to fetch security deposit
    const [assignment] = await db.execute(
      `SELECT 
        ba.*,
        r.room_number,
        r.property_id,
        p.security_deposit as property_security_deposit,
        p.name as property_name
       FROM bed_assignments ba
       LEFT JOIN rooms r ON ba.room_id = r.id
       LEFT JOIN properties p ON r.property_id = p.id
       WHERE ba.tenant_id = ? AND ba.is_available = 0`,
      [tenantId]
    );

    if (!assignment.length) {
      return null;
    }

    // Get ALL security deposit payments (not just the last one)
    const [allPayments] = await db.execute(
      `SELECT id, amount, payment_date, status, created_at 
       FROM payments 
       WHERE tenant_id = ? AND payment_type = 'security_deposit'
       ORDER BY payment_date DESC`,
      [tenantId]
    );

    // Calculate total paid amount by summing ALL payments
    const totalPaidAmount = allPayments.reduce((sum, payment) => {
      // Only count approved payments (or count all if you want)
      // You can adjust this based on your business logic
      return sum + parseFloat(payment.amount);
    }, 0);

    const securityDepositAmount = parseFloat(assignment[0].property_security_deposit) || 0;
    const pendingAmount = Math.max(0, securityDepositAmount - totalPaidAmount);

    console.log('Security Deposit Calculation:', {
      security_deposit: securityDepositAmount,
      payments: allPayments.map(p => ({ amount: p.amount, date: p.payment_date, status: p.status })),
      total_paid: totalPaidAmount,
      pending: pendingAmount
    });

    return {
      property_id: assignment[0].property_id,
      property_name: assignment[0].property_name,
      security_deposit: securityDepositAmount,
      paid_amount: totalPaidAmount,
      pending_amount: pendingAmount,
      last_payment_date: allPayments.length ? allPayments[0].payment_date : null,
      payments: allPayments, // Return all payments for history
      is_fully_paid: pendingAmount === 0
    };
  } catch (error) {
    console.error("Error in getSecurityDepositInfo:", error);
    throw error;
  }
}
};

module.exports = Payment;















// // models/paymentModel.js
// const db = require("../config/db");

// const Payment = {
//   // Create a new payment
//   async create(paymentData) {
//     const query = `
//       INSERT INTO payments (
//         tenant_id, booking_id, amount, payment_date, payment_mode,
//         bank_name, transaction_id, payment_proof, proof_uploaded_at, 
//         month, year, remark, payment_type, created_at, updated_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
//     `;

//     const paymentDate = paymentData.payment_date 
//       ? new Date(paymentData.payment_date) 
//       : new Date();
//     const monthName = paymentDate.toLocaleString('default', { month: 'long' });
//     const year = paymentDate.getFullYear();

//     const values = [
//       paymentData.tenant_id || null,
//       paymentData.booking_id || null,
//       paymentData.amount,
//       paymentData.payment_date || new Date().toISOString().split('T')[0],
//       paymentData.payment_mode,
//       paymentData.bank_name || null,
//       paymentData.transaction_id || null,
//       paymentData.payment_proof || null,
//       paymentData.payment_proof ? new Date() : null,
//       monthName,
//       year,
//       paymentData.remark || null,
//       paymentData.payment_type || 'rent'
//     ];

//     try {
//       const [result] = await db.execute(query, values);
//       return { id: result.insertId, ...paymentData };
//     } catch (error) {
//       console.error("Payment insert error:", error.message);
//       throw error;
//     }
//   },

//   // Get payment by ID with tenant details
//   async findById(id) {
//     const query = `
//       SELECT p.*, 
//              t.full_name as tenant_name, 
//              t.email as tenant_email, 
//              t.phone as tenant_phone,
//              b.monthly_rent,
//              b.room_id,
//              r.room_number,
//              r.property_id,
//              prop.name as property_name
//       FROM payments p
//       LEFT JOIN tenants t ON p.tenant_id = t.id
//       LEFT JOIN bookings b ON p.booking_id = b.id
//       LEFT JOIN rooms r ON b.room_id = r.id
//       LEFT JOIN properties prop ON r.property_id = prop.id
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
//     const query = `
//       SELECT p.*, t.full_name as tenant_name
//       FROM payments p
//       LEFT JOIN tenants t ON p.tenant_id = t.id
//       WHERE p.booking_id = ? 
//       ORDER BY p.created_at DESC
//     `;
//     try {
//       const [rows] = await db.execute(query, [bookingId]);
//       return rows;
//     } catch (error) {
//       throw error;
//     }
//   },

//   // Get payments by tenant ID
//   async findByTenant(tenantId) {
//     const query = `
//       SELECT 
//         p.*,
//         DATE_FORMAT(p.payment_date, '%Y-%m') as month_key,
//         MONTH(p.payment_date) as month_num,
//         YEAR(p.payment_date) as year,
//         t.full_name as tenant_name,
//         t.email as tenant_email,
//         t.phone as tenant_phone,
//         ba.id as bed_assignment_id,
//         ba.bed_number,
//         ba.bed_type,
//         ba.tenant_rent,
//         ba.is_couple,
//         r.id as room_id,
//         r.room_number,
//         r.floor,
//         r.sharing_type,
//         prop.id as property_id,
//         prop.name as property_name
//       FROM payments p
//       LEFT JOIN tenants t ON p.tenant_id = t.id
//       LEFT JOIN bed_assignments ba ON p.tenant_id = ba.tenant_id AND ba.is_available = 0
//       LEFT JOIN rooms r ON ba.room_id = r.id
//       LEFT JOIN properties prop ON r.property_id = prop.id
//       WHERE p.tenant_id = ? 
//       ORDER BY p.payment_date DESC
//     `;
//     try {
//       const [rows] = await db.execute(query, [tenantId]);
//       return rows;
//     } catch (error) {
//       console.error("Error in findByTenant:", error);
//       throw error;
//     }
//   },

//   // Get tenant payment form data - FIXED with last transaction logic
//   async getTenantPaymentFormData(tenantId) {
//     try {
//       // Get tenant and bed assignment details
//       const [tenantData] = await db.execute(
//         `SELECT 
//           t.id,
//           t.full_name,
//           t.email,
//           t.phone,
//           ba.tenant_rent as monthly_rent,
//           ba.bed_number,
//           ba.bed_type,
//           ba.created_at as assignment_date,
//           r.room_number,
//           prop.name as property_name
//         FROM tenants t
//         LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
//         LEFT JOIN rooms r ON ba.room_id = r.id
//         LEFT JOIN properties prop ON r.property_id = prop.id
//         WHERE t.id = ?`,
//         [tenantId]
//       );

//       if (!tenantData.length || !tenantData[0].assignment_date) {
//         return null;
//       }

//       const tenant = tenantData[0];
//       const monthlyRent = parseFloat(tenant.monthly_rent) || 0;
//       const assignmentDate = new Date(tenant.assignment_date);
      
//       const currentDate = new Date();
//       const currentMonth = currentDate.getMonth() + 1;
//       const currentYear = currentDate.getFullYear();
//       const assignmentMonth = assignmentDate.getMonth() + 1;
//       const assignmentYear = assignmentDate.getFullYear();

//       // Get the LAST payment for this tenant (most recent)
//       const [lastPayment] = await db.execute(
//         `SELECT * FROM payments 
//          WHERE tenant_id = ? 
//          ORDER BY payment_date DESC 
//          LIMIT 1`,
//         [tenantId]
//       );

//       // Get current month payments
//       const [currentMonthPayments] = await db.execute(
//         `SELECT SUM(amount) as total_paid
//          FROM payments 
//          WHERE tenant_id = ? 
//          AND MONTH(payment_date) = ? 
//          AND YEAR(payment_date) = ?`,
//         [tenantId, currentMonth, currentYear]
//       );

//       const currentMonthPaid = parseFloat(currentMonthPayments[0]?.total_paid) || 0;

//       // Initialize variables
//       let previousMonthPending = 0;
//       let previousMonthName = '';
//       let previousMonthYear = 0;
//       let previousMonthPaid = 0;

//       // CASE 1: NO PAYMENTS FOUND (New Tenant)
//       if (!lastPayment.length) {
//         return {
//           tenant: {
//             id: tenant.id,
//             name: tenant.full_name,
//             email: tenant.email,
//             phone: tenant.phone
//           },
//           room_info: {
//             room_number: tenant.room_number,
//             bed_number: tenant.bed_number,
//             bed_type: tenant.bed_type,
//             property_name: tenant.property_name
//           },
//           monthly_rent: monthlyRent,
//           previous_month: {
//             month: '',
//             year: 0,
//             pending: 0,
//             paid: 0
//           },
//           current_month: {
//             month: currentDate.toLocaleString('default', { month: 'long' }),
//             year: currentYear,
//             paid: currentMonthPaid,
//             pending: Math.max(0, monthlyRent - currentMonthPaid),
            
//           },
//           total_pending: Math.max(0, monthlyRent - currentMonthPaid),
//           suggested_amount: Math.max(0, monthlyRent - currentMonthPaid)
//         };
//       }

//       // We have a last payment
//       const lastPaymentRecord = lastPayment[0];
//       const lastPaymentDate = new Date(lastPaymentRecord.payment_date);
//       const lastPaymentMonth = lastPaymentDate.getMonth() + 1;
//       const lastPaymentYear = lastPaymentDate.getFullYear();

//       // CASE 2: LAST PAYMENT IS FROM CURRENT MONTH
//       if (lastPaymentMonth === currentMonth && lastPaymentYear === currentYear) {
//         return {
//           tenant: {
//             id: tenant.id,
//             name: tenant.full_name,
//             email: tenant.email,
//             phone: tenant.phone
//           },
//           room_info: {
//             room_number: tenant.room_number,
//             bed_number: tenant.bed_number,
//             bed_type: tenant.bed_type,
//             property_name: tenant.property_name
//           },
//           monthly_rent: monthlyRent,
//           previous_month: {
//             month: '',
//             year: 0,
//             pending: 0,
//             paid: 0
//           },
//           current_month: {
//             month: currentDate.toLocaleString('default', { month: 'long' }),
//             year: currentYear,
//             paid: currentMonthPaid,
//             pending: Math.max(0, monthlyRent - currentMonthPaid)
//           },
//           total_pending: Math.max(0, monthlyRent - currentMonthPaid),
//           suggested_amount: Math.max(0, monthlyRent - currentMonthPaid)
//         };
//       }

//       // CASE 3: LAST PAYMENT IS FROM PREVIOUS MONTH
//       // Calculate previous month (the month of last payment)
//       const prevDate = new Date(lastPaymentDate);
//       const prevMonth = lastPaymentMonth;
//       const prevYear = lastPaymentYear;
      
//       // Get total paid in that previous month
//       const [prevMonthPayments] = await db.execute(
//         `SELECT SUM(amount) as total_paid
//          FROM payments 
//          WHERE tenant_id = ? 
//          AND MONTH(payment_date) = ? 
//          AND YEAR(payment_date) = ?`,
//         [tenantId, prevMonth, prevYear]
//       );

//       previousMonthPaid = parseFloat(prevMonthPayments[0]?.total_paid) || 0;
      
//       // Calculate pending from previous month
//       if (previousMonthPaid < monthlyRent) {
//         // PARTIAL PAYMENT - has pending
//         previousMonthPending = monthlyRent - previousMonthPaid;
//         previousMonthName = prevDate.toLocaleString('default', { month: 'long' });
//         previousMonthYear = prevYear;
//       } else {
//         // FULL PAYMENT - no pending
//         previousMonthPending = 0;
//         previousMonthName = '';
//         previousMonthYear = 0;
//       }

//       // Calculate total to pay now
//       const totalPending = previousMonthPending + Math.max(0, monthlyRent - currentMonthPaid);

//       return {
//         tenant: {
//           id: tenant.id,
//           name: tenant.full_name,
//           email: tenant.email,
//           phone: tenant.phone
//         },
//         room_info: {
//           room_number: tenant.room_number,
//           bed_number: tenant.bed_number,
//           bed_type: tenant.bed_type,
//           property_name: tenant.property_name
//         },
//         monthly_rent: monthlyRent,
//         previous_month: {
//           month: previousMonthName,
//           year: previousMonthYear,
//           pending: previousMonthPending,
//           paid: previousMonthPaid
//         },
//         current_month: {
//           month: currentDate.toLocaleString('default', { month: 'long' }),
//           year: currentYear,
//           paid: currentMonthPaid,
//           pending: Math.max(0, monthlyRent - currentMonthPaid)
//         },
//         total_pending: totalPending,
//         suggested_amount: totalPending
//       };

//     } catch (error) {
//       console.error("Error in getTenantPaymentFormData:", error);
//       throw error;
//     }
//   },

//   // Get all payments with enhanced filters
//   async getAll(filters = {}) {
//     let query = `
//       SELECT p.*, 
//              t.full_name as tenant_name,
//              t.email as tenant_email,
//              t.phone as tenant_phone,
//              b.monthly_rent,
//              b.booking_type,
//              r.room_number,
//              prop.name as property_name
//       FROM payments p
//       LEFT JOIN tenants t ON p.tenant_id = t.id
//       LEFT JOIN bookings b ON p.booking_id = b.id
//       LEFT JOIN rooms r ON b.room_id = r.id
//       LEFT JOIN properties prop ON r.property_id = prop.id
//       WHERE 1=1
//     `;
//     let params = [];

//     if (filters.payment_mode) {
//       query += ' AND p.payment_mode = ?';
//       params.push(filters.payment_mode);
//     }

//     if (filters.payment_type) {
//       query += ' AND p.payment_type = ?';
//       params.push(filters.payment_type);
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

//     if (filters.month && filters.year) {
//       query += ' AND MONTH(p.payment_date) = ? AND YEAR(p.payment_date) = ?';
//       params.push(filters.month, filters.year);
//     }

//     query += ' ORDER BY p.created_at DESC';

//     try {
//       const [rows] = await db.execute(query, params);
//       return rows;
//     } catch (error) {
//       throw error;
//     }
//   },

//   // Get all receipts
//   async getReceipts(filters = {}) {
//     let query = `
//       SELECT 
//         p.id,
//         p.amount,
//         p.payment_date,
//         p.payment_mode,
//         p.bank_name,
//         p.transaction_id,
//         p.remark,
//         p.payment_proof,
//         p.month,
//         p.year,
//         p.created_at,
//         t.full_name as tenant_name,
//         t.phone as tenant_phone,
//         t.email as tenant_email,
//         r.room_number,
//         prop.name as property_name,
//         ba.bed_number,
//         ba.bed_type
//       FROM payments p
//       LEFT JOIN tenants t ON p.tenant_id = t.id
//       LEFT JOIN bed_assignments ba ON p.tenant_id = ba.tenant_id AND ba.is_available = 0
//       LEFT JOIN rooms r ON ba.room_id = r.id
//       LEFT JOIN properties prop ON r.property_id = prop.id
//       WHERE 1=1
//     `;
//     let params = [];

//     if (filters.tenant_id) {
//       query += ' AND p.tenant_id = ?';
//       params.push(filters.tenant_id);
//     }

//     if (filters.start_date && filters.end_date) {
//       query += ' AND DATE(p.payment_date) BETWEEN ? AND ?';
//       params.push(filters.start_date, filters.end_date);
//     }

//     query += ' ORDER BY p.payment_date DESC';

//     try {
//       const [rows] = await db.execute(query, params);
//       return rows;
//     } catch (error) {
//       throw error;
//     }
//   },

//   // Get receipt by ID
//   async getReceiptById(id) {
//     const query = `
//       SELECT 
//         p.id,
//         p.amount,
//         p.payment_date,
//         p.payment_mode,
//         p.bank_name,
//         p.transaction_id,
//         p.remark,
//         p.payment_proof,
//         p.month,
//         p.year,
//         p.created_at,
//         t.full_name as tenant_name,
//         t.phone as tenant_phone,
//         t.email as tenant_email,
//         t.address as tenant_address,
//         r.room_number,
//         r.floor,
//         r.sharing_type,
//         prop.name as property_name,
//         prop.address as property_address,
//         ba.tenant_rent as monthly_rent,
//         ba.bed_number,
//         ba.bed_type
//       FROM payments p
//       LEFT JOIN tenants t ON p.tenant_id = t.id
//       LEFT JOIN bed_assignments ba ON p.tenant_id = ba.tenant_id AND ba.is_available = 0
//       LEFT JOIN rooms r ON ba.room_id = r.id
//       LEFT JOIN properties prop ON r.property_id = prop.id
//       WHERE p.id = ?
//     `;
//     try {
//       const [rows] = await db.execute(query, [id]);
//       return rows[0];
//     } catch (error) {
//       throw error;
//     }
//   },

//   // Get payment statistics
//   async getStats(propertyId = null, tenantId = null) {
//     let query = `
//       SELECT
//         COUNT(*) as total_transactions,
//         COUNT(DISTINCT tenant_id) as total_tenants_with_payments,
//         SUM(amount) as total_collected,
//         AVG(amount) as average_payment,
        
//         -- Payment mode breakdown
//         SUM(CASE WHEN payment_mode = 'online' THEN amount ELSE 0 END) as online_payments,
//         SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END) as cash_payments,
//         SUM(CASE WHEN payment_mode = 'card' THEN amount ELSE 0 END) as card_payments,
//         SUM(CASE WHEN payment_mode = 'bank_transfer' THEN amount ELSE 0 END) as bank_transfers,
//         SUM(CASE WHEN payment_mode = 'cheque' THEN amount ELSE 0 END) as cheque_payments,
        
//         -- Monthly stats
//         SUM(CASE 
//           WHEN MONTH(payment_date) = MONTH(CURDATE()) 
//             AND YEAR(payment_date) = YEAR(CURDATE()) 
//           THEN amount ELSE 0 
//         END) as current_month_collected,
        
//         -- Payment type breakdown
//         SUM(CASE WHEN payment_type = 'rent' THEN amount ELSE 0 END) as rent_collected,
//         SUM(CASE WHEN payment_type = 'security_deposit' THEN amount ELSE 0 END) as deposit_collected,
//         SUM(CASE WHEN payment_type = 'maintenance' THEN amount ELSE 0 END) as maintenance_collected
//       FROM payments p
//       WHERE 1=1
//     `;
//     let params = [];

//     if (propertyId) {
//       query += ' AND p.booking_id IN (SELECT id FROM bookings WHERE property_id = ?)';
//       params.push(propertyId);
//     }

//     if (tenantId) {
//       query += ' AND p.tenant_id = ?';
//       params.push(tenantId);
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