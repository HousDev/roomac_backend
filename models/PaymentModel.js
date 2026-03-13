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

//   // Get tenant payment form data - last transaction logic
//   async getTenantPaymentFormData(tenantId) {
//     try {
//       // Step 1: Get tenant and bed assignment details
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
//       const currentMonth = currentDate.getMonth() + 1;  // 1-12
//       const currentYear = currentDate.getFullYear();
//       const assignmentMonth = assignmentDate.getMonth() + 1;
//       const assignmentYear = assignmentDate.getFullYear();

//       // Step 2: Calculate last calendar month
//       // e.g. if current is March 2026 → last month is February 2026
//       //      if current is January 2026 → last month is December 2025
//       const lastMonthDate = new Date(currentYear, currentDate.getMonth() - 1, 1);
//       const lastMonth = lastMonthDate.getMonth() + 1;  // 1-12
//       const lastMonthYear = lastMonthDate.getFullYear();
//       const lastMonthName = lastMonthDate.toLocaleString('default', { month: 'long' });

//       // Step 3: Get the most recent payment for this tenant
//       const [lastPaymentRows] = await db.execute(
//         `SELECT * FROM payments 
//          WHERE tenant_id = ? 
//          ORDER BY payment_date DESC, id DESC
//          LIMIT 1`,
//         [tenantId]
//       );

//       // Step 4: Get current month total paid
//       const [currentMonthPayments] = await db.execute(
//         `SELECT COALESCE(SUM(amount), 0) as total_paid
//          FROM payments 
//          WHERE tenant_id = ? 
//          AND MONTH(payment_date) = ? 
//          AND YEAR(payment_date) = ?`,
//         [tenantId, currentMonth, currentYear]
//       );
//       const currentMonthPaid = parseFloat(currentMonthPayments[0]?.total_paid) || 0;
//       const currentMonthPending = Math.max(0, monthlyRent - currentMonthPaid);

//       // Helper: build the return object
//       const buildResult = (previousMonthPending, previousMonthName, previousMonthYear, previousMonthPaid) => {
//         const totalPending = previousMonthPending + currentMonthPending;
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
//             month: previousMonthPending > 0 ? previousMonthName : '',
//             year: previousMonthPending > 0 ? previousMonthYear : 0,
//             pending: previousMonthPending,
//             paid: previousMonthPaid
//           },
//           current_month: {
//             month: currentDate.toLocaleString('default', { month: 'long' }),
//             year: currentYear,
//             paid: currentMonthPaid,
//             pending: currentMonthPending
//           },
//           total_pending: totalPending,
//           suggested_amount: totalPending
//         };
//       };

//       // ─────────────────────────────────────────────────────────────
//       // CASE 1: NO PAYMENTS FOUND (New Tenant — never paid before)
//       // → pending = 0, just show current month rent
//       // ─────────────────────────────────────────────────────────────
//       if (!lastPaymentRows.length) {
//         return buildResult(0, '', 0, 0);
//       }

//       const lastPayment = lastPaymentRows[0];
//       const lastPaymentDate = new Date(lastPayment.payment_date);
//       const lastPaymentMonth = lastPaymentDate.getMonth() + 1;
//       const lastPaymentYear = lastPaymentDate.getFullYear();

//       // ─────────────────────────────────────────────────────────────
//       // CASE 2: LAST PAYMENT IS FROM CURRENT MONTH
//       // → already paid something this month, show remaining only
//       // → no need to check previous month
//       // ─────────────────────────────────────────────────────────────
//       if (lastPaymentMonth === currentMonth && lastPaymentYear === currentYear) {
//         return buildResult(0, '', 0, 0);
//       }

//       // ─────────────────────────────────────────────────────────────
//       // CASE 3: LAST PAYMENT IS FROM A PREVIOUS MONTH
//       // → Check if tenant existed last month (joined before last month)
//       // → If yes: get last month's total paid and calculate pending
//       // → If no (joined this month): treat as new tenant, pending = 0
//       // ─────────────────────────────────────────────────────────────

