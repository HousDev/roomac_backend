// models/restrictionModel.js
const db = require("../config/db");

// ── Convert ISO string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) ────────
const toMySQLDateTime = (isoString) => {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    // Format: YYYY-MM-DD HH:MM:SS
    return date.toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    return null;
  }
};

const RestrictionModel = {

  // ── Get all restrictions ─────────────────────────────────────────────────
  getAll: async (filters = {}) => {
    let query = `SELECT * FROM visitor_restrictions WHERE 1=1`;
    const params = [];

    if (filters.property_id) {
      query += ` AND property_id = ?`;
      params.push(parseInt(filters.property_id));
    }
    if (filters.is_active !== undefined && filters.is_active !== '') {
      query += ` AND is_active = ?`;
      params.push(filters.is_active === 'true' || filters.is_active === true ? 1 : 0);
    }
    if (filters.restriction_type) {
      query += ` AND restriction_type = ?`;
      params.push(filters.restriction_type);
    }
    if (filters.search) {
      query += ` AND (property_name LIKE ? OR description LIKE ? OR restriction_type LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(query, params);
    return rows;
  },

  // ── Get single restriction ───────────────────────────────────────────────
  getById: async (id) => {
    const [[row]] = await db.query(
      `SELECT * FROM visitor_restrictions WHERE id = ?`, [id]
    );
    return row || null;
  },

  // ── Create restriction ───────────────────────────────────────────────────
  create: async (data) => {
    const {
      property_id, property_name,
      restriction_type, start_time, end_time,
      description, is_active,
    } = data;

    const [result] = await db.query(
      `INSERT INTO visitor_restrictions
       (property_id, property_name, restriction_type, start_time, end_time, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        property_id ? parseInt(property_id) : null,
        property_name,
        restriction_type || 'Time-Based',
        toMySQLDateTime(start_time),   // ← fixed
        toMySQLDateTime(end_time),     // ← fixed
        description,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );
    return { id: result.insertId, ...data };
  },

  // ── Update restriction ───────────────────────────────────────────────────
  update: async (id, data) => {
    await db.query(
      `UPDATE visitor_restrictions SET
        property_id=?, property_name=?,
        restriction_type=?, start_time=?, end_time=?,
        description=?, is_active=?,
        updated_at=NOW()
       WHERE id=?`,
      [
        data.property_id ? parseInt(data.property_id) : null,
        data.property_name,
        data.restriction_type || 'Time-Based',
        toMySQLDateTime(data.start_time),   // ← fixed
        toMySQLDateTime(data.end_time),     // ← fixed
        data.description,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        id,
      ]
    );
    return { id, ...data };
  },

  // ── Toggle active status ─────────────────────────────────────────────────
  toggleStatus: async (id, is_active) => {
    await db.query(
      `UPDATE visitor_restrictions SET is_active = ?, updated_at = NOW() WHERE id = ?`,
      [is_active ? 1 : 0, id]
    );
    return { id, is_active };
  },

  // ── Delete single ────────────────────────────────────────────────────────
  delete: async (id) => {
    const [result] = await db.query(
      `DELETE FROM visitor_restrictions WHERE id = ?`, [id]
    );
    return result;
  },

  // ── Bulk delete ──────────────────────────────────────────────────────────
  bulkDelete: async (ids) => {
    if (!ids || ids.length === 0) return { affectedRows: 0 };
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await db.query(
      `DELETE FROM visitor_restrictions WHERE id IN (${placeholders})`, ids
    );
    return result;
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  getStats: async () => {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*)                                                              AS total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)                       AS active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END)                       AS inactive,
        SUM(CASE WHEN restriction_type = 'Time-Based'       THEN 1 ELSE 0 END) AS time_based,
        SUM(CASE WHEN restriction_type = 'Full Restriction'  THEN 1 ELSE 0 END) AS full_restriction,
        SUM(CASE WHEN restriction_type = 'Conditional'      THEN 1 ELSE 0 END) AS conditional
      FROM visitor_restrictions
    `);
    return stats;
  },

  // ── Check if a restriction is active right now for a property ────────────
  getActiveNow: async (property_id) => {
    const [rows] = await db.query(
      `SELECT * FROM visitor_restrictions
       WHERE property_id = ? AND is_active = 1
         AND start_time <= NOW() AND end_time >= NOW()`,
      [parseInt(property_id)]
    );
    return rows;
  },
};

module.exports = RestrictionModel;