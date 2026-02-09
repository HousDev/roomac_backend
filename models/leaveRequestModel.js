const db = require('../config/db');

class LeaveRequestModel {
  // Get all leave requests with filters
  static async findAll(filters = {}) {
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
          s.name as assigned_to_name,
          tr.resolved_at,
          tr.created_at,
          tr.updated_at,
          
          -- Leave data
          lrd.id as leave_request_detail_id,
          lrd.leave_type,
          lrd.leave_start_date,
          lrd.leave_end_date,
          lrd.total_days,
          lrd.contact_address_during_leave,
          lrd.emergency_contact_number,
          lrd.room_locked,
          lrd.keys_submitted,
          lrd.created_at as leave_detail_created_at,
          
          -- Room and bed info
          ba.room_id,
          r.room_number,
          ba.bed_number
          
         FROM tenant_requests tr
         
         -- Join tenants
         JOIN tenants t ON tr.tenant_id = t.id
         
         -- Join properties
         LEFT JOIN properties p ON tr.property_id = p.id
         
         -- Join leave request details
         LEFT JOIN leave_request_details lrd ON tr.id = lrd.request_id
         
         -- Join staff for assignment
         LEFT JOIN staff s ON tr.assigned_to = s.id
         
         -- Join bed assignments for room info
         LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
         LEFT JOIN rooms r ON ba.room_id = r.id
         
         WHERE tr.request_type = 'leave'
      `;

      const params = [];
      
      // Apply filters
      if (filters.status && filters.status !== 'all') {
        sql += ` AND tr.status = ?`;
        params.push(filters.status);
      }
      
      if (filters.priority && filters.priority !== 'all') {
        sql += ` AND tr.priority = ?`;
        params.push(filters.priority);
      }
      
      if (filters.property_id) {
        sql += ` AND tr.property_id = ?`;
        params.push(filters.property_id);
      }
      
      if (filters.search) {
        sql += ` AND (
          t.full_name LIKE ? OR 
          t.email LIKE ? OR 
          t.phone LIKE ? OR 
          p.name LIKE ? OR
          tr.title LIKE ?
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY tr.created_at DESC`;
      
      if (filters.limit) {
        sql += ` LIMIT ?`;
        params.push(filters.limit);
      }
      
      if (filters.offset) {
        sql += ` OFFSET ?`;
        params.push(filters.offset);
      }

      const [rows] = await db.query(sql, params);
      return rows;
    } catch (error) {
      console.error('Error in LeaveRequestModel.findAll:', error);
      throw error;
    }
  }

  // Get leave request by ID
  static async findById(id) {
    try {
      const [rows] = await db.query(
        `SELECT 
          tr.*,
          t.full_name as tenant_name,
          t.email as tenant_email,
          t.phone as tenant_phone,
          p.name as property_name,
          s.name as assigned_to_name,
          lrd.*,
          ba.room_id,
          r.room_number,
          ba.bed_number
         FROM tenant_requests tr
         JOIN tenants t ON tr.tenant_id = t.id
         LEFT JOIN properties p ON tr.property_id = p.id
         LEFT JOIN staff s ON tr.assigned_to = s.id
         LEFT JOIN leave_request_details lrd ON tr.id = lrd.request_id
         LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
         LEFT JOIN rooms r ON ba.room_id = r.id
         WHERE tr.id = ? AND tr.request_type = 'leave'`,
        [id]
      );
      
      return rows[0] || null;
    } catch (error) {
      console.error('Error in LeaveRequestModel.findById:', error);
      throw error;
    }
  }

  // Update leave request status
  static async updateStatus(id, data) {
    try {
      const updates = [];
      const params = [];

      if (data.status) {
        updates.push('status = ?');
        params.push(data.status);
      }
      
      if (data.admin_notes !== undefined) {
        updates.push('admin_notes = ?');
        params.push(data.admin_notes);
      }
      
      if (data.assigned_to !== undefined) {
        updates.push('assigned_to = ?');
        params.push(data.assigned_to);
      }
      
      if (data.status === 'completed' || data.status === 'rejected') {
        updates.push('resolved_at = NOW()');
      }
      
      updates.push('updated_at = NOW()');
      
      params.push(id);

      const sql = `
        UPDATE tenant_requests 
        SET ${updates.join(', ')}
        WHERE id = ?
      `;

      const [result] = await db.query(sql, params);
      return result;
    } catch (error) {
      console.error('Error in LeaveRequestModel.updateStatus:', error);
      throw error;
    }
  }

  // Get statistics
  static async getStatistics() {
    try {
      const [stats] = await db.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low
         FROM tenant_requests 
         WHERE request_type = 'leave'`
      );
      
      return stats[0];
    } catch (error) {
      console.error('Error in LeaveRequestModel.getStatistics:', error);
      throw error;
    }
  }

  // Get count with filters
  static async count(filters = {}) {
    try {
      let sql = `
        SELECT COUNT(*) as total
        FROM tenant_requests tr
        JOIN tenants t ON tr.tenant_id = t.id
        LEFT JOIN properties p ON tr.property_id = p.id
        WHERE tr.request_type = 'leave'
      `;

      const params = [];
      
      // Apply filters
      if (filters.status && filters.status !== 'all') {
        sql += ` AND tr.status = ?`;
        params.push(filters.status);
      }
      
      if (filters.priority && filters.priority !== 'all') {
        sql += ` AND tr.priority = ?`;
        params.push(filters.priority);
      }
      
      if (filters.search) {
        sql += ` AND (
          t.full_name LIKE ? OR 
          t.email LIKE ? OR 
          t.phone LIKE ? OR 
          p.name LIKE ? OR
          tr.title LIKE ?
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const [rows] = await db.query(sql, params);
      return rows[0].total;
    } catch (error) {
      console.error('Error in LeaveRequestModel.count:', error);
      throw error;
    }
  }
}

module.exports = LeaveRequestModel;