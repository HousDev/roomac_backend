const db = require('../config/db');

class ChangeBedRequestModel {
  
  // Create change bed request
  static async create(tenantRequestId, data, currentRoomInfo) {
    try {
      console.log('📝 Creating change bed request:', {
        tenantRequestId,
        data,
        currentRoomInfo
      });
      
      const {
        preferred_property_id,
        preferred_room_id,
        change_reason_id,
        shifting_date,
        notes
      } = data;
      
      // Validate room availability
      const [roomCheck] = await db.query(
        `SELECT id, total_bed, occupied_beds 
         FROM rooms 
         WHERE id = ? AND is_active = 1`,
        [preferred_room_id]
      );
      
      if (roomCheck.length === 0) {
        throw new Error('Selected room not found or inactive');
      }
      
      const room = roomCheck[0];
      if (room.occupied_beds >= room.total_bed) {
        throw new Error('Selected room is fully occupied');
      }
      
      // Check if trying to move to same room
      if (currentRoomInfo.room_id === preferred_room_id) {
        throw new Error('Cannot request to move to current room');
      }
      
      // Create change bed request
      const [result] = await db.query(
        `INSERT INTO change_bed_requests SET ?`,
        [{
          tenant_request_id: tenantRequestId,
          current_property_id: currentRoomInfo.property_id,
          current_room_id: currentRoomInfo.room_id,
          current_bed_number: currentRoomInfo.bed_number,
          preferred_property_id,
          preferred_room_id,
          change_reason_id,
          shifting_date,
          notes,
          request_status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        }]
      );
      
      return result.insertId;
      
    } catch (error) {
      console.error('❌ Error creating change bed request:', error);
      throw error;
    }
  }
  
  // Get change bed request by tenant request ID
  static async getByTenantRequestId(tenantRequestId) {
    try {
      const [rows] = await db.query(
        `SELECT 
          cbr.*,
          r2.room_number as preferred_room_number,
          p2.name as preferred_property_name,
          mv.value as change_reason
         FROM change_bed_requests cbr
         LEFT JOIN rooms r2 ON cbr.preferred_room_id = r2.id
         LEFT JOIN properties p2 ON cbr.preferred_property_id = p2.id
         LEFT JOIN master_values mv ON cbr.change_reason_id = mv.id
         WHERE cbr.tenant_request_id = ?`,
        [tenantRequestId]
      );
      
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting change bed request:', error);
      throw error;
    }
  }
  
