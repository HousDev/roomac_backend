const db = require('../config/db');

class VacateBedModel {
  async create(data) {
    const {
      tenant_id,
      bed_assignment_id,
      property_id,
      primary_reason_id,
      secondary_reasons,
      overall_rating,
      food_rating,
      cleanliness_rating,
      management_rating,
      improvement_suggestions,
      expected_vacate_date,
      emergency_contact,
      forwarding_address,
      status = 'pending'
    } = data;

    const [result] = await db.query(
      `INSERT INTO vacate_bed_requests (
        tenant_id,
        bed_assignment_id,
        property_id,
        primary_reason_id,
        secondary_reasons,
        overall_rating,
        food_rating,
        cleanliness_rating,
        management_rating,
        improvement_suggestions,
        expected_vacate_date,
        emergency_contact,
        forwarding_address,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        tenant_id,
        bed_assignment_id,
        property_id,
        primary_reason_id,
        JSON.stringify(secondary_reasons),
        overall_rating,
        food_rating,
        cleanliness_rating,
        management_rating,
        improvement_suggestions,
        expected_vacate_date,
        emergency_contact,
        forwarding_address,
        status
      ]
    );

    return result.insertId;
  }

  async findById(id) {
    const [rows] = await db.query(
      `SELECT vr.*, 
              r.name as primary_reason_name,
              t.name as tenant_name,
              p.name as property_name,
              ba.bed_number,
              ba.room_number
       FROM vacate_bed_requests vr
       LEFT JOIN master_values r ON vr.primary_reason_id = r.id
       LEFT JOIN tenants t ON vr.tenant_id = t.id
       LEFT JOIN properties p ON vr.property_id = p.id
       LEFT JOIN bed_assignments ba ON vr.bed_assignment_id = ba.id
       WHERE vr.id = ?`,
      [id]
    );
    return rows[0];
  }

  async findByTenantId(tenant_id) {
    const [rows] = await db.query(
      `SELECT vr.*, 
              r.name as primary_reason_name,
              p.name as property_name,
              ba.bed_number,
              ba.room_number
       FROM vacate_bed_requests vr
       LEFT JOIN master_values r ON vr.primary_reason_id = r.id
       LEFT JOIN properties p ON vr.property_id = p.id
       LEFT JOIN bed_assignments ba ON vr.bed_assignment_id = ba.id
       WHERE vr.tenant_id = ?
       ORDER BY vr.created_at DESC`,
      [tenant_id]
    );
    return rows;
  }

  async findByPropertyId(property_id) {
    const [rows] = await db.query(
      `SELECT vr.*, 
              r.name as primary_reason_name,
              t.name as tenant_name,
              ba.bed_number,
              ba.room_number
       FROM vacate_bed_requests vr
       LEFT JOIN master_values r ON vr.primary_reason_id = r.id
       LEFT JOIN tenants t ON vr.tenant_id = t.id
       LEFT JOIN bed_assignments ba ON vr.bed_assignment_id = ba.id
       WHERE vr.property_id = ?
       ORDER BY vr.created_at DESC`,
      [property_id]
    );
    return rows;
  }

  async updateStatus(id, status, admin_notes = null) {
    await db.query(
      `UPDATE vacate_bed_requests SET 
        status = ?,
        admin_notes = ?,
        updated_at = NOW(),
        processed_at = ${status === 'approved' || status === 'rejected' ? 'NOW()' : 'processed_at'}
       WHERE id = ?`,
      [status, admin_notes, id]
    );
  }

  async delete(id) {
    await db.query(
      `DELETE FROM vacate_bed_requests WHERE id = ?`,
      [id]
    );
  }

  async getStatistics(property_id = null) {
    let query = `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      AVG(overall_rating) as avg_overall_rating,
      AVG(food_rating) as avg_food_rating,
      AVG(cleanliness_rating) as avg_cleanliness_rating,
      AVG(management_rating) as avg_management_rating
    FROM vacate_bed_requests`;
    
    const params = [];
    if (property_id) {
      query += ` WHERE property_id = ?`;
      params.push(property_id);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0];
  }
}

module.exports = new VacateBedModel();