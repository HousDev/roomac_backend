const db = require("../config/db");
const notificationController = require("./tenantNotificationController");

exports.getMaintenanceRequests = async (req, res) => {
  try {
    console.log('🔧 Fetching maintenance requests...');
    
    const sql = `
      SELECT 
        tr.id,
        tr.tenant_id,
        t.full_name as tenant_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        
        -- Get property name from bed_assignments
        COALESCE(
          (
            SELECT p.name 
            FROM bed_assignments ba
            INNER JOIN rooms r ON ba.room_id = r.id
            INNER JOIN properties p ON r.property_id = p.id
            WHERE ba.tenant_id = tr.tenant_id 
              AND ba.is_available = 0
            ORDER BY ba.created_at DESC
            LIMIT 1
          ),
          p.name,
          'Not specified'
        ) as property_name,
        
        -- Get room number
        (
          SELECT r.room_number 
          FROM bed_assignments ba
          INNER JOIN rooms r ON ba.room_id = r.id
          WHERE ba.tenant_id = tr.tenant_id 
            AND ba.is_available = 0
          ORDER BY ba.created_at DESC
            LIMIT 1
        ) as room_number,
        
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
        tr.updated_at,
        
        -- Get maintenance details from maintenance_request_details table
        mrd.issue_category,
        mrd.location,
        mrd.preferred_visit_time,
        mrd.access_permission,
        mrd.resolved_at as maintenance_resolved_at
      FROM tenant_requests tr
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      LEFT JOIN properties p ON tr.property_id = p.id
      LEFT JOIN staff s ON tr.assigned_to = s.id
      LEFT JOIN maintenance_request_details mrd ON tr.id = mrd.request_id
      WHERE tr.request_type = 'maintenance'
      ORDER BY 
        CASE tr.priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        tr.created_at DESC
    `;
    
    console.log('📋 Executing SQL...');
    
    const [requests] = await db.query(sql);
    console.log(`✅ Found ${requests.length} maintenance requests`);
    
    // Format the data properly
    const parsedRequests = requests.map(request => {
      // Create maintenance_data object if details exist
      const maintenanceData = request.issue_category ? {
        issue_category: request.issue_category || null,
        location: request.location || null,
        preferred_visit_time: request.preferred_visit_time || null,
        access_permission: request.access_permission === 1 || request.access_permission === true,
        resolved_at: request.maintenance_resolved_at || null
      } : undefined;
      
      return {
        id: request.id,
        tenant_id: request.tenant_id,
        tenant_name: request.tenant_name,
        tenant_email: request.tenant_email,
        tenant_phone: request.tenant_phone,
        property_name: request.property_name,
        room_number: request.room_number,
        request_type: request.request_type,
        title: request.title,
        description: request.description,
        priority: request.priority,
        status: request.status,
        admin_notes: request.admin_notes,
        assigned_to: request.assigned_to,
        staff_name: request.staff_name,
        staff_role: request.staff_role,
        resolved_at: request.resolved_at,
        created_at: request.created_at,
        updated_at: request.updated_at,
        maintenance_data: maintenanceData
      };
    });
    
    res.json({
      success: true,
      data: parsedRequests
    });
  } catch (err) {
    console.error('❌ Error fetching maintenance requests:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch maintenance requests",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

exports.bulkDeleteMaintenanceRequests = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of maintenance request IDs to delete"
      });
    }
    
    console.log(`🗑️ Bulk deleting maintenance requests:`, ids);
    
    // Start a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // First, delete maintenance request details
      await connection.query(
        `DELETE FROM maintenance_request_details WHERE request_id IN (?)`,
        [ids]
      );
      
      // Then delete the tenant requests
      const [result] = await connection.query(
        `DELETE FROM tenant_requests WHERE id IN (?) AND request_type = 'maintenance'`,
        [ids]
      );
      
      await connection.commit();
      
      res.json({
        success: true,
        message: `Successfully deleted ${result.affectedRows} maintenance requests`,
        data: {
          deletedCount: result.affectedRows,
          deletedIds: ids
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('❌ Error bulk deleting maintenance requests:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete maintenance requests",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.updateMaintenanceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🔧 Updating maintenance request:', id, updateData);

    // Get current maintenance request data to check if status changed
    const [currentRequest] = await db.query(
      `SELECT tenant_id, status FROM tenant_requests WHERE id = ? AND request_type = 'maintenance'`,
      [id]
    );

    if (currentRequest.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Maintenance request not found"
      });
    }

    const tenantId = currentRequest[0].tenant_id;
    const oldStatus = currentRequest[0].status;
    const newStatus = updateData.status;

    // Build update query for tenant_requests
    const updates = [];
    const params = [];

    // Handle status update
    if (updateData.status) {
      updates.push('status = ?');
      params.push(updateData.status);
    }

    // Handle admin notes - append to existing notes or create new
    if (updateData.admin_notes) {
      // Get current admin_notes first
      const [current] = await db.query(
        `SELECT admin_notes FROM tenant_requests WHERE id = ?`,
        [id]
      );
      
      const currentNotes = current[0]?.admin_notes || '';
      const timestamp = new Date().toLocaleString();
      const newNoteEntry = `\n[${timestamp}] Status changed to ${updateData.status || 'updated'}: ${updateData.admin_notes}`;
      
      const updatedNotes = currentNotes 
        ? currentNotes + newNoteEntry
        : newNoteEntry;
      
      updates.push('admin_notes = ?');
      params.push(updatedNotes);
    }

    // Handle assigned_to update
    if (updateData.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(updateData.assigned_to === null ? null : updateData.assigned_to);
    }

    // Auto-set resolved_at if status is resolved
    if (updateData.status === 'resolved' && !updateData.resolved_at) {
      updates.push('resolved_at = NOW()');
    }

    // Auto-set updated_at
    updates.push('updated_at = NOW()');

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided for update"
      });
    }

    params.push(id);

    const sql = `
      UPDATE tenant_requests 
      SET ${updates.join(', ')} 
      WHERE id = ? AND request_type = 'maintenance'
    `;

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Maintenance request not found"
      });
    }

    // If there's maintenance_data in the update, update maintenance_request_details table
    if (updateData.maintenance_data) {
      const { issue_category, location, preferred_visit_time, access_permission } = updateData.maintenance_data;
      
      // Check if record exists in maintenance_request_details
      const [existing] = await db.query(
        'SELECT id FROM maintenance_request_details WHERE request_id = ?',
        [id]
      );
      
      if (existing.length > 0) {
        // Update existing record
        await db.query(`
          UPDATE maintenance_request_details 
          SET issue_category = ?, location = ?, preferred_visit_time = ?, access_permission = ?
          WHERE request_id = ?
        `, [issue_category, location, preferred_visit_time, access_permission, id]);
      } else {
        // Insert new record
        await db.query(`
          INSERT INTO maintenance_request_details 
          (request_id, issue_category, location, preferred_visit_time, access_permission)
          VALUES (?, ?, ?, ?, ?)
        `, [id, issue_category, location, preferred_visit_time, access_permission]);
      }
    }

    // Send notification to tenant if status changed
    if (newStatus && newStatus !== oldStatus) {
      try {
        // Include admin notes in notification if provided
        await notificationController.notifyMaintenanceStatusUpdate(
          id,
          tenantId,
          newStatus,
          updateData.admin_notes
        );
        console.log(`📨 Notification sent to tenant ${tenantId} for maintenance request ${id}`);
      } catch (notifError) {
        console.error('❌ Failed to send notification:', notifError);
        // Don't fail the main operation if notification fails
      }
    }

    // If staff assigned, send assignment notification
    if (updateData.assigned_to !== undefined && updateData.assigned_to) {
      try {
        // Get staff name
        const [staffResult] = await db.query(
          'SELECT name FROM staff WHERE id = ?',
          [updateData.assigned_to]
        );
        
        const staffName = staffResult[0]?.name || 'Staff';
        
        await notificationController.createNotification({
          tenantId,
          title: 'Maintenance Request Assigned',
          message: `Your maintenance request #${id} has been assigned to ${staffName}.`,
          notificationType: 'maintenance',
          relatedEntityType: 'maintenance',
          relatedEntityId: id,
          priority: 'medium'
        });
      } catch (notifError) {
        console.error('❌ Failed to send assignment notification:', notifError);
      }
    }

    res.json({ 
      success: true, 
      message: "Maintenance request updated successfully"
    });
  } catch (err) {
    console.error('❌ Error updating maintenance request:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to update maintenance request"
    });
  }
};