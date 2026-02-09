// models/vacateRequestModel.js - MINIMAL WORKING VERSION
const db = require("../config/db");

class VacateRequestModel {
  // Get all vacate requests for admin - SIMPLIFIED
  static async getAllVacateRequests(filters = {}) {
    try {
      console.log('🔍 Getting vacate requests with filters:', filters);
      
      // First, let's see what we can safely query without errors
      let sql = `
        SELECT 
          vbr.id as vacate_request_id,
          vbr.tenant_id,
          t.full_name as tenant_name,
          t.email as tenant_email,
          t.phone as tenant_phone,
          vbr.property_id,
          p.name as property_name,
          vbr.room_id,
          r.room_number,
          vbr.bed_id,
          ba.bed_number,
          vbr.primary_reason_id,
          mv.value as primary_reason,
          vbr.secondary_reasons,
          vbr.overall_rating,
          vbr.food_rating,
          vbr.cleanliness_rating,
          vbr.management_rating,
          vbr.improvement_suggestions,
          vbr.expected_vacate_date,
          vbr.lockin_penalty_accepted,
          vbr.notice_penalty_accepted,
          vbr.status as vacate_status,
          vbr.admin_notes as vacate_admin_notes,
          vbr.created_at as vacate_request_date,
          vbr.updated_at as vacate_updated_date,
          vbr.tenant_request_id,
          tr.title,
          tr.description,
          tr.priority,
          tr.status as request_status,
          tr.created_at as request_created,
          -- Basic tenant details only
          t.lockin_period_months,
          t.lockin_penalty_amount,
          t.lockin_penalty_type,
          t.notice_period_days,
          t.notice_penalty_amount,
          t.notice_penalty_type,
          t.check_in_date,
          -- Remove problematic columns:
          -- t.security_deposit,
          -- r.rent_per_bed as monthly_rent,
          -- Add safe defaults for missing columns
          NULL as refund_amount,
          NULL as penalty_deduction,
          NULL as processed_by,
          NULL as processed_at,
          NULL as actual_vacate_date,
          NULL as monthly_rent,
          NULL as security_deposit
        FROM vacate_bed_requests vbr
        INNER JOIN tenants t ON vbr.tenant_id = t.id
        INNER JOIN properties p ON vbr.property_id = p.id
        LEFT JOIN rooms r ON vbr.room_id = r.id
        LEFT JOIN bed_assignments ba ON vbr.bed_id = ba.id
        LEFT JOIN master_values mv ON vbr.primary_reason_id = mv.id
        LEFT JOIN tenant_requests tr ON vbr.tenant_request_id = tr.id
        WHERE t.deleted_at IS NULL
      `;

      const params = [];
      
      // Apply filters
      if (filters.status && filters.status !== 'all') {
        sql += ` AND vbr.status = ?`;
        params.push(filters.status);
      }
      
      if (filters.property_id && filters.property_id !== 'all') {
        sql += ` AND vbr.property_id = ?`;
        params.push(filters.property_id);
      }
      
      if (filters.search) {
        sql += ` AND (
          t.full_name LIKE ? OR 
          t.email LIKE ? OR 
          t.phone LIKE ? OR
          p.name LIKE ?
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY vbr.created_at DESC`;

      console.log('📝 SQL Query:', sql.substring(0, 300) + '...');
      console.log('🔢 Parameters:', params);

      const [rows] = await db.query(sql, params);
      
      console.log(`✅ Found ${rows.length} vacate requests`);
      
      // Parse JSON fields
      const parsedRows = rows.map(row => {
        // Parse secondary_reasons if it exists
        if (row.secondary_reasons) {
          try {
            if (typeof row.secondary_reasons === 'string') {
              row.secondary_reasons = JSON.parse(row.secondary_reasons);
            }
          } catch (error) {
            console.error('Error parsing secondary_reasons:', error);
            row.secondary_reasons = [];
          }
        } else {
          row.secondary_reasons = [];
        }
        
        return row;
      });

      return parsedRows;
    } catch (error) {
      console.error('❌ Error in getAllVacateRequests:', error);
      console.error('Full error details:', {
        message: error.message,
        sql: error.sql,
        code: error.code,
        errno: error.errno
      });
      throw error;
    }
  }

  // Get single vacate request by ID - SIMPLIFIED
  static async getVacateRequestById(id) {
    try {
      console.log(`🔍 Getting vacate request by ID: ${id}`);
      
      const sql = `
        SELECT 
          vbr.id as vacate_request_id,
          vbr.tenant_id,
          t.full_name as tenant_name,
          t.email as tenant_email,
          t.phone as tenant_phone,
          vbr.property_id,
          p.name as property_name,
          vbr.room_id,
          r.room_number,
          vbr.bed_id,
          ba.bed_number,
          vbr.primary_reason_id,
          mv.value as primary_reason,
          vbr.secondary_reasons,
          vbr.overall_rating,
          vbr.food_rating,
          vbr.cleanliness_rating,
          vbr.management_rating,
          vbr.improvement_suggestions,
          vbr.expected_vacate_date,
          vbr.lockin_penalty_accepted,
          vbr.notice_penalty_accepted,
          vbr.status as vacate_status,
          vbr.admin_notes as vacate_admin_notes,
          vbr.created_at as vacate_request_date,
          vbr.updated_at as vacate_updated_date,
          vbr.tenant_request_id,
          tr.title,
          tr.description,
          tr.priority,
          tr.status as request_status,
          tr.created_at as request_created,
          -- Basic tenant details only
          t.lockin_period_months,
          t.lockin_penalty_amount,
          t.lockin_penalty_type,
          t.notice_period_days,
          t.notice_penalty_amount,
          t.notice_penalty_type,
          t.check_in_date,
          -- Safe defaults
          NULL as refund_amount,
          NULL as penalty_deduction,
          NULL as processed_by,
          NULL as processed_at,
          NULL as actual_vacate_date,
          NULL as monthly_rent,
          NULL as security_deposit
        FROM vacate_bed_requests vbr
        INNER JOIN tenants t ON vbr.tenant_id = t.id
        INNER JOIN properties p ON vbr.property_id = p.id
        LEFT JOIN rooms r ON vbr.room_id = r.id
        LEFT JOIN bed_assignments ba ON vbr.bed_id = ba.id
        LEFT JOIN master_values mv ON vbr.primary_reason_id = mv.id
        LEFT JOIN tenant_requests tr ON vbr.tenant_request_id = tr.id
        WHERE vbr.id = ? AND t.deleted_at IS NULL
      `;

      const [rows] = await db.query(sql, [id]);
      
      if (rows.length === 0) {
        console.log(`❌ No vacate request found with ID: ${id}`);
        return null;
      }
      
      const row = rows[0];
      
      // Parse secondary_reasons
      if (row.secondary_reasons) {
        try {
          if (typeof row.secondary_reasons === 'string') {
            row.secondary_reasons = JSON.parse(row.secondary_reasons);
          }
        } catch (error) {
          console.error('Error parsing secondary_reasons:', error);
          row.secondary_reasons = [];
        }
      } else {
        row.secondary_reasons = [];
      }
      
      console.log(`✅ Found vacate request ID: ${id}`);
      return row;
    } catch (error) {
      console.error('❌ Error in getVacateRequestById:', error);
      throw error;
    }
  }

  // Update vacate request status - SIMPLIFIED
  static async updateVacateRequestStatus(id, data, adminId) {
    try {
      console.log(`🔄 Updating vacate request ${id} with data:`, data);
      
      const updates = [];
      const params = [];
      
      // Add status update
      updates.push('status = ?');
      params.push(data.status);
      
      // Add admin notes if provided
      if (data.admin_notes) {
        updates.push('admin_notes = ?');
        params.push(data.admin_notes);
      }
      
      // Add actual vacate date if provided
      if (data.actual_vacate_date) {
        updates.push('actual_vacate_date = ?');
        params.push(data.actual_vacate_date);
      }
      
      // Add id to params
      params.push(id);
      
      const sql = `
        UPDATE vacate_bed_requests
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;
      
      console.log('📝 Update SQL:', sql);
      console.log('🔢 Parameters:', params);
      
      const [result] = await db.query(sql, params);
      
      // Also update the related tenant_request if it exists
      if (data.status) {
        let requestStatus = 'pending';
        
        if (data.status === 'approved') {
          requestStatus = 'approved';
        } else if (data.status === 'rejected') {
          requestStatus = 'rejected';
        } else if (data.status === 'completed') {
          requestStatus = 'completed';
        }
        
        // Update tenant_requests table
        await db.query(
          `UPDATE tenant_requests 
           SET status = ?, updated_at = NOW()
           WHERE id = (SELECT tenant_request_id FROM vacate_bed_requests WHERE id = ?)`,
          [requestStatus, id]
        );
        
        console.log(`✅ Updated tenant_request status to: ${requestStatus}`);
      }
      
      console.log(`✅ Vacate request ${id} updated successfully`);
      return result;
    } catch (error) {
      console.error('❌ Error in updateVacateRequestStatus:', error);
      throw error;
    }
  }

  // Get vacate request statistics
  static async getVacateRequestStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM vacate_bed_requests
      `;
      
      const [rows] = await db.query(sql);
      const stats = rows[0];
      
      // Convert null to 0
      Object.keys(stats).forEach(key => {
        stats[key] = stats[key] || 0;
      });
      
      console.log('📊 Vacate request stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error in getVacateRequestStats:', error);
      throw error;
    }
  }

  // Get properties list for filter
  static async getPropertiesForFilter() {
    try {
      const sql = `
        SELECT DISTINCT 
          p.id,
          p.name
        FROM vacate_bed_requests vbr
        INNER JOIN properties p ON vbr.property_id = p.id
        WHERE p.deleted_at IS NULL
        ORDER BY p.name
      `;
      
      const [rows] = await db.query(sql);
      console.log(`✅ Found ${rows.length} properties for filter`);
      return rows;
    } catch (error) {
      console.error('❌ Error in getPropertiesForFilter:', error);
      return [];
    }
  }

  // Get database info for debugging
  static async debugDatabase() {
    try {
      console.log('🔍 Debugging database structure...');
      
      // Check tenants table columns
      const [tenantColumns] = await db.query(`SHOW COLUMNS FROM tenants`);
      console.log('📋 Tenants table columns:', tenantColumns.map(c => c.Field));
      
      // Check rooms table columns
      const [roomColumns] = await db.query(`SHOW COLUMNS FROM rooms`);
      console.log('📋 Rooms table columns:', roomColumns.map(c => c.Field));
      
      // Check vacate_bed_requests table
      const [vacateCount] = await db.query(`SELECT COUNT(*) as count FROM vacate_bed_requests`);
      console.log(`📊 vacate_bed_requests has ${vacateCount[0].count} records`);
      
      return {
        tenants: tenantColumns.map(c => c.Field),
        rooms: roomColumns.map(c => c.Field),
        vacateCount: vacateCount[0].count
      };
    } catch (error) {
      console.error('❌ Debug error:', error);
      return null;
    }
  }
}

module.exports = VacateRequestModel;