//       // Check if tenant joined this month — if so, no previous month rent applies
//       const tenantJoinedThisMonth =
//         assignmentMonth === currentMonth && assignmentYear === currentYear;

//       if (tenantJoinedThisMonth) {
//         // New tenant joined this month — even if somehow has an old payment,
//         // we don't add any previous pending
//         return buildResult(0, '', 0, 0);
//       }

//       // Tenant existed before this month — check last calendar month's payments
//       const [lastMonthPayments] = await db.execute(
//         `SELECT COALESCE(SUM(amount), 0) as total_paid
//          FROM payments 
//          WHERE tenant_id = ? 
//          AND MONTH(payment_date) = ? 
//          AND YEAR(payment_date) = ?`,
//         [tenantId, lastMonth, lastMonthYear]
//       );

//       const lastMonthPaid = parseFloat(lastMonthPayments[0]?.total_paid) || 0;

//       // Did tenant exist last month? (joined on or before last month)
//       const tenantExistedLastMonth =
//         assignmentYear < lastMonthYear ||
//         (assignmentYear === lastMonthYear && assignmentMonth <= lastMonth);

//       if (!tenantExistedLastMonth) {
//         // Tenant joined in a month between last month and now — no previous pending
//         return buildResult(0, '', 0, 0);
//       }

//       // Calculate last month pending
//       const lastMonthPending = Math.max(0, monthlyRent - lastMonthPaid);

//       return buildResult(lastMonthPending, lastMonthName, lastMonthYear, lastMonthPaid);

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
//   },

