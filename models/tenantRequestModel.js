




// models/tenantRequestModel.js
const db = require("../config/db");

class TenantRequestModel {
  static async create(data) {
    const sql = `
      INSERT INTO tenant_requests
      (tenant_id, property_id, request_type, title, description, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `;

    const [result] = await db.query(sql, [
      data.tenant_id,
      data.property_id,
      data.request_type,
      data.title,
      data.description,
      data.priority || "medium",
    ]);

    return result.insertId;
  }

  static async getByTenantId(tenantId) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        request_type,
        title,
        description,
        priority,
        status,
        admin_notes,
        created_at,
        updated_at,
        resolved_at
      FROM tenant_requests
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      `,
      [tenantId]
    );

    return rows;
  }

  // NEW: Get all requests for admin - FIXED VERSION
  static async getAllRequests(requestType = null) {
    try {
      let sql = `
        SELECT 
          tr.id,
          tr.tenant_id,
          t.full_name as tenant_name,
          t.email as tenant_email,
          t.phone as tenant_phone,
          tr.property_id,
          p.name as property_name,
          tr.request_type,
          tr.title,
          tr.description,
          tr.priority,
          tr.status,
          tr.admin_notes,
          tr.assigned_to,
          s.name as staff_name,
          s.role as staff_role,
          tr.resolved_at,
          tr.created_at,
          tr.updated_at
        FROM tenant_requests tr
        LEFT JOIN tenants t ON tr.tenant_id = t.id
        LEFT JOIN properties p ON tr.property_id = p.id
        LEFT JOIN staff s ON tr.assigned_to = s.id
        WHERE 1=1
      `;

      const params = [];

      if (requestType) {
        sql += ` AND tr.request_type = ?`;
        params.push(requestType);
      }

      sql += ` ORDER BY tr.created_at DESC`;


      const [rows] = await db.query(sql, params);
      return rows;
    } catch (error) {
      console.error('Error in getAllRequests:', error);
      throw error;
    }
  }

  // Get only complaints (filter by request_type = 'complaint')
  static async getComplaints() {
    try {
      return await this.getAllRequests('complaint');
    } catch (error) {
      console.error('Error in getComplaints:', error);
      throw error;
    }
  }

  // Update request
  static async update(id, data) {
    try {
      const updates = [];
      const params = [];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          updates.push(`${key} = ?`);
          params.push(data[key]);
        }
      });

      if (data.status === 'resolved' && !data.resolved_at) {
        updates.push('resolved_at = NOW()');
      }

      if (updates.length === 0) {
        return;
      }

      params.push(id);

      const sql = `
        UPDATE tenant_requests
        SET ${updates.join(', ')}
        WHERE id = ?
      `;


      const [result] = await db.query(sql, params);
      return result;
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  // Get detailed request by ID
  static async getById(id) {
    try {
      const sql = `
        SELECT 
          tr.*,
          t.full_name as tenant_name,
          t.email as tenant_email,
          t.phone as tenant_phone,
          p.name as property_name,
          p.address as property_address,
          s.name as staff_name,
          s.role as staff_role
        FROM tenant_requests tr
        LEFT JOIN tenants t ON tr.tenant_id = t.id
        LEFT JOIN properties p ON tr.property_id = p.id
        LEFT JOIN staff s ON tr.assigned_to = s.id
        WHERE tr.id = ?
      `;

      const [rows] = await db.query(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error in getById:', error);
      throw error;
    }
  }
}

module.exports = TenantRequestModel;

