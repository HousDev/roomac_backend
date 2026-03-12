const db = require("../config/db");
 
// ── calculation helper (single source of truth) ────────────────────────────
function calcSettlement(data) {
  const deposit      = parseFloat(data.security_deposit)  || 0;
  const penalties    = parseFloat(data.penalties)         || 0;
  const discount     = parseFloat(data.penalty_discount)  || 0;
  const outRent      = parseFloat(data.outstanding_rent)  || 0;
  const otherDed     = parseFloat(data.other_deductions)  || 0;
 
  const netPenalties    = Math.max(0, penalties - discount);
  const totalDeductions = netPenalties + outRent + otherDed;
  const refundAmount    = Math.max(0, deposit - totalDeductions);
 
  return { totalDeductions, refundAmount };
}
 
const SettlementModel = {
 
  getAll: async (filters = {}) => {
    let query = `SELECT * FROM tenant_settlements WHERE 1=1`;
    const params = [];
    if (filters.status) { query += ` AND status = ?`;  params.push(filters.status); }
    if (filters.search) {
      query += ` AND (tenant_name LIKE ? OR property_name LIKE ? OR room_number LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    query += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(query, params);
    return rows;
  },
 
  getById: async (id) => {
    const [[row]] = await db.query(`SELECT * FROM tenant_settlements WHERE id = ?`, [id]);
    return row || null;
  },
 
  create: async (data) => {
    const { totalDeductions, refundAmount } = calcSettlement(data);
 
    const [result] = await db.query(
      `INSERT INTO tenant_settlements
       (handover_id, tenant_id, tenant_name, tenant_phone, tenant_email,
        property_name, room_number, bed_number, settlement_date, move_out_date,
        security_deposit, penalties, penalty_discount, outstanding_rent, other_deductions,
        total_deductions, refund_amount,
        payment_method, payment_reference, notes, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.handover_id ? parseInt(data.handover_id) : null,
        data.tenant_id   ? parseInt(data.tenant_id)   : null,
        data.tenant_name, data.tenant_phone, data.tenant_email || null,
        data.property_name, data.room_number, data.bed_number || null,
        data.settlement_date, data.move_out_date || null,
        parseFloat(data.security_deposit)  || 0,
        parseFloat(data.penalties)         || 0,
        parseFloat(data.penalty_discount)  || 0,
        parseFloat(data.outstanding_rent)  || 0,
        parseFloat(data.other_deductions)  || 0,
        totalDeductions,
        refundAmount,
        data.payment_method || 'Bank Transfer',
        data.payment_reference || null,
        data.notes || null,
        data.status || 'Pending',
      ]
    );
 
    return { id: result.insertId, ...data, total_deductions: totalDeductions, refund_amount: refundAmount };
  },
 
  update: async (id, data) => {
    const { totalDeductions, refundAmount } = calcSettlement(data);
 
    await db.query(
      `UPDATE tenant_settlements SET
        handover_id=?, tenant_id=?, tenant_name=?, tenant_phone=?, tenant_email=?,
        property_name=?, room_number=?, bed_number=?, settlement_date=?, move_out_date=?,
        security_deposit=?, penalties=?, penalty_discount=?, outstanding_rent=?, other_deductions=?,
        total_deductions=?, refund_amount=?,
        payment_method=?, payment_reference=?, notes=?, status=?,
        updated_at=NOW()
       WHERE id=?`,
      [
        data.handover_id ? parseInt(data.handover_id) : null,
        data.tenant_id   ? parseInt(data.tenant_id)   : null,
        data.tenant_name, data.tenant_phone, data.tenant_email || null,
        data.property_name, data.room_number, data.bed_number || null,
        data.settlement_date, data.move_out_date || null,
        parseFloat(data.security_deposit)  || 0,
        parseFloat(data.penalties)         || 0,
        parseFloat(data.penalty_discount)  || 0,
        parseFloat(data.outstanding_rent)  || 0,
        parseFloat(data.other_deductions)  || 0,
        totalDeductions,
        refundAmount,
        data.payment_method || 'Bank Transfer',
        data.payment_reference || null,
        data.notes || null,
        data.status || 'Pending',
        id,
      ]
    );
 
    return { id, ...data, total_deductions: totalDeductions, refund_amount: refundAmount };
  },
 
  delete: async (id) => {
    const [result] = await db.query(`DELETE FROM tenant_settlements WHERE id = ?`, [id]);
    return result;
  },
 
  getStats: async () => {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*)                                                   AS total,
        SUM(status = 'Pending')                                    AS pending,
        SUM(status = 'Processing')                                 AS processing,
        SUM(status = 'Paid')                                       AS paid,
        SUM(status = 'Completed')                                  AS completed,
        SUM(status = 'Cancelled')                                  AS cancelled,
        COALESCE(SUM(refund_amount), 0)                            AS total_refunds,
        COALESCE(SUM(security_deposit), 0)                         AS total_deposits,
        COALESCE(SUM(total_deductions), 0)                         AS total_deductions
      FROM tenant_settlements
    `);
    return stats;
  },
};
 
module.exports = SettlementModel;
 
 