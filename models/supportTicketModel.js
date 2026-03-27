// models/supportTicketModel.js
const db = require('../config/db');

class SupportTicketModel {

  // Create a new ticket
  static async create(data) {
    const { name, email, phone, subject, category, priority, message, tenant_id } = data;

    const [result] = await db.query(
      `INSERT INTO support_tickets
         (tenant_id, name, email, phone, subject, category, priority, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id || null, name, email, phone || null, subject, category, priority || 'medium', message]
    );
    return result.insertId;
  }

  // Get all tickets (admin view) – optional filters
  static async getAll({ status, priority, category, search } = {}) {
    let where = [];
    let params = [];

    if (status && status !== 'all')   { where.push('st.status = ?');   params.push(status); }
    if (priority && priority !== 'all') { where.push('st.priority = ?'); params.push(priority); }
    if (category && category !== 'all') { where.push('st.category = ?'); params.push(category); }
    if (search) {
      where.push('(st.subject LIKE ? OR st.name LIKE ? OR st.email LIKE ? OR st.message LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT st.*
       FROM support_tickets st
       ${whereClause}
       ORDER BY st.created_at DESC`,
      params
    );
    return rows;
  }

  // Get single ticket by id
  static async getById(id) {
    const [rows] = await db.query(
      `SELECT * FROM support_tickets WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // Update status + optional admin_notes
  static async updateStatus(id, status, adminNotes) {
    let noteUpdate = '';
    let params = [status];

    if (adminNotes && adminNotes.trim()) {
      const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const newEntry  = `\n----------------------------------------\n[${timestamp}]\nStatus: ${status}\nNote: ${adminNotes}`;
      noteUpdate = `, admin_notes = CONCAT(COALESCE(admin_notes, ''), ?)`;
      params.push(newEntry);
    }

    params.push(id);
    const [result] = await db.query(
      `UPDATE support_tickets SET status = ?${noteUpdate}, updated_at = NOW() WHERE id = ?`,
      params
    );
    return result.affectedRows > 0;
  }

  // Count by status (for badge counts)
  static async getCounts() {
    const [rows] = await db.query(
      `SELECT
         COUNT(*)                                        AS total,
         SUM(status = 'open')                           AS open,
         SUM(status = 'in_progress')                    AS in_progress,
         SUM(status = 'resolved' OR status = 'closed')  AS resolved
       FROM support_tickets`
    );
    return rows[0];
  }

  // Bulk delete
  static async bulkDelete(ids) {
    if (!ids || ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await db.query(
      `DELETE FROM support_tickets WHERE id IN (${placeholders})`,
      ids
    );
    return result.affectedRows;
  }
}

module.exports = SupportTicketModel;