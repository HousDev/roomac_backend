// controllers/adminLeaveRequestController.js
const db = require('../config/db');
const LeaveRequestModel = require('../models/leaveRequestModel');
const notificationController = require("../controllers/tenantNotificationController");

class LeaveRequestController {
  // Get all leave requests
  async getLeaveRequests(req, res) {
    try {
      // ✅ FIXED: Use adminId
      const admin_id = req.user?.adminId;
      
      if (!admin_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Extract query parameters
      const {
        status = 'all',
        priority = 'all',
        search = '',
        property_id,
        page = 1,
        limit = 10
      } = req.query;

      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Build filters
      const filters = {
        status: status === 'all' ? null : status,
        priority: priority === 'all' ? null : priority,
        search: search || null,
        property_id: property_id || null,
        limit: limitNum,
        offset: offset
      };

      // Get requests
      const requests = await LeaveRequestModel.findAll(filters);
      
      // Get total count
      const totalCount = await LeaveRequestModel.count(filters);

      // Format response
      const formattedRequests = requests.map(req => {
        const request = {
          id: req.id,
          tenant_id: req.tenant_id,
          tenant_name: req.tenant_name,
          tenant_email: req.tenant_email,
          tenant_phone: req.tenant_phone,
          property_id: req.property_id,
          property_name: req.property_name,
          room_number: req.room_number,
          bed_number: req.bed_number,
          request_type: req.request_type,
          title: req.title,
          description: req.description,
          priority: req.priority,
          status: req.status,
          admin_notes: req.admin_notes,
          assigned_to: req.assigned_to,
          assigned_to_name: req.assigned_to_name,
          resolved_at: req.resolved_at,
          created_at: req.created_at,
          updated_at: req.updated_at
        };

        // Add leave data if exists
        if (req.leave_request_detail_id) {
          request.leave_data = {
            leave_type: req.leave_type,
            leave_start_date: req.leave_start_date,
            leave_end_date: req.leave_end_date,
            total_days: req.total_days,
            contact_address_during_leave: req.contact_address_during_leave,
            emergency_contact_number: req.emergency_contact_number,
            room_locked: req.room_locked === 1,
            keys_submitted: req.keys_submitted === 1,
            created_at: req.leave_detail_created_at
          };
        }

        return request;
      });


      res.json({
        success: true,
        data: formattedRequests,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum)
        }
      });

    } catch (err) {
      console.error('🔥 Error getting leave requests:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
      });
    }
  }

  // Get single leave request
  async getLeaveRequestById(req, res) {
    try {
      // ✅ FIXED: Use adminId
      const admin_id = req.user?.adminId;
      const requestId = req.params.id;

      if (!admin_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }


      const request = await LeaveRequestModel.findById(requestId);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Leave request not found'
        });
      }

      // Format response
      const formattedRequest = {
        id: request.id,
        tenant_id: request.tenant_id,
        tenant_name: request.tenant_name,
        tenant_email: request.tenant_email,
        tenant_phone: request.tenant_phone,
        property_id: request.property_id,
        property_name: request.property_name,
        room_number: request.room_number,
        bed_number: request.bed_number,
        request_type: request.request_type,
        title: request.title,
        description: request.description,
        priority: request.priority,
        status: request.status,
        admin_notes: request.admin_notes,
        assigned_to: request.assigned_to,
        assigned_to_name: request.assigned_to_name,
        resolved_at: request.resolved_at,
        created_at: request.created_at,
        updated_at: request.updated_at
      };

      // Add leave data if exists
      if (request.leave_type) {
        formattedRequest.leave_data = {
          leave_type: request.leave_type,
          leave_start_date: request.leave_start_date,
          leave_end_date: request.leave_end_date,
          total_days: request.total_days,
          contact_address_during_leave: request.contact_address_during_leave,
          emergency_contact_number: request.emergency_contact_number,
          room_locked: request.room_locked === 1,
          keys_submitted: request.keys_submitted === 1,
          created_at: request.created_at
        };
      }

      res.json({
        success: true,
        data: formattedRequest
      });

    } catch (err) {
      console.error('🔥 Error getting leave request:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
      });
    }
  }
// Add this function for bulk delete
async bulkDeleteLeaveRequests(req, res) {
  try {
    const admin_id = req.user?.adminId;
    const { ids } = req.body;

    if (!admin_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of leave request IDs to delete"
      });
    }


    // Start a transaction
    await db.query('START TRANSACTION');

    try {
      // First, delete leave request details
      await db.query(
        `DELETE FROM leave_request_details WHERE request_id IN (?)`,
        [ids]
      );
      
      // Then delete the tenant requests
      const [result] = await db.query(
        `DELETE FROM tenant_requests WHERE id IN (?) AND request_type = 'leave'`,
        [ids]
      );

      await db.query('COMMIT');


      res.json({
        success: true,
        message: `Successfully deleted ${result.affectedRows} leave requests`,
        data: {
          deletedCount: result.affectedRows,
          deletedIds: ids
        }
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (err) {
    console.error('🔥 Error bulk deleting leave requests:', err.message);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to delete leave requests"
    });
  }
}
  // Update leave request status
// Update the updateLeaveRequestStatus method
async updateLeaveRequestStatus(req, res) {
  try {
    const admin_id = req.user?.adminId;
    const requestId = req.params.id;
    const { status, admin_notes, assigned_to } = req.body;

    if (!admin_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'approved', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }


    // Check if request exists and get current status
    const request = await LeaveRequestModel.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    const oldStatus = request.status;

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Update leave request status
      await LeaveRequestModel.updateStatus(requestId, {
        status,
        admin_notes,
        assigned_to
      });

      // Send notification to tenant if status changed
      if (status && status !== oldStatus) {
        try {
          await notificationController.notifyLeaveStatusUpdate(
            requestId,
            request.tenant_id,
            status,
            admin_notes // Pass admin notes
          );
        } catch (notifError) {
          console.error('❌ Failed to send notification:', notifError);
          // Don't fail the main operation if notification fails
        }
      }

      await db.query('COMMIT');


      res.json({
        success: true,
        message: 'Leave request status updated successfully'
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (err) {
    console.error('🔥 Error updating leave status:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
}

  // Get leave statistics
  async getLeaveStatistics(req, res) {
    try {
      // ✅ FIXED: Use adminId
      const admin_id = req.user?.adminId;
      
      if (!admin_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const statistics = await LeaveRequestModel.getStatistics();

      res.json({
        success: true,
        data: statistics
      });

    } catch (err) {
      console.error('🔥 Error getting leave statistics:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
      });
    }
  }
}

module.exports = new LeaveRequestController();