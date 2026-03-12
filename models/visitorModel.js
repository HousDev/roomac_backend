// models/visitorModel.js
const db = require("../config/db");

const VisitorModel = {

  // ── Get all visitors with optional filters ──────────────────────────────
  getAll: async (filters = {}) => {
    let query = `SELECT * FROM visitor_logs WHERE 1=1`;
    const params = [];

    if (filters.property_id) { query += ` AND property_id = ?`; params.push(parseInt(filters.property_id)); }
    if (filters.tenant_id)   { query += ` AND tenant_id = ?`;   params.push(parseInt(filters.tenant_id)); }
    if (filters.status)      { query += ` AND status = ?`;       params.push(filters.status); }
    if (filters.search) {
      query += ` AND (visitor_name LIKE ? OR visitor_phone LIKE ? OR tenant_name LIKE ? OR property_name LIKE ? OR qr_code LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s);
    }
    if (filters.date_from) { query += ` AND DATE(entry_time) >= ?`; params.push(filters.date_from); }
    if (filters.date_to)   { query += ` AND DATE(entry_time) <= ?`; params.push(filters.date_to); }

    query += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(query, params);
    return rows;
  },

  // ── Get single visitor ──────────────────────────────────────────────────
  getById: async (id) => {
    const [[visitor]] = await db.query(
      `SELECT * FROM visitor_logs WHERE id = ?`, [id]
    );
    return visitor || null;
  },

  // ── Create visitor entry ────────────────────────────────────────────────
  create: async (data) => {
    const {
      tenant_id, tenant_name, tenant_phone, tenant_email,
      property_id, property_name, room_number,
      visitor_name, visitor_phone,
      entry_time, tentative_exit_time,
      purpose, id_proof_type, id_proof_number,
      vehicle_number, approval_status,
      security_guard_name, qr_code, notes,
    } = data;

    const [result] = await db.query(
      `INSERT INTO visitor_logs
       (tenant_id, tenant_name, tenant_phone, tenant_email,
        property_id, property_name, room_number,
        visitor_name, visitor_phone,
        entry_time, tentative_exit_time,
        purpose, id_proof_type, id_proof_number,
        vehicle_number, approval_status,
        security_guard_name, qr_code, notes,
        status, is_blocked)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        parseInt(tenant_id) || null,
        tenant_name,
        tenant_phone   || null,
        tenant_email   || null,
        parseInt(property_id) || null,
        property_name,
        room_number,
        visitor_name,
        visitor_phone,
        entry_time || new Date(),
        tentative_exit_time || null,
        purpose,
        id_proof_type,
        id_proof_number,
        vehicle_number  || null,
        approval_status || 'Approved',
        security_guard_name,
        qr_code         || null,
        notes           || null,
        'checked_in',
        0,   // is_blocked = false by default
      ]
    );
    return { id: result.insertId, ...data, status: 'checked_in', is_blocked: 0 };
  },

  // ── Check out single visitor ────────────────────────────────────────────
  checkOut: async (id, checkedOutBy) => {
    await db.query(
      `UPDATE visitor_logs
       SET exit_time = NOW(), status = 'checked_out', checked_out_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [checkedOutBy, id]
    );
    return { id, status: 'checked_out' };
  },

  // ── Bulk check out ──────────────────────────────────────────────────────
  bulkCheckOut: async (ids, checkedOutBy) => {
    if (!ids || ids.length === 0) return { affectedRows: 0 };
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE visitor_logs
       SET exit_time = NOW(), status = 'checked_out', checked_out_by = ?, updated_at = NOW()
       WHERE id IN (${placeholders}) AND status IN ('checked_in', 'overstayed')`,
      [checkedOutBy, ...ids]
    );
    return result;
  },

  // ── Update visitor record ───────────────────────────────────────────────
  update: async (id, data) => {
    await db.query(
      `UPDATE visitor_logs SET
        visitor_name=?, visitor_phone=?,
        tenant_name=?, tenant_id=?,
        property_id=?, property_name=?, room_number=?,
        entry_time=?, tentative_exit_time=?, exit_time=?,
        purpose=?, id_proof_type=?, id_proof_number=?,
        vehicle_number=?, approval_status=?,
        security_guard_name=?, notes=?, status=?,
        updated_at=NOW()
       WHERE id=?`,
      [
        data.visitor_name,
        data.visitor_phone,
        data.tenant_name,
        parseInt(data.tenant_id)   || null,
        parseInt(data.property_id) || null,
        data.property_name,
        data.room_number,
        data.entry_time,
        data.tentative_exit_time   || null,
        data.exit_time             || null,
        data.purpose,
        data.id_proof_type,
        data.id_proof_number,
        data.vehicle_number        || null,
        data.approval_status       || 'Approved',
        data.security_guard_name,
        data.notes                 || null,
        data.status                || 'checked_in',
        id,
      ]
    );
    return { id, ...data };
  },

  // ── Delete visitor record ───────────────────────────────────────────────
  delete: async (id) => {
    const [result] = await db.query(
      `DELETE FROM visitor_logs WHERE id = ?`, [id]
    );
    return result;
  },

  // ── Block visitor — updates ALL rows matching phone + id_proof ──────────
  // This marks every existing visit record for this person as blocked
  blockVisitor: async ({ visitor_phone, id_proof_number, reason, blocked_by }) => {
    const [result] = await db.query(
      `UPDATE visitor_logs
       SET is_blocked = 1, block_reason = ?, blocked_by = ?, blocked_date = NOW(), updated_at = NOW()
       WHERE visitor_phone = ? AND id_proof_number = ?`,
      [reason, blocked_by || 'Security', visitor_phone, id_proof_number]
    );
    return result;
  },

  // ── Unblock visitor ─────────────────────────────────────────────────────
  unblockVisitor: async (visitor_phone, id_proof_number) => {
    const [result] = await db.query(
      `UPDATE visitor_logs
       SET is_blocked = 0, block_reason = NULL, blocked_by = NULL, blocked_date = NULL, updated_at = NOW()
       WHERE visitor_phone = ? AND id_proof_number = ?`,
      [visitor_phone, id_proof_number]
    );
    return result;
  },

  // ── Check if visitor is blocked (searches visitor_logs only) ───────────
  checkBlocked: async (visitor_phone, id_proof_number) => {
    const [rows] = await db.query(
      `SELECT id, visitor_name, visitor_phone, id_proof_number,
              is_blocked, block_reason, blocked_by, blocked_date
       FROM visitor_logs
       WHERE visitor_phone = ? AND id_proof_number = ? AND is_blocked = 1
       LIMIT 1`,
      [visitor_phone, id_proof_number]
    );
    return rows[0] || null;
  },

  // ── Auto-update overstayed visitors ─────────────────────────────────────
  updateOverstayed: async () => {
    const [result] = await db.query(
      `UPDATE visitor_logs
       SET status = 'overstayed', updated_at = NOW()
       WHERE status = 'checked_in'
         AND tentative_exit_time IS NOT NULL
         AND tentative_exit_time < NOW()`
    );
    return result;
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  getStats: async () => {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*)                                                              AS total,
        SUM(CASE WHEN status = 'checked_in'  THEN 1 ELSE 0 END)             AS checked_in,
        SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END)             AS checked_out,
        SUM(CASE WHEN status = 'overstayed'  THEN 1 ELSE 0 END)             AS overstayed,
        SUM(CASE WHEN DATE(entry_time) = CURDATE() THEN 1 ELSE 0 END)       AS today_total,
        SUM(CASE WHEN DATE(exit_time) = CURDATE()
                  AND status = 'checked_out' THEN 1 ELSE 0 END)             AS checked_out_today,
        SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END)                     AS total_blocked
      FROM visitor_logs
    `);
    return stats;
  },
};

module.exports = VisitorModel;