// handoverModel.js
const db = require("../config/db");

const HandoverModel = {

  // ── Get all handovers with optional filters ─────────────────────────────
 getAll: async (filters = {}) => {
  let query = `SELECT * FROM tenant_handovers WHERE 1=1`;
  const params = [];
  if (filters.property_id) { query += ` AND property_id = ?`; params.push(parseInt(filters.property_id)); }
  if (filters.tenant_id)   { query += ` AND tenant_id = ?`;   params.push(parseInt(filters.tenant_id)); }
  if (filters.status)      { query += ` AND status = ?`;       params.push(filters.status); }
  if (filters.search) {
    query += ` AND (tenant_name LIKE ? OR property_name LIKE ? OR room_number LIKE ?)`;
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  query += ` ORDER BY created_at DESC`;
  const [rows] = await db.query(query, params);
  // Parse handover_items JSON
  return rows.map(r => ({
    ...r,
    handover_items: r.handover_items
      ? (typeof r.handover_items === 'string' ? JSON.parse(r.handover_items) : r.handover_items)
      : []
  }));
},

  // ── Get single handover with items ──────────────────────────────────────
 getById: async (id) => {
  const [[handover]] = await db.query(`SELECT * FROM tenant_handovers WHERE id = ?`, [id]);
  if (!handover) return null;
  handover.handover_items = handover.handover_items
    ? (typeof handover.handover_items === 'string' ? JSON.parse(handover.handover_items) : handover.handover_items)
    : [];
  return handover;
},

  // ── Create handover + items (transaction) ───────────────────────────────
  create: async (data) => {
  const {
    tenant_id, tenant_name, tenant_phone, tenant_email,
    property_id, property_name, room_number, bed_number,
    move_in_date, handover_date, inspector_name,
    security_deposit, rent_amount, notes, status,
    handover_items = [],
  } = data;

  const [result] = await db.query(
    `INSERT INTO tenant_handovers
     (tenant_id, tenant_name, tenant_phone, tenant_email,
      property_id, property_name, room_number, bed_number,
      move_in_date, handover_date, inspector_name,
      security_deposit, rent_amount, notes, status, handover_items)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      parseInt(tenant_id) || 0, tenant_name, tenant_phone, tenant_email || null,
      parseInt(property_id), property_name, room_number, bed_number || null,
      move_in_date, handover_date, inspector_name,
      parseFloat(security_deposit) || 0, parseFloat(rent_amount) || 0,
      notes || null, status || 'Active',
      JSON.stringify(handover_items),   // ← JSON column mein save
    ]
  );
  return { id: result.insertId, ...data };
},

  // ── Update handover + replace items ─────────────────────────────────────
 update: async (id, data) => {
  const { handover_items, ...rest } = data;
  await db.query(
    `UPDATE tenant_handovers SET
      tenant_id=?, tenant_name=?, tenant_phone=?, tenant_email=?,
      property_id=?, property_name=?, room_number=?, bed_number=?,
      move_in_date=?, handover_date=?, inspector_name=?,
      security_deposit=?, rent_amount=?, notes=?, status=?,
      handover_items=?, updated_at=NOW()
     WHERE id=?`,
    [
      parseInt(data.tenant_id) || 0, data.tenant_name, data.tenant_phone, data.tenant_email || null,
      parseInt(data.property_id), data.property_name, data.room_number, data.bed_number || null,
      data.move_in_date, data.handover_date, data.inspector_name,
      parseFloat(data.security_deposit) || 0, parseFloat(data.rent_amount) || 0,
      data.notes || null, data.status || 'Active',
      JSON.stringify(handover_items || []),
      id,
    ]
  );
  return { id, ...data };
},

  // ── Delete handover (items auto-deleted via FK CASCADE) ──────────────────
  delete: async (id) => {
    const [result] = await db.query(`DELETE FROM tenant_handovers WHERE id = ?`, [id]);
    return result;
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  getStats: async () => {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Active'    THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'Pending'   THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
        SUM(security_deposit) as total_deposits,
        SUM(rent_amount)      as total_rent
      FROM tenant_handovers
    `);
    return stats;
  },
};

module.exports = HandoverModel;