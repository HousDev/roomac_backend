// // models/tenantRequestModel.js
// const db = require('../config/db');

// class TenantRequest {
//   // Create a new tenant request
//   static async create(data) {
//     const {
//       tenant_id,
//       request_type = 'general',
//       title,
//       description,
//       priority = 'medium',
//       status = 'pending',
//       admin_notes = null,
//       assigned_to = null,
//       property_id = null
//     } = data;

//     try {
//       // If it's a leave request, also create a leave_request entry
//       if (request_type === 'leave') {
//         // Extract leave details from description or parse as JSON
//         let leaveDetails = {};
//         try {
//           // Try to parse description as JSON for leave details
//           leaveDetails = JSON.parse(description);
//         } catch {
//           // If not JSON, use description as reason
//           leaveDetails = { reason: description };
//         }

//         // Create leave request
//         const [leaveResult] = await db.execute(
//           `INSERT INTO leave_requests 
//            (tenant_id, property_id, requested_leave_date, reason, status) 
//            VALUES (?, ?, ?, ?, ?)`,
//           [
//             tenant_id,
//             property_id,
//             leaveDetails.requested_leave_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days from now
//             leaveDetails.reason || description,
//             'pending'
//           ]
//         );

//         // Update description to include leave request ID
//         const updatedDescription = `${description}\n\nLeave Request ID: LR-${leaveResult.insertId}`;
        
//         const [result] = await db.execute(
//           `INSERT INTO tenant_requests 
//            (tenant_id, property_id, request_type, title, description, priority, status, admin_notes, assigned_to) 
//            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [tenant_id, property_id, request_type, title, updatedDescription, priority, status, admin_notes, assigned_to]
//         );
        
//         return {
//           ...await this.findById(result.insertId),
//           leave_request_id: leaveResult.insertId
//         };
//       } else {
//         // For non-leave requests
//         const [result] = await db.execute(
//           `INSERT INTO tenant_requests 
//            (tenant_id, property_id, request_type, title, description, priority, status, admin_notes, assigned_to) 
//            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [tenant_id, property_id, request_type, title, description, priority, status, admin_notes, assigned_to]
//         );
        
//         return this.findById(result.insertId);
//       }
//     } catch (error) {
//       console.error('Error creating tenant request:', error);
//       throw error;
//     }
//   }

//   // Find request by ID
//   static async findById(id) {
//     const [rows] = await db.execute(
//       `SELECT tr.*, 
//               t.full_name as tenant_name, 
//               t.email as tenant_email,
//               t.phone as tenant_phone,
//               p.name as property_name,
//               s.name as assigned_to_name
//        FROM tenant_requests tr
//        LEFT JOIN tenants t ON tr.tenant_id = t.id
//        LEFT JOIN properties p ON tr.property_id = p.id
//        LEFT JOIN staff s ON tr.assigned_to = s.id
//        WHERE tr.id = ?`,
//       [id]
//     );
//     return rows[0] || null;
//   }

//   // Get requests by tenant ID
//   static async findByTenantId(tenantId) {
//     const [rows] = await db.execute(
//       `SELECT tr.*, 
//               t.full_name as tenant_name,
//               p.name as property_name
//        FROM tenant_requests tr
//        LEFT JOIN tenants t ON tr.tenant_id = t.id
//        LEFT JOIN properties p ON tr.property_id = p.id
//        WHERE tr.tenant_id = ?
//        ORDER BY tr.created_at DESC`,
//       [tenantId]
//     );
//     return rows;
//   }

//   // Get all requests (admin)
//   static async findAll(filters = {}) {
//     let query = `
//       SELECT tr.*, 
//              t.full_name as tenant_name, 
//              t.email as tenant_email,
//              t.phone as tenant_phone,
//              p.name as property_name,
//              s.name as assigned_to_name
//       FROM tenant_requests tr
//       LEFT JOIN tenants t ON tr.tenant_id = t.id
//       LEFT JOIN properties p ON tr.property_id = p.id
//       LEFT JOIN staff s ON tr.assigned_to = s.id
//       WHERE 1=1
//     `;
    
//     const params = [];
    
//     if (filters.status) {
//       query += ' AND tr.status = ?';
//       params.push(filters.status);
//     }
    
//     if (filters.request_type) {
//       query += ' AND tr.request_type = ?';
//       params.push(filters.request_type);
//     }
    
//     if (filters.priority) {
//       query += ' AND tr.priority = ?';
//       params.push(filters.priority);
//     }
    
//     if (filters.search) {
//       query += ' AND (tr.title LIKE ? OR tr.description LIKE ? OR t.full_name LIKE ?)';
//       const searchTerm = `%${filters.search}%`;
//       params.push(searchTerm, searchTerm, searchTerm);
//     }
    