  // Update change bed request status
  static async updateStatus(changeBedRequestId, data) {
    try {
      const { 
        request_status, 
        assigned_bed_number, 
        rent_difference, 
        admin_notes 
      } = data;
      
      const [result] = await db.query(
        `UPDATE change_bed_requests 
         SET request_status = ?,
             assigned_bed_number = ?,
             rent_difference = ?,
             admin_notes = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [request_status, assigned_bed_number, rent_difference, admin_notes, changeBedRequestId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Error updating change bed request status:', error);
      throw error;
    }
  }
  
  // Execute bed change (when approved)
static async executeBedChange(changeBedRequestId) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log(`🔄 Starting bed change execution for request ID: ${changeBedRequestId}`);
    
    // 1. Get the change bed request with all details
    const [requestRows] = await connection.query(
      `SELECT cbr.*, tr.tenant_id
       FROM change_bed_requests cbr
       INNER JOIN tenant_requests tr ON cbr.tenant_request_id = tr.id
       WHERE cbr.id = ? FOR UPDATE`,
      [changeBedRequestId]
    );
    
    if (requestRows.length === 0) {
      throw new Error('Change bed request not found');
    }
    
    const request = requestRows[0];
    const tenantId = request.tenant_id;
    
    console.log('📋 Request details:', {
      requestId: changeBedRequestId,
      tenantId,
      currentRoomId: request.current_room_id,
      currentBedNumber: request.current_bed_number,
      newRoomId: request.preferred_room_id,
      assignedBedNumber: request.assigned_bed_number
    });
    
    // 2. Get current bed assignment ID
    const [currentBedRows] = await connection.query(
      `SELECT id FROM bed_assignments 
       WHERE room_id = ? AND bed_number = ? AND tenant_id = ? AND is_available = 0`,
      [request.current_room_id, request.current_bed_number, tenantId]
    );
    
    console.log('🛏️ Current bed assignment:', currentBedRows);
    
    if (currentBedRows.length === 0) {
      throw new Error('Current bed assignment not found for tenant');
    }
    
    const currentBedId = currentBedRows[0].id;
    
    // 3. Check if requested bed is available
    const assignedBedNumber = request.assigned_bed_number || 1;
    
    const [newBedCheck] = await connection.query(
      `SELECT id FROM bed_assignments 
       WHERE room_id = ? AND bed_number = ? AND is_available = 1
       LIMIT 1`,
      [request.preferred_room_id, assignedBedNumber]
    );
    
    let newBedId;
    
    if (newBedCheck.length > 0) {
      // Use existing available bed
      newBedId = newBedCheck[0].id;
      
      console.log(`✅ Found existing bed assignment ID: ${newBedId}`);
      
      await connection.query(
        `UPDATE bed_assignments 
         SET tenant_id = ?, is_available = 0, updated_at = NOW()
         WHERE id = ?`,
        [tenantId, newBedId]
      );
    } else {
      // Create new bed assignment
      console.log(`📝 Creating new bed assignment for room ${request.preferred_room_id}, bed ${assignedBedNumber}`);
      
      // Get tenant gender for the bed assignment
      const [tenantRows] = await connection.query(
        `SELECT gender FROM tenants WHERE id = ?`,
        [tenantId]
      );
      
      const tenantGender = tenantRows[0]?.gender || 'Other';
      
      const [newBedResult] = await connection.query(
        `INSERT INTO bed_assignments SET ?`,
        [{
          room_id: request.preferred_room_id,
          bed_number: assignedBedNumber,
          tenant_id: tenantId,
          tenant_gender: tenantGender,
          is_available: 0,
          created_at: new Date(),
          updated_at: new Date()
        }]
      );
      
      newBedId = newBedResult.insertId;
      console.log(`✅ Created new bed assignment ID: ${newBedId}`);
    }
    
    // 4. Free the current bed
    console.log(`🔄 Freeing current bed assignment ID: ${currentBedId}`);
    
    await connection.query(
      `UPDATE bed_assignments 
       SET tenant_id = NULL, is_available = 1, updated_at = NOW()
       WHERE id = ?`,
      [currentBedId]
    );
    
    // 5. Update tenant's room and bed assignment
    console.log(`👤 Updating tenant ${tenantId} to room ${request.preferred_room_id}, bed ID ${newBedId}`);
    
    await connection.query(
      `UPDATE tenants 
       SET room_id = ?, bed_id = ?, property_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        request.preferred_room_id,
        newBedId,
        request.preferred_property_id,
        tenantId
      ]
    );
    
    // 6. Update room occupancy counts
    console.log(`📊 Updating room occupancy...`);
    
    await connection.query(
      `UPDATE rooms 
       SET occupied_beds = GREATEST(0, occupied_beds - 1),
           updated_at = NOW()
       WHERE id = ?`,
      [request.current_room_id]
    );
    
    await connection.query(
      `UPDATE rooms 
       SET occupied_beds = LEAST(total_bed, occupied_beds + 1),
           updated_at = NOW()
       WHERE id = ?`,
      [request.preferred_room_id]
    );
    
    // 7. Log to bed_change_log
    console.log(`📝 Logging bed change to bed_change_log`);
    
    await connection.query(
      `INSERT INTO bed_change_log SET ?`,
      [{
        tenant_id: tenantId,
        old_room_id: request.current_room_id,
        old_bed_number: request.current_bed_number,
        new_room_id: request.preferred_room_id,
        new_bed_number: assignedBedNumber,
        change_reason_id: request.change_reason_id,
        shifting_date: request.shifting_date,
        notes: request.notes,
        rent_difference: request.rent_difference,
        created_at: new Date()
      }]
    );
    
    // 8. Update change bed request status to processed
    console.log(`✅ Updating request status to 'processed'`);
    
    await connection.query(
      `UPDATE change_bed_requests 
       SET request_status = 'processed', updated_at = NOW()
       WHERE id = ?`,
      [changeBedRequestId]
    );
    
    // 9. Update tenant request status to completed
    console.log(`✅ Updating tenant request to 'completed'`);
    
    await connection.query(
      `UPDATE tenant_requests 
       SET status = 'completed', updated_at = NOW()
       WHERE id = ?`,
      [request.tenant_request_id]
    );
    
    await connection.commit();
    connection.release();
    
    console.log(`🎉 Bed change successfully executed for request ${changeBedRequestId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error executing bed change:', error);
    await connection.rollback();
    connection.release();
    throw error;
  }
}
}

module.exports = ChangeBedRequestModel;