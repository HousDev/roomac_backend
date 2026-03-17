// models/noticePeriodRequestModel.js
const pool = require("../config/db");

const NoticePeriodRequestModel = {
  async create(data) {
    try {
      const { tenant_id, title, description, notice_period_date } = data;
      
      const [result] = await pool.query(
        `INSERT INTO notice_period_requests 
         (tenant_id, title, description, notice_period_date, is_seen) 
         VALUES (?, ?, ?, ?, 0)`,
        [tenant_id, title, description, notice_period_date]
      );
      
      return result.insertId;
    } catch (err) {
      console.error("NoticePeriodRequestModel.create error:", err);
      throw err;
    }
  },

  async findAll(filters = {}) {
    try {
      const { search, page = 1, pageSize = 50 } = filters;
      const offset = (page - 1) * pageSize;
      const where = [];
      const params = [];

      if (search) {
        where.push("(t.full_name LIKE ? OR npr.title LIKE ?)");
        const q = `%${search}%`;
        params.push(q, q);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const sql = `
        SELECT 
          npr.*,
          t.full_name as tenant_name,
          t.email as tenant_email,
          t.phone as tenant_phone,
          t.property_id,
          p.name as property_name,
          r.room_number
        FROM notice_period_requests npr
        LEFT JOIN tenants t ON npr.tenant_id = t.id
        LEFT JOIN properties p ON t.property_id = p.id
        LEFT JOIN rooms r ON t.room_id = r.id
        ${whereSql}
        ORDER BY npr.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await pool.query(sql, [...params, pageSize, offset]);

      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM notice_period_requests npr
         LEFT JOIN tenants t ON npr.tenant_id = t.id
         ${whereSql}`,
        params
      );

      return {
        rows,
        total: countRows[0].total
      };
    } catch (err) {
      console.error("NoticePeriodRequestModel.findAll error:", err);
      throw err;
    }
  },

  async getUnseenCountByTenant(tenantId) {
    try {
      const [rows] = await pool.query(
        "SELECT COUNT(*) as count FROM notice_period_requests WHERE tenant_id = ? AND is_seen = 0",
        [tenantId]
      );
      return rows[0].count;
    } catch (err) {
      console.error("NoticePeriodRequestModel.getUnseenCountByTenant error:", err);
      throw err;
    }
  },

  async markAsSeen(id, tenantId) {
    try {
      const [result] = await pool.query(
        "UPDATE notice_period_requests SET is_seen = 1, updated_at = NOW() WHERE id = ? AND tenant_id = ?",
        [id, tenantId]
      );
      return result.affectedRows > 0;
    } catch (err) {
      console.error("NoticePeriodRequestModel.markAsSeen error:", err);
      throw err;
    }
  },

  async getTotalUnseenCount() {
    try {
      const [rows] = await pool.query(
        "SELECT COUNT(*) as count FROM notice_period_requests WHERE is_seen = 0"
      );
      return rows[0].count;
    } catch (err) {
      console.error("NoticePeriodRequestModel.getTotalUnseenCount error:", err);
      throw err;
    }
  },

  async delete(id) {
    try {
      const [result] = await pool.query("DELETE FROM notice_period_requests WHERE id = ?", [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error("NoticePeriodRequestModel.delete error:", err);
      throw err;
    }
  }
};

module.exports = NoticePeriodRequestModel;