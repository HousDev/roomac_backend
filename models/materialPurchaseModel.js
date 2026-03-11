const db = require("../config/db");

const MaterialPurchaseModel = {
  // Get all purchases with optional filters
 // Get all purchases with optional filters
getAllPurchases: async (filters = {}) => {
  try {
    let query = `
      SELECT 
        mp.*,
        p.name as property_full_name
      FROM material_purchases mp
      LEFT JOIN properties p ON mp.property_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.property_id) {
      query += ` AND mp.property_id = ?`;
      params.push(filters.property_id);
    }

    if (filters.payment_status) {
      query += ` AND mp.payment_status = ?`;
      params.push(filters.payment_status);
    }

    if (filters.search) {
      query += ` AND (mp.vendor_name LIKE ? OR mp.invoice_number LIKE ? OR mp.items_summary LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.from_date) {
      query += ` AND mp.purchase_date >= ?`;
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ` AND mp.purchase_date <= ?`;
      params.push(filters.to_date);
    }

    query += ` ORDER BY mp.purchase_date DESC, mp.created_at DESC`;

    const [rows] = await db.query(query, params);
    
    // Parse items JSON for each row
    rows.forEach(row => {
      if (row.items) {
        try {
          // 🔥 IMPORTANT: Parse karo aur purchase_items mein daalo
          row.purchase_items = JSON.parse(row.items);
        } catch (e) {
          console.error('Error parsing items JSON:', e);
          row.purchase_items = [];
        }
      } else {
        row.purchase_items = [];
      }
      
      // 🔥 IMPORTANT: items ko delete mat karo, frontend dono access kar sake
      // delete row.items;  // ← ISSE HATA DO YA COMMENT KAR DO
    });
    
    return rows;
  } catch (err) {
    console.error("MaterialPurchaseModel.getAllPurchases Error:", err);
    throw err;
  }
},

  // Get purchase by ID
  getPurchaseById: async (id) => {
    try {
      const [rows] = await db.query(
        `SELECT 
          mp.*,
          p.name as property_full_name
        FROM material_purchases mp
        LEFT JOIN properties p ON mp.property_id = p.id
        WHERE mp.id = ?`,
        [id]
      );
      
      if (rows.length > 0) {
        const row = rows[0];
        if (row.items) {
          try {
            row.purchase_items = JSON.parse(row.items);
          } catch (e) {
            console.error('Error parsing items JSON:', e);
            row.purchase_items = [];
          }
        }
        delete row.items;
        return row;
      }
      return null;
    } catch (err) {
      console.error("MaterialPurchaseModel.getPurchaseById Error:", err);
      throw err;
    }
  },

  // Create new purchase
  createPurchase: async (data) => {
    try {
      const {
        purchase_date, vendor_name, vendor_phone, invoice_number,
        property_id, property_name, notes, items, items_summary,
        total_amount, paid_amount = 0, payment_date, payment_method,
        paid_by, payment_reference, payment_notes
      } = data;

      // Ensure numeric values are properly parsed
      const parsedTotalAmount = parseFloat(total_amount) || 0;
      const parsedPaidAmount = parseFloat(paid_amount) || 0;
      const parsedPropertyId = parseInt(property_id) || 0;
      
      const balance_amount = parsedTotalAmount - parsedPaidAmount;
      const payment_status = balance_amount === 0 ? 'Paid' : (parsedPaidAmount > 0 ? 'Partial' : 'Pending');

      // Convert items array to JSON string
      let itemsJson;
      try {
        itemsJson = JSON.stringify(items || []);
      } catch (e) {
        console.error('Error stringifying items:', e);
        itemsJson = '[]';
      }

      const [result] = await db.query(
        `INSERT INTO material_purchases 
         (purchase_date, vendor_name, vendor_phone, invoice_number, 
          property_id, property_name, notes, items, items_summary,
          total_amount, paid_amount, balance_amount, payment_status,
          payment_date, payment_method, paid_by, payment_reference, payment_notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchase_date, 
          vendor_name, 
          vendor_phone || null, 
          invoice_number,
          parsedPropertyId, 
          property_name || '', 
          notes || null, 
          itemsJson, 
          items_summary || null,
          parsedTotalAmount, 
          parsedPaidAmount, 
          balance_amount, 
          payment_status,
          payment_date || null, 
          payment_method || null, 
          paid_by || null, 
          payment_reference || null, 
          payment_notes || null
        ]
      );

      return { id: result.insertId, ...data, payment_status, balance_amount };
    } catch (err) {
      console.error("MaterialPurchaseModel.createPurchase Error:", err);
      throw err;
    }
  },

  // Update purchase
  updatePurchase: async (id, updateData) => {
    try {
      const fields = [];
      const values = [];

      // Handle items JSON conversion
      if (updateData.items) {
        try {
          updateData.items = JSON.stringify(updateData.items);
        } catch (e) {
          console.error('Error stringifying items:', e);
        }
      }

      // Recalculate balance and status if amount changes
      if (updateData.total_amount !== undefined || updateData.paid_amount !== undefined) {
        const existing = await MaterialPurchaseModel.getPurchaseById(id);
        if (existing) {
          const total = updateData.total_amount !== undefined ? parseFloat(updateData.total_amount) : existing.total_amount;
          const paid = updateData.paid_amount !== undefined ? parseFloat(updateData.paid_amount) : existing.paid_amount;
          updateData.balance_amount = total - paid;
          updateData.payment_status = updateData.balance_amount === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');
        }
      }

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined && updateData[key] !== null) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (fields.length === 0) return { affectedRows: 0 };

      values.push(id);

      const [result] = await db.query(
        `UPDATE material_purchases SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
        values
      );

      return result;
    } catch (err) {
      console.error("MaterialPurchaseModel.updatePurchase Error:", err);
      throw err;
    }
  },

  // Add payment (update purchase with payment info) - FIXED VERSION
  addPayment: async (id, paymentData) => {
    try {
      const {
        payment_date, amount, payment_method,
        paid_by, payment_reference, payment_notes
      } = paymentData;

      // Validate and parse amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Invalid payment amount");
      }

      // Get current purchase
      const purchase = await MaterialPurchaseModel.getPurchaseById(id);
      if (!purchase) throw new Error("Purchase not found");

      // Calculate new values
      const currentPaidAmount = parseFloat(purchase.paid_amount) || 0;
      const totalAmount = parseFloat(purchase.total_amount) || 0;
      
      const newPaidAmount = currentPaidAmount + parsedAmount;
      const newBalanceAmount = totalAmount - newPaidAmount;
      const newPaymentStatus = newBalanceAmount === 0 ? 'Paid' : 'Partial';

      // Update the purchase with new payment info
      const [result] = await db.query(
        `UPDATE material_purchases 
         SET paid_amount = ?, 
             balance_amount = ?, 
             payment_status = ?,
             payment_date = ?, 
             payment_method = ?, 
             paid_by = ?,
             payment_reference = ?, 
             payment_notes = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          newPaidAmount,           // paid_amount
          newBalanceAmount,        // balance_amount
          newPaymentStatus,        // payment_status
          payment_date || null,    // payment_date
          payment_method || null,  // payment_method
          paid_by || null,         // paid_by
          payment_reference || null, // payment_reference
          payment_notes || null,   // payment_notes
          id                       // WHERE id = ?
        ]
      );

      return { 
        affectedRows: result.affectedRows,
        newPaidAmount,
        newBalanceAmount,
        newPaymentStatus
      };
    } catch (err) {
      console.error("MaterialPurchaseModel.addPayment Error:", err);
      throw err;
    }
  },

  // Delete purchase
  deletePurchase: async (id) => {
    try {
      const [result] = await db.query("DELETE FROM material_purchases WHERE id = ?", [id]);
      return result;
    } catch (err) {
      console.error("MaterialPurchaseModel.deletePurchase Error:", err);
      throw err;
    }
  },

  // Bulk delete
  bulkDelete: async (ids) => {
    try {
      // Ensure ids are numbers
      const numericIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (numericIds.length === 0) return { affectedRows: 0 };
      
      const placeholders = numericIds.map(() => "?").join(",");
      const [result] = await db.query(
        `DELETE FROM material_purchases WHERE id IN (${placeholders})`,
        numericIds
      );
      return result;
    } catch (err) {
      console.error("MaterialPurchaseModel.bulkDelete Error:", err);
      throw err;
    }
  },

  // Get statistics
  getPurchaseStats: async () => {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_purchases,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COALESCE(SUM(balance_amount), 0) as total_balance,
          SUM(CASE WHEN payment_status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN payment_status = 'Partial' THEN 1 ELSE 0 END) as partial_count,
          SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) as paid_count
        FROM material_purchases
      `);
      
      // Ensure all values are numbers, not null
      const result = stats[0] || {};
      return {
        total_purchases: parseInt(result.total_purchases) || 0,
        total_amount: parseFloat(result.total_amount) || 0,
        total_paid: parseFloat(result.total_paid) || 0,
        total_balance: parseFloat(result.total_balance) || 0,
        pending_count: parseInt(result.pending_count) || 0,
        partial_count: parseInt(result.partial_count) || 0,
        paid_count: parseInt(result.paid_count) || 0
      };
    } catch (err) {
      console.error("MaterialPurchaseModel.getPurchaseStats Error:", err);
      throw err;
    }
  }
};

module.exports = MaterialPurchaseModel;