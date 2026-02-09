const db = require('../config/db');
const LeaveRequestModel = require('../models/leaveRequestModel');

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

      console.log('📋 Admin fetching leave requests...');

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

      console.log(`✅ Found ${formattedRequests.length} leave requests`);

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

      console.log(`📋 Fetching leave request ${requestId}...`);

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

  // Update leave request status
  async updateLeaveRequestStatus(req, res) {
    try {
      // ✅ FIXED: Use adminId
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

      console.log(`🔄 Admin ${admin_id} updating leave request ${requestId} to ${status}`);

      // Check if request exists
      const request = await LeaveRequestModel.findById(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Leave request not found'
        });
      }

      // Start transaction
      await db.query('START TRANSACTION');

      try {
        // Update leave request status
        await LeaveRequestModel.updateStatus(requestId, {
          status,
          admin_notes,
          assigned_to
        });

        // Create notification for tenant
        const statusMessages = {
          approved: 'Your leave request has been approved',
          rejected: 'Your leave request has been rejected',
          in_progress: 'Your leave request is now in progress',
          completed: 'Your leave request has been completed',
          cancelled: 'Your leave request has been cancelled',
          pending: 'Your leave request status has been updated to pending'
        };

        await db.query(
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            request.tenant_id,
            'tenant',
            'Leave Request Status Updated',
            statusMessages[status] || 'Your leave request status has been updated',
            'leave_request_update',
            'tenant_request',
            requestId,
            'medium',
            0
          ]
        );

        await db.query('COMMIT');

        console.log(`✅ Leave request ${requestId} updated to ${status}`);

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