//   // Create a demand payment
//   async createDemand(demandData) {
//     const query = `
//       INSERT INTO demand_payments (
//         tenant_id, amount, due_date, payment_type, 
//         description, late_fee, status, created_by
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     const values = [
//       demandData.tenant_id,
//       demandData.amount,
//       demandData.due_date,
//       demandData.payment_type || 'rent',
//       demandData.description || null,
//       demandData.late_fee || 0,
//       'pending',
//       demandData.created_by || null
//     ];

//     try {
//       const [result] = await db.execute(query, values);
//       return { 
//         id: result.insertId, 
//         ...demandData, 
//         status: 'pending',
//         total_amount: demandData.amount + (demandData.late_fee || 0)
//       };
//     } catch (error) {
//       console.error("Demand insert error:", error.message);
//       throw error;
//     }
//   },

//   // Get all demands with filters
//   async getDemands(filters = {}) {
//     try {
//       let query = `
//         SELECT 
//           d.*,
//           t.full_name as tenant_name,
//           t.phone as tenant_phone,
//           t.email as tenant_email,
//           r.room_number,
//           ba.bed_number,
//           prop.name as property_name,
//           DATEDIFF(d.due_date, CURDATE()) as days_until_due,
//           CASE 
//             WHEN d.due_date < CURDATE() AND d.status = 'pending' THEN 'overdue'
//             ELSE d.status
//           END as current_status
//         FROM demand_payments d
//         LEFT JOIN tenants t ON d.tenant_id = t.id
//         LEFT JOIN bed_assignments ba ON d.tenant_id = ba.tenant_id AND ba.is_available = 0
//         LEFT JOIN rooms r ON ba.room_id = r.id
//         LEFT JOIN properties prop ON r.property_id = prop.id
//         WHERE 1=1
//       `;
      
//       const params = [];

//       if (filters.status && filters.status !== 'all') {
//         query += ' AND d.status = ?';
//         params.push(filters.status);
//       }

//       if (filters.tenant_id) {
//         query += ' AND d.tenant_id = ?';
//         params.push(filters.tenant_id);
//       }

//       if (filters.from_date) {
//         query += ' AND DATE(d.created_at) >= ?';
//         params.push(filters.from_date);
//       }

//       if (filters.to_date) {
//         query += ' AND DATE(d.created_at) <= ?';
//         params.push(filters.to_date);
//       }

//       query += ' ORDER BY d.created_at DESC';

//       console.log('Executing demand query:', query, params);
//       const [rows] = await db.execute(query, params);
//       console.log(`Found ${rows.length} demands`);
      
//       return rows;
//     } catch (error) {
//       console.error("Error in getDemands:", error);
//       throw error;
//     }
//   },

//   // Get demand by ID
//   async getDemandById(id) {
//     const query = `
//       SELECT d.*, 
//              t.full_name as tenant_name,
//              t.phone as tenant_phone,
//              t.email as tenant_email,
//              r.room_number,
//              ba.bed_number,
//              prop.name as property_name
//       FROM demand_payments d
//       LEFT JOIN tenants t ON d.tenant_id = t.id
//       LEFT JOIN bed_assignments ba ON d.tenant_id = ba.tenant_id AND ba.is_available = 0
//       LEFT JOIN rooms r ON ba.room_id = r.id
//       LEFT JOIN properties prop ON r.property_id = prop.id
//       WHERE d.id = ?
//     `;
//     try {
//       const [rows] = await db.execute(query, [id]);
//       return rows[0];
//     } catch (error) {
//       console.error("Error fetching demand by ID:", error);
//       throw error;
//     }
//   },

//   // Update demand status
//   async updateDemandStatus(id, status) {
//     const query = 'UPDATE demand_payments SET status = ? WHERE id = ?';
//     try {
//       const [result] = await db.execute(query, [status, id]);
//       return result.affectedRows > 0;
//     } catch (error) {
//       console.error("Error updating demand status:", error);
//       throw error;
//     }
//   },

//   // Get tenant's pending demands
//   async getTenantPendingDemands(tenantId) {
//     const query = `
//       SELECT * FROM demand_payments 
//       WHERE tenant_id = ? AND status IN ('pending', 'overdue')
//       ORDER BY due_date ASC
//     `;
//     try {
//       const [rows] = await db.execute(query, [tenantId]);
//       return rows;
//     } catch (error) {
//       console.error("Error fetching tenant pending demands:", error);
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

  // Get tenant payment form data - FIXED with last transaction logic
  async getTenantPaymentFormData(tenantId) {
    try {
      // Get tenant and bed assignment details
      const [tenantData] = await db.execute(
        `SELECT 
          t.id,
          t.full_name,
          t.email,
          t.phone,
          ba.tenant_rent as monthly_rent,
          ba.bed_number,
          ba.bed_type,
          ba.created_at as assignment_date,
          r.room_number,
          prop.name as property_name
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
      const assignmentDate = new Date(tenant.assignment_date);
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const assignmentMonth = assignmentDate.getMonth() + 1;
      const assignmentYear = assignmentDate.getFullYear();

      // Get the LAST payment for this tenant (most recent)
      const [lastPayment] = await db.execute(
        `SELECT * FROM payments 
         WHERE tenant_id = ? 
         ORDER BY payment_date DESC 
         LIMIT 1`,
        [tenantId]
      );

      // Get current month payments
      const [currentMonthPayments] = await db.execute(
        `SELECT SUM(amount) as total_paid
         FROM payments 
         WHERE tenant_id = ? 
         AND MONTH(payment_date) = ? 
         AND YEAR(payment_date) = ?`,
        [tenantId, currentMonth, currentYear]
      );

      const currentMonthPaid = parseFloat(currentMonthPayments[0]?.total_paid) || 0;

      // Initialize variables
      let previousMonthPending = 0;
      let previousMonthName = '';
      let previousMonthYear = 0;
      let previousMonthPaid = 0;

      // CASE 1: NO PAYMENTS FOUND (New Tenant)
      if (!lastPayment.length) {
        return {
          tenant: {
            id: tenant.id,
            name: tenant.full_name,
            email: tenant.email,
            phone: tenant.phone
          },
          room_info: {
            room_number: tenant.room_number,
            bed_number: tenant.bed_number,
            bed_type: tenant.bed_type,
            property_name: tenant.property_name
          },
          monthly_rent: monthlyRent,
          previous_month: {
            month: '',
            year: 0,
            pending: 0,
            paid: 0
          },
          current_month: {
            month: currentDate.toLocaleString('default', { month: 'long' }),
            year: currentYear,
            paid: currentMonthPaid,
            pending: Math.max(0, monthlyRent - currentMonthPaid),
            
          },
          total_pending: Math.max(0, monthlyRent - currentMonthPaid),
          suggested_amount: Math.max(0, monthlyRent - currentMonthPaid)
        };
      }

      // We have a last payment
      const lastPaymentRecord = lastPayment[0];
      const lastPaymentDate = new Date(lastPaymentRecord.payment_date);
      const lastPaymentMonth = lastPaymentDate.getMonth() + 1;
      const lastPaymentYear = lastPaymentDate.getFullYear();

      // CASE 2: LAST PAYMENT IS FROM CURRENT MONTH
      if (lastPaymentMonth === currentMonth && lastPaymentYear === currentYear) {
        return {
          tenant: {
            id: tenant.id,
            name: tenant.full_name,
            email: tenant.email,
            phone: tenant.phone
          },
          room_info: {
            room_number: tenant.room_number,
            bed_number: tenant.bed_number,
            bed_type: tenant.bed_type,
            property_name: tenant.property_name
          },
          monthly_rent: monthlyRent,
          previous_month: {
            month: '',
            year: 0,
            pending: 0,
            paid: 0
          },
          current_month: {
            month: currentDate.toLocaleString('default', { month: 'long' }),
            year: currentYear,
            paid: currentMonthPaid,
            pending: Math.max(0, monthlyRent - currentMonthPaid)
          },
          total_pending: Math.max(0, monthlyRent - currentMonthPaid),
          suggested_amount: Math.max(0, monthlyRent - currentMonthPaid)
        };
      }

      // CASE 3: LAST PAYMENT IS FROM PREVIOUS MONTH
      // Calculate previous month (the month of last payment)
      const prevDate = new Date(lastPaymentDate);
      const prevMonth = lastPaymentMonth;
      const prevYear = lastPaymentYear;
      
      // Get total paid in that previous month
      const [prevMonthPayments] = await db.execute(
        `SELECT SUM(amount) as total_paid
         FROM payments 
         WHERE tenant_id = ? 
         AND MONTH(payment_date) = ? 
         AND YEAR(payment_date) = ?`,
        [tenantId, prevMonth, prevYear]
      );

      previousMonthPaid = parseFloat(prevMonthPayments[0]?.total_paid) || 0;
      
      // Calculate pending from previous month
      if (previousMonthPaid < monthlyRent) {
        // PARTIAL PAYMENT - has pending
        previousMonthPending = monthlyRent - previousMonthPaid;
        previousMonthName = prevDate.toLocaleString('default', { month: 'long' });
        previousMonthYear = prevYear;
      } else {
        // FULL PAYMENT - no pending
        previousMonthPending = 0;
        previousMonthName = '';
        previousMonthYear = 0;
      }

      // Calculate total to pay now
      const totalPending = previousMonthPending + Math.max(0, monthlyRent - currentMonthPaid);

      return {
        tenant: {
          id: tenant.id,
          name: tenant.full_name,
          email: tenant.email,
          phone: tenant.phone
        },
        room_info: {
          room_number: tenant.room_number,
          bed_number: tenant.bed_number,
          bed_type: tenant.bed_type,
          property_name: tenant.property_name
        },
        monthly_rent: monthlyRent,
        previous_month: {
          month: previousMonthName,
          year: previousMonthYear,
          pending: previousMonthPending,
          paid: previousMonthPaid
        },
        current_month: {
          month: currentDate.toLocaleString('default', { month: 'long' }),
          year: currentYear,
          paid: currentMonthPaid,
          pending: Math.max(0, monthlyRent - currentMonthPaid)
        },
        total_pending: totalPending,
        suggested_amount: totalPending
      };

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
      WHERE 1=1
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
      throw error;
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
  }
};

module.exports = Payment;