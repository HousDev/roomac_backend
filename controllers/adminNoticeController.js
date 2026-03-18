// controllers/adminNoticeController.js
const db = require("../config/db");

// Get all notice requests
exports.getNoticeRequests = async (req, res) => {
  try {
    console.log('📋 Fetching notice requests...');
    
    const sql = `
      SELECT 
        npr.id,
        npr.tenant_id,
        t.full_name as tenant_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        
        -- Get property name
        COALESCE(
          (
            SELECT p.name 
            FROM bed_assignments ba
            INNER JOIN rooms r ON ba.room_id = r.id
            INNER JOIN properties p ON r.property_id = p.id
            WHERE ba.tenant_id = npr.tenant_id 
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
          WHERE ba.tenant_id = npr.tenant_id 
            AND ba.is_available = 0
          ORDER BY ba.created_at DESC
          LIMIT 1
        ) as room_number,
        
        npr.title,
        npr.description,
        npr.notice_period_date,
        npr.is_seen,
        npr.created_at,
        npr.updated_at
      FROM notice_period_requests npr
      LEFT JOIN tenants t ON npr.tenant_id = t.id
      LEFT JOIN properties p ON t.property_id = p.id
      ORDER BY 
        npr.is_seen ASC,
        npr.created_at DESC
    `;
    
    const [requests] = await db.query(sql);
    console.log(`✅ Found ${requests.length} notice requests`);
    
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

// Create a new notice request
exports.createNoticeRequest = async (req, res) => {
  try {
    const { 
      tenant_id, 
      title, 
      description,
      notice_period_date
    } = req.body;

    if (!tenant_id || !title || !notice_period_date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: tenant_id, title, notice_period_date"
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

      // Create notice request
      const [result] = await connection.query(
        `INSERT INTO notice_period_requests (
          tenant_id,
          title,
          description,
          notice_period_date,
          is_seen,
          created_at
        ) VALUES (?, ?, ?, ?, 0, NOW())`,
        [tenant_id, title, description || null, notice_period_date]
      );

      const requestId = result.insertId;

      // Create notification for tenant
      const formattedDate = new Date(notice_period_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const notificationMessage = description 
        ? `Admin has sent a notice period request: "${title}" ending on ${formattedDate}. Description: ${description}`
        : `Admin has sent a notice period request: "${title}" ending on ${formattedDate}`;

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
        ) VALUES (?, 'tenant', ?, ?, 'notice_period', 'notice_period', ?, 'high', 0, NOW())`,
        [
          tenant_id,
          `📋 Notice Period: ${title}`,
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

// Update notice request (if needed - e.g., admin marks as something)
exports.updateNoticeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_seen } = req.body;

    const [result] = await db.query(
      `UPDATE notice_period_requests 
       SET is_seen = ?, updated_at = NOW() 
       WHERE id = ?`,
      [is_seen, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notice request not found"
      });
    }

    res.json({
      success: true,
      message: "Notice request updated successfully"
    });

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
      `DELETE FROM notice_period_requests WHERE id IN (?)`,
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