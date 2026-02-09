// controllers/adminDeletionRequestsController.js
const db = require('../config/db');

const AdminDeletionRequestsController = {
  // Get pending deletion requests
// Update getPendingDeletionRequests in adminDeletionRequestsController.js
// Update getPendingDeletionRequests in adminDeletionRequestsController.js
async getPendingDeletionRequests(req, res) {
  try {
    const [requests] = await db.query(
      `SELECT 
        dr.id as request_id,
        t.id as tenant_id,
        t.full_name,
        t.email,
        t.phone,
        t.country_code,
        dr.reason,
        dr.requested_at,
        p.name as property_name,
        r.room_number,
        ba.bed_number,
        t.check_in_date,
        (SELECT COUNT(*) FROM payments WHERE tenant_id = t.id AND status = 'paid') as total_payments,
        (SELECT COUNT(*) FROM bookings WHERE tenant_id = t.id AND status IN ('active', 'completed')) as total_bookings,
        t.created_at as tenant_since
       FROM tenant_deletion_requests dr
       JOIN tenants t ON dr.tenant_id = t.id
       LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
       LEFT JOIN rooms r ON ba.room_id = r.id
       LEFT JOIN properties p ON t.property_id = p.id
       WHERE dr.status = 'pending'
       ORDER BY dr.requested_at DESC`
    );

    // Format room display
    const formattedRequests = requests.map(request => ({
      ...request,
      room_display: request.room_number 
        ? (request.bed_number ? `Room ${request.room_number}, Bed ${request.bed_number}` : `Room ${request.room_number}`)
        : 'Not Assigned'
    }));

    res.json({
      success: true,
      data: formattedRequests
    });
  } catch (error) {
    console.error('Error getting deletion requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deletion requests'
    });
  }
},


  // Get all deletion requests (with filters)
  async getAllDeletionRequests(req, res) {
    try {
      const { status, startDate, endDate } = req.query;
      
      let query = `
        SELECT 
          dr.*,
          t.full_name,
          t.email,
          t.phone,
          u.email as reviewed_by_email,
          p.name as property_name
        FROM tenant_deletion_requests dr
        JOIN tenants t ON dr.tenant_id = t.id
        LEFT JOIN users u ON dr.reviewed_by = u.id
        LEFT JOIN properties p ON t.property_id = p.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (status) {
        query += ' AND dr.status = ?';
        params.push(status);
      }
      
      if (startDate) {
        query += ' AND DATE(dr.requested_at) >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND DATE(dr.requested_at) <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY dr.requested_at DESC';
      
      const [requests] = await db.query(query, params);

      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Error getting all deletion requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get deletion requests'
      });
    }
  },

// In adminDeletionRequestsController.js - approveDeletionRequest method
async approveDeletionRequest(req, res) {
  try {
    const { requestId, reviewNotes } = req.body;
    const adminId = req.user.adminId || req.user.id;

    // Get deletion request details
    const [request] = await db.query(
      `SELECT dr.*, 
              t.full_name, 
              t.email,
              ba.room_id,
              ba.bed_number,
              r.room_number,
              p.name as property_name
       FROM tenant_deletion_requests dr
       JOIN tenants t ON dr.tenant_id = t.id
       LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
       LEFT JOIN rooms r ON ba.room_id = r.id
       LEFT JOIN properties p ON r.property_id = p.id
       WHERE dr.id = ? AND dr.status = 'pending'`,
      [requestId]
    );

    if (request.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found or already processed'
      });
    }

    const reqData = request[0];
    const roomInfo = reqData.room_number 
      ? `Room ${reqData.room_number}` + (reqData.bed_number ? `, Bed ${reqData.bed_number}` : '')
      : 'No room assigned';

    // Update deletion request status
    await db.query(
      `UPDATE tenant_deletion_requests 
       SET status = 'approved',
           reviewed_at = NOW(),
           reviewed_by = ?,
           review_notes = ?
       WHERE id = ?`,
      [adminId, reviewNotes || null, requestId]
    );

    // ✅ NOW disable tenant account (only when admin approves)
    await db.query(
      `UPDATE tenants 
       SET deleted_at = NOW(),
           deleted_by = ?,
           is_active = 0,
           portal_access_enabled = 0,
           updated_at = NOW()
       WHERE id = ?`,
      [adminId, reqData.tenant_id]
    );

    // Also disable tenant credentials
    await db.query(
      `UPDATE tenant_credentials 
       SET is_active = 0
       WHERE tenant_id = ?`,
      [reqData.tenant_id]
    );

    // Create notification for tenant
    await db.query(
      `INSERT INTO notifications 
       (recipient_id, recipient_type, title, message, notification_type, related_entity_type, related_entity_id, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reqData.tenant_id,
        'tenant',
        'Account Deletion Approved',
        `Your account deletion request has been approved by the property manager. Your account has been deleted from ${roomInfo}.`,
        'account_deletion_approved',
        'tenant',
        reqData.tenant_id,
        'high'
      ]
    );

    // Mark the original notification as read
    await db.query(
      `UPDATE notifications 
       SET is_read = 1 
       WHERE related_entity_type = 'tenant' 
         AND related_entity_id = ? 
         AND notification_type = 'tenant_deletion_request'`,
      [reqData.tenant_id]
    );

    res.json({
      success: true,
      message: 'Account deletion approved successfully'
    });
  } catch (error) {
    console.error('Error approving deletion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve deletion'
    });
  }
},


  // Reject deletion request
  async rejectDeletionRequest(req, res) {
    try {
      const { requestId, reviewNotes } = req.body;
      const adminId = req.user.adminId || req.user.id;

      // Get deletion request details
      const [request] = await db.query(
        `SELECT dr.*, t.full_name, t.email 
         FROM tenant_deletion_requests dr
         JOIN tenants t ON dr.tenant_id = t.id
         WHERE dr.id = ? AND dr.status = 'pending'`,
        [requestId]
      );

      if (request.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Deletion request not found or already processed'
        });
      }

      const reqData = request[0];

      // Update deletion request status
      await db.query(
        `UPDATE tenant_deletion_requests 
         SET status = 'rejected',
             reviewed_at = NOW(),
             reviewed_by = ?,
             review_notes = ?
         WHERE id = ?`,
        [adminId, reviewNotes || null, requestId]
      );

      // Reactivate tenant account
      await db.query(
        `UPDATE tenants 
         SET is_active = 1,
             portal_access_enabled = 1,
             updated_at = NOW()
         WHERE id = ?`,
        [reqData.tenant_id]
      );

      // Create notification for tenant
      await db.query(
        `INSERT INTO notifications 
         (recipient_id, recipient_type, title, message, notification_type, related_entity_type, related_entity_id, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reqData.tenant_id,
          'tenant',
          'Account Deletion Rejected',
          `Your account deletion request has been rejected. Reason: ${reviewNotes || 'No reason provided'}`,
          'account_deletion_rejected',
          'tenant',
          reqData.tenant_id,
          'high'
        ]
      );

      // Mark the original notification as read
      await db.query(
        `UPDATE notifications 
         SET is_read = 1 
         WHERE related_entity_type = 'tenant' 
           AND related_entity_id = ? 
           AND notification_type = 'tenant_deletion_request'`,
        [reqData.tenant_id]
      );

      res.json({
        success: true,
        message: 'Deletion request rejected successfully'
      });
    } catch (error) {
      console.error('Error rejecting deletion:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject deletion request'
      });
    }
  },

  // Get deletion request statistics
  async getDeletionStats(req, res) {
    try {
      const [stats] = await db.query(
        `SELECT 
          status,
          COUNT(*) as count,
          MIN(requested_at) as first_request,
          MAX(requested_at) as last_request
         FROM tenant_deletion_requests
         GROUP BY status`
      );

      const [monthlyStats] = await db.query(
        `SELECT 
          DATE_FORMAT(requested_at, '%Y-%m') as month,
          status,
          COUNT(*) as count
         FROM tenant_deletion_requests
         WHERE requested_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(requested_at, '%Y-%m'), status
         ORDER BY month DESC`
      );

      res.json({
        success: true,
        data: {
          byStatus: stats,
          monthly: monthlyStats,
          total: stats.reduce((sum, item) => sum + item.count, 0)
        }
      });
    } catch (error) {
      console.error('Error getting deletion stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get deletion statistics'
      });
    }
  }
};

module.exports = AdminDeletionRequestsController;