//     query += ' ORDER BY tr.created_at DESC';
    
//     const [rows] = await db.execute(query, params);
//     return rows;
//   }

//   // Get requests by type (for admin dashboard pages)
//   static async findByType(requestType) {
//     const [rows] = await db.execute(
//       `SELECT tr.*, 
//               t.full_name as tenant_name, 
//               t.email as tenant_email,
//               t.phone as tenant_phone,
//               p.name as property_name
//        FROM tenant_requests tr
//        LEFT JOIN tenants t ON tr.tenant_id = t.id
//        LEFT JOIN properties p ON tr.property_id = p.id
//        WHERE tr.request_type = ?
//        ORDER BY tr.created_at DESC`,
//       [requestType]
//     );
//     return rows;
//   }

//   // Update request
//   static async update(id, data) {
//     const fields = [];
//     const values = [];
    
//     Object.keys(data).forEach(key => {
//       if (data[key] !== undefined) {
//         fields.push(`${key} = ?`);
//         values.push(data[key]);
//       }
//     });
    
//     if (fields.length === 0) {
//       return this.findById(id);
//     }
    
//     values.push(id);
    
//     await db.execute(
//       `UPDATE tenant_requests SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
//       values
//     );
    
//     return this.findById(id);
//   }

//   // Update status
//   static async updateStatus(id, status, adminNotes = null) {
//     const updateData = { status };
    
//     if (adminNotes) {
//       updateData.admin_notes = adminNotes;
//     }
    
//     if (status === 'resolved' || status === 'closed') {
//       updateData.resolved_at = new Date();
//     }
    
//     return this.update(id, updateData);
//   }

//   // Assign to staff
//   static async assignToStaff(id, staffId) {
//     return this.update(id, { assigned_to: staffId });
//   }

//   // Delete request
//   static async delete(id) {
//     const [result] = await db.execute('DELETE FROM tenant_requests WHERE id = ?', [id]);
//     return result.affectedRows > 0;
//   }

//   // Get statistics
//   static async getStats() {
//     const [rows] = await db.execute(`
//       SELECT 
//         COUNT(*) as total,
//         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
//         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
//         SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
//         SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
//         SUM(CASE WHEN request_type = 'complaint' THEN 1 ELSE 0 END) as complaints,
//         SUM(CASE WHEN request_type = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
//         SUM(CASE WHEN request_type = 'receipt' THEN 1 ELSE 0 END) as receipts,
//         SUM(CASE WHEN request_type = 'leave' THEN 1 ELSE 0 END) as leave_requests
//       FROM tenant_requests
//     `);
//     return rows[0];
//   }
//   // Add this method to TenantRequest class in models/TenantRequest.js
// static async assignToStaff(requestId, staffId) {
//   // First, check if request exists and get current assigned staff
//   const request = await this.findById(requestId);
//   if (!request) {
//     throw new Error('Request not found');
//   }
  
//   // If already assigned to someone else, decrement their count
//   if (request.assigned_to && request.assigned_to !== staffId) {
//     await Staff.updateAssignedCount(request.assigned_to, false);
//   }
  
//   // Update the request
//   const [result] = await db.execute(
//     'UPDATE tenant_requests SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
//     [staffId, requestId]
//   );
  
//   // Increment new staff's assigned count
//   if (result.affectedRows > 0) {
//     await Staff.updateAssignedCount(staffId, true);
//   }
  
//   return this.findById(requestId);
// }
// }

// module.exports = TenantRequest;








// const db = require("../config/db");

// class TenantRequestModel {
//   static async create(data) {
//     const sql = `
//       INSERT INTO tenant_requests
//       (tenant_id, property_id, request_type, title, description, priority, status)
//       VALUES (?, ?, ?, ?, ?, ?, 'pending')
//     `;

//     const [result] = await db.query(sql, [
//       data.tenant_id,
//       data.property_id,
//       data.request_type,
//       data.title,
//       data.description,
//       data.priority || "medium",
//     ]);

//     return result.insertId;
//   }

//   static async getByTenantId(tenantId) {
//     const [rows] = await db.query(
//       `
//       SELECT
//         id,
//         request_type,
//         title,
//         description,
//         priority,
//         status,
//         admin_notes,
//         created_at,
//         updated_at,
//         resolved_at
//       FROM tenant_requests
//       WHERE tenant_id = ?
//       ORDER BY created_at DESC
//       `,
//       [tenantId]
//     );

//     return rows;
//   }
// }

// module.exports = TenantRequestModel;




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

      console.log('Executing SQL for getAllRequests:', sql);
      console.log('Parameters:', params);

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

      console.log('Updating complaint SQL:', sql);
      console.log('Update parameters:', params);

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

