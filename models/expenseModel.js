// models/expenseModel.js
// Single `expenses` table — items stored as JSON column
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
      if (filters.status) {
        query += ` AND status = ?`;
        params.push(filters.status);
      }
      if (filters.search) {
        query += ` AND (description LIKE ? OR category_name LIKE ? OR paid_by_name LIKE ? OR added_by_name LIKE ?)`;
        const s = `%${filters.search}%`;
        params.push(s, s, s, s);
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

  // ── Create expense ──────────────────────────────────────────────────────
  create: async (data) => {
    try {
      const {
        property_id, property_name,
        category_id, category_name,
        description, amount,
        paid_by_staff_id, paid_by_name,
        receipt_url, receipt_name,
        expense_date, status,
        added_by_name, notes,
        items = [],
      } = data;

      const itemsJson = items.length ? JSON.stringify(items) : null;

      const [result] = await db.query(
        `INSERT INTO expenses
           (property_id, property_name, category_id, category_name,
            description, amount, paid_by_staff_id, paid_by_name,
            receipt_url, receipt_name, expense_date, status,
            added_by_name, notes, items)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          parseInt(property_id),
          property_name,
          parseInt(category_id) || 0,
          category_name,
          description,
          parseFloat(amount) || 0,
          paid_by_staff_id ? parseInt(paid_by_staff_id) : null,
          paid_by_name,
          receipt_url  || null,
          receipt_name || null,
          expense_date,
          status || "Pending",
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

  // ── Update expense ──────────────────────────────────────────────────────
  update: async (id, data) => {
    try {
      const allowed = [
        "property_id", "property_name",
        "category_id", "category_name",
        "description", "amount",
        "paid_by_staff_id", "paid_by_name",
        "receipt_url", "receipt_name",
        "expense_date", "status",
        "added_by_name", "notes",
      ];

      const fields = [];
      const values = [];

      allowed.forEach((key) => {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(data[key] === "" ? null : data[key]);
        }
      });

      // Always update items column
      const itemsJson = Array.isArray(data.items) && data.items.length
        ? JSON.stringify(data.items)
        : null;
      fields.push(`items = ?`);
      values.push(itemsJson);

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
      if (filters.month) {
        where += " AND DATE_FORMAT(expense_date,'%Y-%m') = ?";
        params.push(filters.month);
      }

      const [rows] = await db.query(
        `SELECT
           COUNT(*)                                          AS total_count,
           COALESCE(SUM(amount), 0)                         AS total_amount,
           COALESCE(SUM(IF(status='Paid',   amount, 0)), 0) AS paid_amount,
           COALESCE(SUM(IF(status='Pending',amount, 0)), 0) AS pending_amount,
           COUNT(IF(status='Paid',   1, NULL))              AS paid_count,
           COUNT(IF(status='Pending',1, NULL))              AS pending_count
         FROM expenses ${where}`,
        params
      );
      return rows[0];
    } catch (err) {
      console.error("ExpenseModel.getStats Error:", err);
      throw err;
    }
  },
};

module.exports = ExpenseModel;