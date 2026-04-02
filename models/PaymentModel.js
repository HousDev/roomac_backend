
// models/paymentModel.js
const db = require("../config/db");

const Payment = {
  // Create a new payment
  async create(paymentData) {
    const query = `
      INSERT INTO payments (
        tenant_id, booking_id,total_amount, discount_amount,new_balance, amount, payment_date, payment_mode,
        bank_name, transaction_id, payment_proof, proof_uploaded_at, 
        month, year, remark, payment_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?,?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const paymentDate = paymentData.payment_date 
      ? new Date(paymentData.payment_date) 
      : new Date();
    const monthName = paymentDate.toLocaleString('default', { month: 'long' });
    const year = paymentDate.getFullYear();

    const values = [
      paymentData.tenant_id || null,
      paymentData.booking_id || null,
      paymentData.total_amount || 0, 
      paymentData.discount_amount || 0,
      paymentData. newbalance || 0,
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

// models/paymentModel.js - Complete fixed getTenantPaymentFormData

// In paymentModel.js - getTenantPaymentFormData function

async getTenantPaymentFormData(tenantId) {
  try {
    // Step 1: Get tenant and bed assignment
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
        prop.id as property_id,
        prop.security_deposit as property_security_deposit
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
    const originalMonthlyRent = parseFloat(tenant.monthly_rent) || 0;
    const securityDepositAmount = parseFloat(tenant.property_security_deposit) || 0;
    
    // ========== STEP 2: Get booking with offer information ==========
    const [bookingData] = await db.execute(
      `SELECT 
        b.id,
        b.original_amount,
        b.discount_amount,
        b.offer_code,
        b.offer_title,
        b.discount_type,
        b.total_amount,
        b.monthly_rent,
        b.security_deposit,
        b.created_at as booking_date,
        b.check_in_date,
        b.move_in_date
      FROM bookings b
      WHERE b.tenant_id = ? AND b.status = 'active'
      ORDER BY b.created_at DESC
      LIMIT 1`,
      [tenantId]
    );
    
    // ========== STEP 3: Extract offer information ==========
    let discountedFirstMonthRent = originalMonthlyRent;
    let hasOffer = false;
    let offerDetails = null;
    let discountAmountValue = 0;
    
    if (bookingData.length > 0 && bookingData[0].offer_code) {
  hasOffer = true;
  
  // bookingData[0].monthly_rent is the DISCOUNTED rent stored during booking
  const bookingMonthlyRent = parseFloat(bookingData[0].monthly_rent);
  // bookingData[0].discount_amount is the saved discount
  const discountFromBooking = parseFloat(bookingData[0].discount_amount);

  // Use discount_amount as the source of truth (most reliable)
  if (!isNaN(discountFromBooking) && discountFromBooking > 0) {
    discountAmountValue = discountFromBooking;
    discountedFirstMonthRent = originalMonthlyRent - discountAmountValue;
  } else if (!isNaN(bookingMonthlyRent) && bookingMonthlyRent > 0 && bookingMonthlyRent < originalMonthlyRent) {
    // Fallback: derive discount from the stored monthly_rent
    discountedFirstMonthRent = bookingMonthlyRent;
    discountAmountValue = originalMonthlyRent - discountedFirstMonthRent;
  }

  // Clamp: discounted rent cannot be negative
  discountedFirstMonthRent = Math.max(0, discountedFirstMonthRent);

  offerDetails = {
    code: bookingData[0].offer_code,
    title: bookingData[0].offer_title || 'Special Offer',
    discount_type: bookingData[0].discount_type,
    discount_amount: discountAmountValue,
    original_rent: originalMonthlyRent,
    discounted_rent: discountedFirstMonthRent,
    valid_only_for_first_month: true
  };
} else {
      console.log('📊 No offer found for tenant:', tenantId);
    }
    
    // ========== STEP 4: Build months array ==========
    const joinDate = tenant.check_in_date 
      ? new Date(tenant.check_in_date) 
      : new Date(tenant.assignment_date);
    
    const currentDate = new Date();
    const joinMonth = joinDate.getMonth();
    const joinYear = joinDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const totalMonthsSinceJoining = (currentYear - joinYear) * 12 + (currentMonth - joinMonth) + 1;
    
    // Step 4: Build months array — REPLACE existing loop
const months = [];

for (let i = 0; i < totalMonthsSinceJoining; i++) {
  const date = new Date(joinYear, joinMonth + i, 1);
  const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  
  // Month 0 with an offer → use discounted rent; all others → full rent
  let rentAmount = originalMonthlyRent;
  let isDiscountedMonth = false;
  
  if (hasOffer && i === 0 && discountedFirstMonthRent < originalMonthlyRent) {
    rentAmount = discountedFirstMonthRent;
    isDiscountedMonth = true;
  }
  
  months.push({
    month: date.toLocaleString('default', { month: 'long' }),
    month_num: date.getMonth() + 1,
    year: date.getFullYear(),
    month_key: monthKey,
    rent: rentAmount,
    total_amount: 0,
    discount_amount: 0,
    original_rent: originalMonthlyRent,   // always full rent
    effective_rent: rentAmount,            // what's actually owed
    isFirstMonth: i === 0,
    has_discount: isDiscountedMonth,
    discount_applied: isDiscountedMonth ? discountAmountValue : 0,
    paid: 0,
    pending: rentAmount,
    isCurrentMonth: date.getMonth() === currentMonth && date.getFullYear() === currentYear,
    isPastMonth: date.getFullYear() < currentYear || 
                (date.getFullYear() === currentYear && date.getMonth() < currentMonth),
    payments: []
  });
}
    
    // ========== STEP 5: Get rent payments ==========
    const [rentPayments] = await db.execute(
      `SELECT 
        id,
        amount,
        total_amount,
        discount_amount,
        previous_balance,
        new_balance,
        payment_date,
        payment_mode,
        month,
        year,
        transaction_id,
        bank_name,
        remark,
        DATE_FORMAT(payment_date, '%Y-%m') as month_key
       FROM payments 
       WHERE tenant_id = ? AND payment_type = 'rent'
       ORDER BY payment_date ASC`,
      [tenantId]
    );
    
    // ========== STEP 6: Apply payments to months ==========
    for (const payment of rentPayments) {
      let remainingAmount = parseFloat(payment.amount);
      
      for (let i = 0; i < months.length && remainingAmount > 0; i++) {
        const month = months[i];
        
        if (month.pending > 0) {
          const amountToPay = Math.min(remainingAmount, month.pending);
          month.paid += amountToPay;
          month.pending -= amountToPay;
          remainingAmount -= amountToPay;
          
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
    }
    
    // ========== STEP 7: Determine status ==========
    months.forEach(month => {
      if (month.paid >= month.rent) {
        month.status = 'paid';
        month.pending = 0;
      } else if (month.paid > 0) {
        month.status = 'partial';
      } else if (month.isPastMonth && month.paid === 0) {
        month.status = 'overdue';
      } else {
        month.status = 'pending';
      }
    });
    
    // ========== STEP 8: Calculate totals ==========
    const totalPaid = months.reduce((sum, m) => sum + m.paid, 0);
    const totalExpected = months.reduce((sum, m) => sum + m.rent, 0);
    const totalPending = months.reduce((sum, m) => sum + m.pending, 0);
    
    // ========== STEP 9: Create unpaid months list ==========
    const unpaidMonths = months
      .filter(m => m.pending > 0)
      .map(m => ({
        month: m.month,
        month_num: m.month_num,
        year: m.year,
        month_key: m.month_key,
        pending: m.pending,
        rent: m.rent,
        original_rent: m.original_rent,
        has_discount: m.has_discount,
        display: `${m.month} ${m.year} - ₹${m.pending.toLocaleString()} (Rent: ₹${m.rent.toLocaleString()})${m.has_discount ? ' *Discounted' : ''}`
      }));
    
    // ========== STEP 10: Get security deposit payments ==========
    const [securityDepositPayments] = await db.execute(
      `SELECT 
        id,
        amount,
          total_amount,
          discount_amount,
        previous_balance,
        new_balance,

        payment_date,
        payment_mode,
        transaction_id,
        remark,
        status
       FROM payments 
       WHERE tenant_id = ? AND payment_type = 'security_deposit'
       ORDER BY payment_date ASC`,
      [tenantId]
    );
    
    const totalDepositPaid = securityDepositPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const depositPending = Math.max(0, securityDepositAmount - totalDepositPaid);
    
    // ========== STEP 11: Build final result ==========
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
      monthly_rent: originalMonthlyRent,
      discounted_first_month_rent: discountedFirstMonthRent,
      discount_amount: discountAmountValue,
      has_offer: hasOffer,
      offer_info: offerDetails,  // <-- THIS IS THE KEY!
      check_in_date: tenant.check_in_date,
      joining_date: joinDate.toISOString().split('T')[0],
      total_months_since_joining: totalMonthsSinceJoining,
      month_wise_history: months,
      unpaid_months: unpaidMonths,
      recent_months: months.slice(-3).reverse(),
      total_paid: totalPaid,
      total_expected: totalExpected,
      total_pending: totalPending,
      suggested_amount: totalPending > 0 ? totalPending : unpaidMonths[0]?.pending || 0,
      payment_count: rentPayments.length,
      last_payment_date: rentPayments.length > 0 ? rentPayments[rentPayments.length - 1].payment_date : null,
      security_deposit: {
        total: securityDepositAmount,
        paid: totalDepositPaid,
        pending: depositPending,
        is_fully_paid: depositPending === 0,
        payments: securityDepositPayments,
        last_payment_date: securityDepositPayments.length > 0 ? securityDepositPayments[0].payment_date : null
      },
      note: hasOffer ? `🎉 Offer Applied: ${offerDetails.code} - First month rent: ₹${discountedFirstMonthRent.toLocaleString()} (was ₹${originalMonthlyRent.toLocaleString()})` : null
    };
    
    console.log('📊 Final result offer_info:', result.offer_info);
    
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
    const [rows] = await db.execute(query, params);
    return rows;
  } catch (error) {
    console.error("Error in getReceipts:", error);
    throw error; // This will cause the 500 error
  }
},

  // Get receipt by ID
// In your payment model, update getReceiptById
async getReceiptById(id) {
  const query = `
    SELECT 
      p.id,
      p.amount,
      p.previous_balance,
      p.new_balance,
      p.payment_date,
      p.payment_mode,
      p.bank_name,
      p.transaction_id,
      p.payment_proof,
      p.month,
      p.year,
      p.remark,
      p.created_at,
      p.status,
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
      ba.bed_type,
      
      -- Calculate total paid for this tenant (all approved payments)
      (SELECT COALESCE(SUM(amount), 0) 
       FROM payments 
       WHERE tenant_id = p.tenant_id 
         AND status = 'approved'
         AND id <= p.id
      ) as total_paid,
      
      -- Calculate total pending for this tenant
      (SELECT COALESCE(SUM(amount), 0) 
       FROM payments 
       WHERE tenant_id = p.tenant_id 
         AND status = 'pending'
      ) as total_pending
      
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
    console.error("Error in getReceiptById:", error);
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

      const [rows] = await db.execute(query, params);
      
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

async rejectPayment(id, rejectionReason, rejectionReasonCategoryId, rejectedBy) {
  const query = `
    UPDATE payments 
    SET status = 'rejected', 
        rejected_at = NOW(), 
        rejected_by = ?,
        rejection_reason = ?,
        rejection_reason_category_id = ?,
        updated_at = NOW()
    WHERE id = ?
  `;
  try {
    const [result] = await db.execute(query, [
      rejectedBy || null, 
      rejectionReason, 
      rejectionReasonCategoryId || null, 
      id
    ]);
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
},


};

module.exports = Payment;















