// models/expenseModel.js
const db = require("../config/db");

/* ── tiny helper: safely parse JSON items column ─────────────────────────── */
const parseItems = (raw) => {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const ExpenseModel = {
  // ── Get all expenses with optional filters ──────────────────────────────
// In getAll method of expenseModel.js, remove description from search
getAll: async (filters = {}) => {
  try {
    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    if (filters.property_id) {
      query += ` AND property_id = ?`;
      params.push(filters.property_id);
    }
    if (filters.category_id) {
      query += ` AND category_id = ?`;
      params.push(filters.category_id);
    }
    if (filters.payment_mode) {
      query += ` AND payment_mode = ?`;
      params.push(filters.payment_mode);
    }
    if (filters.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }
    // Remove description from search - only search in category_name, payment_mode, added_by_name
    if (filters.search) {
      query += ` AND (category_name LIKE ? OR payment_mode LIKE ? OR added_by_name LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    if (filters.from_date) {
      query += ` AND expense_date >= ?`;
      params.push(filters.from_date);
    }
    if (filters.to_date) {
      query += ` AND expense_date <= ?`;
      params.push(filters.to_date);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.query(query, params);
    return rows.map((r) => ({ ...r, items: parseItems(r.items) }));
  } catch (err) {
    console.error("ExpenseModel.getAll Error:", err);
    throw err;
  }
},

  // ── Get single expense by ID ────────────────────────────────────────────
  getById: async (id) => {
    try {
      const [rows] = await db.query(`SELECT * FROM expenses WHERE id = ?`, [id]);
      if (!rows.length) return null;
      return { ...rows[0], items: parseItems(rows[0].items) };
    } catch (err) {
      console.error("ExpenseModel.getById Error:", err);
      throw err;
    }
  },

// Update the create method
create: async (data) => {
  try {
    const {
      property_id, property_name,
      category_id, category_name,
      total_amount, vendor_name,
      expense_date, status,
      added_by_name, notes,
      items = [],
      payment_mode = null,
      receipt_url = null,
      receipt_name = null,
    } = data;

    // Parse items if it's a string (coming from FormData)
    let parsedItems = items;
    if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        console.error("Error parsing items:", e);
        parsedItems = [];
      }
    }
    
    // Ensure parsedItems is an array
    if (!Array.isArray(parsedItems)) {
      parsedItems = [];
    }

    // Calculate totals from items if not provided
    let finalTotalAmount = total_amount || 0;
    let finalTotalPaid = 0;
    let finalBalance = finalTotalAmount;
    
    if (parsedItems && parsedItems.length > 0) {
      finalTotalAmount = parsedItems.reduce((sum, item) => {
        return sum + (parseFloat(item.total_amount) || 0);
      }, 0);
      
      finalTotalPaid = parsedItems.reduce((sum, item) => {
        return sum + (parseFloat(item.paid_amount) || 0);
      }, 0);
      
      finalBalance = finalTotalAmount - finalTotalPaid;
    }
    
    const itemsJson = parsedItems.length ? JSON.stringify(parsedItems) : null;

    const [result] = await db.query(
      `INSERT INTO expenses
         (property_id, property_name, category_id, category_name,
          total_amount, total_paid, balance, vendor_name, status,
          payment_mode, receipt_url, receipt_name, expense_date,
          added_by_name, notes, items)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        parseInt(property_id),
        property_name,
        parseInt(category_id) || 0,
        category_name,
        finalTotalAmount,
        finalTotalPaid,
        finalBalance,
        vendor_name || null,
        status || 'Pending',
        payment_mode || null,
        receipt_url || null,
        receipt_name || null,
        expense_date,
        added_by_name,
        notes || null,
        itemsJson,
      ]
    );

    return { id: result.insertId };
  } catch (err) {
    console.error("ExpenseModel.create Error:", err);
    throw err;
  }
},

// Update the update method
update: async (id, data) => {
  try {
    // Parse items if it's a string
    let parsedItems = data.items;
    if (typeof data.items === 'string') {
      try {
        parsedItems = JSON.parse(data.items);
      } catch (e) {
        console.error("Error parsing items in update:", e);
        parsedItems = null;
      }
    }
    
    // If we have items, recalculate totals from items (most reliable)
    if (parsedItems && Array.isArray(parsedItems) && parsedItems.length > 0) {
      const total_amount = parsedItems.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
      const total_paid = parsedItems.reduce((sum, item) => sum + (parseFloat(item.paid_amount) || 0), 0);
      const balance = total_amount - total_paid;
      
      let status = 'Pending';
      if (balance === 0 && total_paid > 0) status = 'Paid';
      else if (total_paid > 0 && balance > 0) status = 'Partial';
      
      // Override with calculated values
      data.total_amount = total_amount;
      data.total_paid = total_paid;
      data.balance = balance;
      data.status = status;
    }
    
    const allowed = [
      "property_id", "property_name",
      "category_id", "category_name",
      "total_amount", "total_paid", "balance", "vendor_name",
      "payment_mode",
      "receipt_url", "receipt_name",
      "expense_date", "status",
      "added_by_name", "notes",
    ];

    const fields = [];
    const values = [];

    allowed.forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        fields.push(`${key} = ?`);
        values.push(data[key] === "" ? null : data[key]);
      }
    });

    // Always update items column
    if (parsedItems && Array.isArray(parsedItems)) {
      const itemsJson = JSON.stringify(parsedItems);
      fields.push(`items = ?`);
      values.push(itemsJson);
    }

    if (fields.length === 0) return { affectedRows: 0 };

    values.push(id);
    const [result] = await db.query(
      `UPDATE expenses SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
      values
    );
    return result;
  } catch (err) {
    console.error("ExpenseModel.update Error:", err);
    throw err;
  }
},

  // ── Delete expense ──────────────────────────────────────────────────────
  delete: async (id) => {
    try {
      const [result] = await db.query(`DELETE FROM expenses WHERE id = ?`, [id]);
      return result;
    } catch (err) {
      console.error("ExpenseModel.delete Error:", err);
      throw err;
    }
  },

// ── Stats ───────────────────────────────────────────────────────────────
getStats: async (filters = {}) => {
  try {
    let where = "WHERE 1=1";
    const params = [];
    if (filters.property_id) {
      where += " AND property_id = ?";
      params.push(filters.property_id);
    }
    if (filters.payment_mode) {
      where += " AND payment_mode = ?";
      params.push(filters.payment_mode);
    }
    if (filters.month) {
      where += " AND DATE_FORMAT(expense_date,'%Y-%m') = ?";
      params.push(filters.month);
    }

    const [rows] = await db.query(
      `SELECT
         COUNT(*)                                          AS total_count,
         COALESCE(SUM(total_amount), 0)                    AS total_amount,
         COALESCE(SUM(total_paid), 0)                      AS total_paid,
         COALESCE(SUM(balance), 0)                         AS total_balance,
         COUNT(IF(status='Paid', 1, NULL))                 AS paid_count,
         COUNT(IF(status='Partial', 1, NULL))              AS partial_count,
         COUNT(IF(status='Pending', 1, NULL))              AS pending_count
       FROM expenses ${where}`,
      params
    );
    return rows[0];
  } catch (err) {
    console.error("ExpenseModel.getStats Error:", err);
    throw err;
  }
},

// Add to ExpenseModel in expenseModel.js

// ── Create payment transaction and update expense items ─────────────────────
createPaymentTransaction: async (data) => {
  try {
    const {
      expense_id,
      paid_amount,
      payment_mode,
      transaction_date,
      reference_no,
      notes,
      created_by,
    } = data;

    // 1. Get the current expense with its items
    const [expenseRows] = await db.query(`SELECT * FROM expenses WHERE id = ?`, [expense_id]);
    if (!expenseRows.length) throw new Error("Expense not found");
    
    const expense = expenseRows[0];
    let items = parseItems(expense.items);
    
    console.log("Current items before payment:", JSON.stringify(items));
    
    // 2. Distribute the payment across items
    let remainingAmount = parseFloat(paid_amount);
    let updatedItems = [...items];
    
    // Pay items that have balance (in order)
    for (let i = 0; i < updatedItems.length && remainingAmount > 0; i++) {
      const item = updatedItems[i];
      const currentPaid = parseFloat(item.paid_amount) || 0;
      const totalAmount = parseFloat(item.total_amount) || (parseFloat(item.qty) * parseFloat(item.price));
      const itemBalance = totalAmount - currentPaid;
      
      if (itemBalance > 0) {
        const paymentToThisItem = Math.min(remainingAmount, itemBalance);
        const newPaid = currentPaid + paymentToThisItem;
        const newBalance = totalAmount - newPaid;
        
        console.log(`Paying ${paymentToThisItem} to item ${item.name}: old paid=${currentPaid}, new paid=${newPaid}, balance=${newBalance}`);
        
        updatedItems[i] = {
          ...item,
          paid_amount: newPaid,
          balance: newBalance,
          item_status: newBalance === 0 ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Pending')
        };
        
        remainingAmount -= paymentToThisItem;
      }
    }
    
    // 3. Calculate new totals from updated items
    const totalAmount = updatedItems.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);
    const newTotalPaid = updatedItems.reduce((sum, i) => sum + (parseFloat(i.paid_amount) || 0), 0);
    const newBalance = totalAmount - newTotalPaid;
    
    let expenseStatus = 'Pending';
    if (newBalance === 0 && newTotalPaid > 0) expenseStatus = 'Paid';
    else if (newTotalPaid > 0 && newBalance > 0) expenseStatus = 'Partial';
    
    console.log(`Updating expense: total_amount=${totalAmount}, total_paid=${newTotalPaid}, balance=${newBalance}, status=${expenseStatus}`);
    
    // 4. Update the expenses table with new item data and totals
    await db.query(
      `UPDATE expenses 
       SET items = ?, 
           total_paid = ?, 
           balance = ?, 
           status = ?,
           updated_at = NOW() 
       WHERE id = ?`,
      [JSON.stringify(updatedItems), newTotalPaid, newBalance, expenseStatus, expense_id]
    );
    
    // 5. Insert payment transaction record
    const [result] = await db.query(
      `INSERT INTO expense_transactions
         (expense_id, total_amount, total_paid, paid_amount, balance, status, payment_mode, transaction_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense_id,
        totalAmount,
        newTotalPaid,
        paid_amount,
        newBalance,
        expenseStatus,
        payment_mode || null,
        transaction_date || new Date(),
        created_by || null,
      ]
    );

    return { 
      id: result.insertId, 
      total_paid: newTotalPaid, 
      balance: newBalance, 
      status: expenseStatus,
      items: updatedItems 
    };
  } catch (err) {
    console.error("ExpenseModel.createPaymentTransaction Error:", err);
    throw err;
  }
},

// ── Get payment transactions for an expense ─────────────────────────────────
getPaymentTransactions: async (expense_id) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM expense_transactions WHERE expense_id = ? ORDER BY transaction_date DESC`,
      [expense_id]
    );
    return rows;
  } catch (err) {
    console.error("ExpenseModel.getPaymentTransactions Error:", err);
    throw err;
  }
},

// ── Get all payment transactions with filters ───────────────────────────────
getAllPaymentTransactions: async (filters = {}) => {
  try {
    let query = `SELECT * FROM expense_transactions WHERE 1=1`;
    const params = [];

    if (filters.expense_id) {
      query += ` AND expense_id = ?`;
      params.push(filters.expense_id);
    }
    if (filters.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }
    if (filters.from_date) {
      query += ` AND DATE(transaction_date) >= ?`;
      params.push(filters.from_date);
    }
    if (filters.to_date) {
      query += ` AND DATE(transaction_date) <= ?`;
      params.push(filters.to_date);
    }

    query += ` ORDER BY transaction_date DESC`;

    const [rows] = await db.query(query, params);
    return rows;
  } catch (err) {
    console.error("ExpenseModel.getAllPaymentTransactions Error:", err);
    throw err;
  }
},
};

module.exports = ExpenseModel;