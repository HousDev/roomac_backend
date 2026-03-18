// controllers/adminReceiptController.js
const db = require("../config/db");

exports.getReceiptRequests = async (req, res) => {
  try {
    
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
        
        -- Receipt specific fields from receipt_requests table
        rr.id as receipt_request_id,
        rr.receipt_type,
        rr.month as receipt_month,
        rr.year as receipt_year,
        rr.month_key,
        rr.amount as receipt_amount,
        rr.status as receipt_status,
        
        tr.request_type,
        tr.title,
        tr.description,
        tr.priority,
        tr.status,
        tr.admin_notes,
        tr.resolved_at,
        tr.created_at,
        tr.updated_at
      FROM tenant_requests tr
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      LEFT JOIN properties p ON tr.property_id = p.id
      LEFT JOIN receipt_requests rr ON tr.id = rr.request_id
      WHERE tr.request_type = 'receipt'
      ORDER BY 
        CASE tr.priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        tr.created_at DESC
    `;
    
    const [requests] = await db.query(sql);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (err) {
    console.error('❌ Error fetching receipt requests:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch receipt requests"
    });
  }
};

// Update receipt request status (approve/reject)
exports.updateReceiptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;


    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status (pending/approved/rejected) is required"
      });
    }

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Update tenant_requests table
      await connection.query(
        `UPDATE tenant_requests 
         SET status = ?, admin_notes = ?, updated_at = NOW() 
         WHERE id = ? AND request_type = 'receipt'`,
        [status, admin_notes || null, id]
      );

      // Also update receipt_requests table if it exists
      await connection.query(
        `UPDATE receipt_requests 
         SET status = ? 
         WHERE request_id = ?`,
        [status, id]
      );

      // Create notification for tenant
      const notificationTitle = status === 'approved' 
        ? '✅ Receipt Request Approved' 
        : '❌ Receipt Request Rejected';

      const notificationMessage = status === 'approved'
        ? `Your receipt request has been approved. You can now download the receipt from your payments page.`
        : `Your receipt request has been rejected. ${admin_notes ? `Reason: ${admin_notes}` : 'Please contact support for more information.'}`;

      // Get tenant_id first
      const [requestData] = await connection.query(
        `SELECT tenant_id FROM tenant_requests WHERE id = ?`,
        [id]
      );

      if (requestData.length > 0) {
        await connection.query(
          `INSERT INTO notifications (
            recipient_id, recipient_type, title, message, 
            notification_type, related_entity_type, related_entity_id,
            priority, is_read, created_at
          ) VALUES (?, 'tenant', ?, ?, 'receipt_request', 'receipt_request', ?, 'medium', 0, NOW())`,
          [requestData[0].tenant_id, notificationTitle, notificationMessage, id]
        );
      }

      await connection.commit();
      
      res.json({ 
        success: true, 
        message: `Receipt request ${status} successfully`
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('❌ Error updating receipt request:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to update receipt request"
    });
  }
};

// Bulk delete receipt requests
exports.bulkDeleteReceiptRequests = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of receipt request IDs to delete"
      });
    }
    
    
    // Start a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete from receipt_requests first (foreign key constraint)
      await connection.query(
        `DELETE FROM receipt_requests WHERE request_id IN (?)`,
        [ids]
      );
      
      // Then delete the tenant requests
      const [result] = await connection.query(
        `DELETE FROM tenant_requests WHERE id IN (?) AND request_type = 'receipt'`,
        [ids]
      );
      
      await connection.commit();
      
      res.json({
        success: true,
        message: `Successfully deleted ${result.affectedRows} receipt requests`,
        data: {
          deletedCount: result.affectedRows
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('❌ Error bulk deleting receipt requests:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete receipt requests"
    });
  }
};