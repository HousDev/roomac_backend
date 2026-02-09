const db = require('../config/db');

class ChangeBedModel {
  async create(data) {
    const {
      tenant_id,
      current_bed_assignment_id,
      requested_bed_id,
      reason,
      preferred_move_date,
      emergency_contact,
      status = 'pending'
    } = data;

    const [result] = await db.query(
      `INSERT INTO change_bed_requests (
        tenant_id,
        current_bed_assignment_id,
        requested_bed_id,
        reason,
        preferred_move_date,
        emergency_contact,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        tenant_id,
        current_bed_assignment_id,
        requested_bed_id,
        reason,
        preferred_move_date,
        emergency_contact,
        status
      ]
    );

    return result.insertId;
  }

  async findById(id) {
    const [rows] = await db.query(
      `SELECT cb.*, 
              t.name as tenant_name,
              p.name as property_name,
              cb1.bed_number as current_bed_number,
              cb1.room_number as current_room_number,
              b.bed_number as requested_bed_number,
              b.room_id,
              r.room_number as requested_room_number
       FROM change_bed_requests cb
       LEFT JOIN tenants t ON cb.tenant_id = t.id
       LEFT JOIN bed_assignments cb1 ON cb.current_bed_assignment_id = cb1.id
       LEFT JOIN beds b ON cb.requested_bed_id = b.id
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN properties p ON r.property_id = p.id
       WHERE cb.id = ?`,
      [id]
    );
    return rows[0];
  }

  async findByTenantId(tenant_id) {
    const [rows] = await db.query(
      `SELECT cb.*, 
              p.name as property_name,
              cb1.bed_number as current_bed_number,
              cb1.room_number as current_room_number,
              b.bed_number as requested_bed_number,
              r.room_number as requested_room_number
       FROM change_bed_requests cb
       LEFT JOIN bed_assignments cb1 ON cb.current_bed_assignment_id = cb1.id
       LEFT JOIN beds b ON cb.requested_bed_id = b.id
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN properties p ON r.property_id = p.id
       WHERE cb.tenant_id = ?
       ORDER BY cb.created_at DESC`,
      [tenant_id]
    );
    return rows;
  }

  async findByPropertyId(property_id) {
    const [rows] = await db.query(
      `SELECT cb.*, 
              t.name as tenant_name,
              cb1.bed_number as current_bed_number,
              cb1.room_number as current_room_number,
              b.bed_number as requested_bed_number,
              r.room_number as requested_room_number
       FROM change_bed_requests cb
       LEFT JOIN tenants t ON cb.tenant_id = t.id
       LEFT JOIN bed_assignments cb1 ON cb.current_bed_assignment_id = cb1.id
       LEFT JOIN beds b ON cb.requested_bed_id = b.id
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE r.property_id = ?
       ORDER BY cb.created_at DESC`,
      [property_id]
    );
    return rows;
  }

  async updateStatus(id, status, admin_notes = null, new_bed_assignment_id = null) {
    const updates = [
      `status = ?`,
      `admin_notes = ?`,
      `updated_at = NOW()`
    ];
    const params = [status, admin_notes];

    if (status === 'approved' && new_bed_assignment_id) {
      updates.push(`new_bed_assignment_id = ?`);
      updates.push(`processed_at = NOW()`);
      params.push(new_bed_assignment_id);
    }

    if (status === 'rejected') {
      updates.push(`processed_at = NOW()`);
    }

    await db.query(
      `UPDATE change_bed_requests SET ${updates.join(', ')} WHERE id = ?`,
      [...params, id]
    );
  }

  async delete(id) {
    await db.query(
      `DELETE FROM change_bed_requests WHERE id = ?`,
      [id]
    );
  }

  async getAvailableBeds(property_id, sharing_type, exclude_bed_id = null) {
    let query = `
      SELECT b.*, r.room_number, r.sharing_type, p.name as property_name
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      JOIN properties p ON r.property_id = p.id
      WHERE r.property_id = ? 
        AND r.sharing_type = ? 
        AND b.is_available = 1
        AND b.is_active = 1
    `;
    
    const params = [property_id, sharing_type];
    
    if (exclude_bed_id) {
      query += ` AND b.id != ?`;
      params.push(exclude_bed_id);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  async getStatistics(property_id = null) {
    let query = `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM change_bed_requests`;
    
    const params = [];
    if (property_id) {
      query += ` WHERE EXISTS (
        SELECT 1 FROM beds b 
        JOIN rooms r ON b.room_id = r.id 
        WHERE r.property_id = ? AND b.id = requested_bed_id
      )`;
      params.push(property_id);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0];
  }
}

module.exports = new ChangeBedModel();