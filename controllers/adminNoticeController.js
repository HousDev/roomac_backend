const db = require("../config/db");

// Get all admin notice requests
exports.getNoticeRequests = async (req, res) => {
  try {
    console.log('📋 Fetching admin notice requests...');
    
    const sql = `
      SELECT 
        anr.id,
        anr.tenant_id,
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
            WHERE ba.tenant_id = anr.tenant_id 
              AND ba.is_available = 0
            ORDER BY ba.created_at DESC
            LIMIT 1
          ),
          p.name,
          'Not specified'
        ) as property_name,
        
        -- Get room and bed details
        (
          SELECT r.room_number 
          FROM bed_assignments ba
          INNER JOIN rooms r ON ba.room_id = r.id
          WHERE ba.tenant_id = anr.tenant_id 
            AND ba.is_available = 0
          ORDER BY ba.created_at DESC
          LIMIT 1
        ) as room_number,
        
        (
          SELECT ba.bed_number 
          FROM bed_assignments ba
          WHERE ba.tenant_id = anr.tenant_id 
            AND ba.is_available = 0
          ORDER BY ba.created_at DESC
          LIMIT 1
        ) as bed_number,
        
        anr.notice_period_days,
        anr.requested_vacate_date,
        anr.reason,
        anr.status,
        anr.admin_notes,
        anr.created_at,
        anr.updated_at
      FROM admin_notice_requests anr
      LEFT JOIN tenants t ON anr.tenant_id = t.id
      LEFT JOIN properties p ON t.property_id = p.id
      ORDER BY 
        CASE anr.status 
          WHEN 'pending' THEN 1
          WHEN 'accepted' THEN 2
          WHEN 'rejected' THEN 3
          WHEN 'completed' THEN 4
        END,
        anr.created_at DESC
    `;
    
    const [requests] = await db.query(sql);
    console.log(`✅ Found ${requests.length} admin notice requests`);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (err) {
    console.error('❌ Error fetching notice requests:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch notice requests"
    });
  }
};

// Create a new admin notice request
exports.createNoticeRequest = async (req, res) => {
  try {
    const { 
      tenant_id, 
      notice_period_days, 
      requested_vacate_date, 
      reason,
      admin_notes 
    } = req.body;

    if (!tenant_id || !notice_period_days || !requested_vacate_date || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: tenant_id, notice_period_days, requested_vacate_date, reason"
      });
    }

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Get tenant info for notification
      const [tenantInfo] = await connection.query(
        `SELECT full_name, email FROM tenants WHERE id = ?`,
        [tenant_id]
      );

      if (tenantInfo.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Tenant not found"
        });
      }

      const tenant = tenantInfo[0];

      // Create admin notice request
      const [result] = await connection.query(
        `INSERT INTO admin_notice_requests (
          tenant_id,
          notice_period_days,
          requested_vacate_date,
          reason,
          admin_notes,
          status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
        [tenant_id, notice_period_days, requested_vacate_date, reason, admin_notes || null]
      );

      const requestId = result.insertId;

      // Create notification for tenant
      const notificationMessage = `Admin has issued a notice period request of ${notice_period_days} days. Requested vacate date: ${new Date(requested_vacate_date).toLocaleDateString()}. Reason: ${reason}`;

      await connection.query(
        `INSERT INTO notifications (
          recipient_id,
          recipient_type,
          title,
          message,
          notification_type,
          related_entity_type,
          related_entity_id,
          priority,
          is_read,
          created_at
        ) VALUES (?, 'tenant', ?, ?, 'notice_request', 'notice_request', ?, 'high', 0, NOW())`,
        [
          tenant_id,
          '📋 Notice Period Request from Admin',
          notificationMessage,
          requestId
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Notice request created successfully",
        data: { id: requestId }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('❌ Error creating notice request:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to create notice request"
    });
  }
};

// Update notice request status
exports.updateNoticeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!status || !['pending', 'accepted', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status (pending/accepted/rejected/completed) is required"
      });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Get the request details for notification
      const [requestData] = await connection.query(
        `SELECT anr.*, t.full_name, t.email 
         FROM admin_notice_requests anr
         LEFT JOIN tenants t ON anr.tenant_id = t.id
         WHERE anr.id = ?`,
        [id]
      );

      if (requestData.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Notice request not found"
        });
      }

      const request = requestData[0];

      // Update the request
      await connection.query(
        `UPDATE admin_notice_requests 
         SET status = ?, admin_notes = CONCAT(IFNULL(admin_notes, ''), '\n', ?), updated_at = NOW() 
         WHERE id = ?`,
        [status, admin_notes || `Status updated to ${status}`, id]
      );

      // Create notification for tenant about status change
      let notificationTitle = '';
      let notificationMessage = '';

      if (status === 'accepted') {
        notificationTitle = '✅ Notice Period Request Accepted';
        notificationMessage = `Your notice period request has been accepted. You need to vacate by ${new Date(request.requested_vacate_date).toLocaleDateString()}.`;
      } else if (status === 'rejected') {
        notificationTitle = '❌ Notice Period Request Rejected';
        notificationMessage = `Your notice period request has been rejected. ${admin_notes ? `Reason: ${admin_notes}` : 'Please contact admin for more information.'}`;
      } else if (status === 'completed') {
        notificationTitle = '🏁 Notice Period Completed';
        notificationMessage = `Your notice period has been completed successfully. Thank you for your cooperation.`;
      }

      if (notificationTitle) {
        await connection.query(
          `INSERT INTO notifications (
            recipient_id,
            recipient_type,
            title,
            message,
            notification_type,
            related_entity_type,
            related_entity_id,
            priority,
            is_read,
            created_at
          ) VALUES (?, 'tenant', ?, ?, 'notice_request', 'notice_request', ?, 'high', 0, NOW())`,
          [request.tenant_id, notificationTitle, notificationMessage, id]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Notice request ${status} successfully`
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('❌ Error updating notice request:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to update notice request"
    });
  }
};

// Bulk delete notice requests
exports.bulkDeleteNoticeRequests = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of notice request IDs to delete"
      });
    }
    
    console.log(`🗑️ Bulk deleting notice requests:`, ids);
    
    const [result] = await db.query(
      `DELETE FROM admin_notice_requests WHERE id IN (?)`,
      [ids]
    );
    
    res.json({
      success: true,
      message: `Successfully deleted ${result.affectedRows} notice requests`,
      data: {
        deletedCount: result.affectedRows
      }
    });
  } catch (err) {
    console.error('❌ Error bulk deleting notice requests:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete notice requests"
    });
  }
};