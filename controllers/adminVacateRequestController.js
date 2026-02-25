// controllers/adminVacateRequestController.js
const db = require('../config/db');
const VacateRequestModel = require('../models/vacateRequestModel');
const NotificationModel = require('../models/notificationModel');
const notificationController = require("../controllers/tenantNotificationController");

class AdminVacateRequestController {
  constructor() {
    this.getAllVacateRequests = this.getAllVacateRequests.bind(this);
    this.getVacateRequestById = this.getVacateRequestById.bind(this);
    this.updateVacateRequestStatus = this.updateVacateRequestStatus.bind(this);
    this.getVacateRequestStats = this.getVacateRequestStats.bind(this);
    this.getPropertiesForFilter = this.getPropertiesForFilter.bind(this);
  }

  // Get all vacate requests with filters
  async getAllVacateRequests(req, res) {
    try {
      console.log('🔍 Admin: Getting all vacate requests');
      console.log('Query params:', req.query);
      
      // Extract filters from query params
      const filters = {
        status: req.query.status,
        property_id: req.query.property_id,
        search: req.query.search
      };
      
      const requests = await VacateRequestModel.getAllVacateRequests(filters);
      
      res.json({
        success: true,
        data: requests,
        total: requests.length,
        message: `Found ${requests.length} vacate requests`
      });
      
    } catch (error) {
      console.error('🔥 Error getting vacate requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vacate requests',
        error: error.message
      });
    }
  }

  // Get single vacate request by ID
  async getVacateRequestById(req, res) {
    try {
      const { id } = req.params;
      
      console.log(`🔍 Admin: Getting vacate request ID: ${id}`);
      
      const request = await VacateRequestModel.getVacateRequestById(id);
      
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Vacate request not found'
        });
      }
      
      res.json({
        success: true,
        data: request,
        message: 'Vacate request details fetched successfully'
      });
      
    } catch (error) {
      console.error('🔥 Error getting vacate request by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vacate request',
        error: error.message
      });
    }
  }

  // Update vacate request status
// Update vacate request status
  async updateVacateRequestStatus(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user?.adminId;
      
      // FIXED: Check if adminId is NOT present
      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
      }
      
      const {
        status,
        admin_notes,
        actual_vacate_date,
        refund_amount,
        penalty_waived,
        penalty_deduction
      } = req.body;
      
      console.log(`🔄 Admin: Updating vacate request ${id} by admin ${adminId}`);
      console.log('Update data:', req.body);
      
      // Validate required fields
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }
      
      // Validate status value
      const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      
      // Get the request first to get tenant details and current status
      const request = await VacateRequestModel.getVacateRequestById(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Vacate request not found'
        });
      }
      
      const oldStatus = request.vacate_status;
      
      // Prepare update data
      const updateData = {
        status,
        admin_notes,
        actual_vacate_date,
        refund_amount
      };
      
      // Calculate penalty deduction if waived
      if (penalty_waived) {
        // Get penalty calculation
        const penalties = this.calculatePenalties(request);
        if (penalties && penalties.total_penalty > 0) {
          updateData.penalty_deduction = penalties.total_penalty;
        }
      } else if (penalty_deduction !== undefined) {
        updateData.penalty_deduction = penalty_deduction;
      }
      
      // Start transaction
      await db.query('START TRANSACTION');

      try {
        // Update the request
        await VacateRequestModel.updateVacateRequestStatus(id, updateData, adminId);
        
        // Send notification to tenant if status changed
        if (status && status !== oldStatus) {
          try {
            await notificationController.notifyVacateStatusUpdate(
              request.vacate_request_id,
              request.tenant_id,
              status,
              admin_notes // Pass admin notes
            );
            console.log(`📨 Notification sent to tenant ${request.tenant_id} for vacate request ${id}`);
          } catch (notifError) {
            console.error('❌ Failed to send notification:', notifError);
            // Don't fail the main operation if notification fails
          }
        }

        await db.query('COMMIT');
        
        res.json({
          success: true,
          message: `Vacate request status updated to ${status} successfully`,
          data: {
            request_id: id,
            new_status: status,
            updated_at: new Date(),
            updated_by: adminId
          }
        });
        
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('🔥 Error updating vacate request status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update vacate request status',
        error: error.message
      });
    }
  }

  // Calculate penalties (same as frontend logic)
  calculatePenalties(request) {
    if (!request.check_in_date || !request.expected_vacate_date || !request.monthly_rent) {
      return null;
    }

    const expectedDate = new Date(request.expected_vacate_date);
    const checkInDate = new Date(request.check_in_date);
    
    let lockinPenalty = 0;
    let noticePenalty = 0;

    // Calculate lock-in penalty
    if (request.lockin_period_months) {
      const lockinEndDate = new Date(checkInDate);
      lockinEndDate.setMonth(checkInDate.getMonth() + request.lockin_period_months);
      
      if (expectedDate < lockinEndDate) {
        lockinPenalty = request.lockin_penalty_amount || request.monthly_rent * 2;
      }
    }

    // Calculate notice period penalty
    if (request.notice_period_days) {
      const today = new Date();
      const daysDifference = Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference < request.notice_period_days) {
        const daysShort = request.notice_period_days - daysDifference;
        noticePenalty = request.notice_penalty_amount || (request.monthly_rent / 30) * daysShort;
      }
    }

    return {
      lockin_penalty: lockinPenalty,
      notice_penalty: noticePenalty,
      total_penalty: lockinPenalty + noticePenalty
    };
  }

  // Create notification for tenant
  async createTenantNotification(tenantId, status, requestId, adminId) {
    try {
      const statusDisplay = status.replace(/_/g, ' ');
      const title = `Vacate Request ${statusDisplay}`;
      const message = `Your vacate request has been ${statusDisplay}`;
      
      // Create notification for tenant
      await NotificationModel.create({
        recipient_id: tenantId,
        recipient_type: 'tenant',
        title,
        message,
        notification_type: 'vacate_request',
        related_entity_type: 'vacate_request',
        related_entity_id: requestId,
        priority: status === 'approved' || status === 'rejected' ? 'high' : 'medium'
      });
      
      console.log(`📨 Notification created for tenant ${tenantId}`);
      
    } catch (error) {
      console.error('❌ Error creating tenant notification:', error);
      // Don't fail the entire request if notification fails
    }
  }

  // Get statistics
  async getVacateRequestStats(req, res) {
    try {
      console.log('📊 Admin: Getting vacate request statistics');
      
      const stats = await VacateRequestModel.getVacateRequestStats();
      
      res.json({
        success: true,
        data: stats,
        message: 'Vacate request statistics fetched successfully'
      });
      
    } catch (error) {
      console.error('🔥 Error getting vacate request stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error.message
      });
    }
  }

  // Get properties for filter dropdown
  async getPropertiesForFilter(req, res) {
    try {
      console.log('🏠 Admin: Getting properties for filter');
      
      const properties = await VacateRequestModel.getPropertiesForFilter();
      
      res.json({
        success: true,
        data: properties,
        message: 'Properties fetched successfully'
      });
      
    } catch (error) {
      console.error('🔥 Error getting properties for filter:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch properties',
        error: error.message
      });
    }
  }
}

module.exports = new AdminVacateRequestController();