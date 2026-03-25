// controllers/vacateController.js
const VacateService = require('../models/vacateModel');
const db = require("../config/db")

class VacateController {
  // Get initial vacate data
async getInitialVacateData(req, res) {
  try {
    const { bedAssignmentId } = req.params;
    
    
    if (!bedAssignmentId) {
      return res.status(400).json({
        success: false,
        message: "Bed assignment ID is required"
      });
    }
    
    const data = await VacateService.getInitialData(bedAssignmentId);
    
    // Also fetch tenant's vacate requests
    if (data.bedAssignment && data.bedAssignment.tenant_id) {
      const [tenantRequests] = await db.query(
        `SELECT 
          tr.id,
          tr.tenant_id,
          tr.request_type,
          tr.title,
          tr.description,
          tr.status,
          tr.created_at,
          tr.updated_at,
          
          vbr.id as vacate_request_id,
          vbr.primary_reason_id,
          miv.name as primary_reason,
          vbr.secondary_reasons,
          vbr.overall_rating,
          vbr.food_rating,
          vbr.cleanliness_rating,
          vbr.management_rating,
          vbr.improvement_suggestions,
          vbr.expected_vacate_date,
          vbr.lockin_penalty_accepted,
          vbr.notice_penalty_accepted,
          vbr.status as vacate_status
          
         FROM tenant_requests tr
         LEFT JOIN vacate_bed_requests vbr ON tr.id = vbr.tenant_request_id
         LEFT JOIN master_item_values miv ON vbr.primary_reason_id = miv.id
         
         WHERE tr.tenant_id = ? 
           AND tr.request_type = 'vacate_bed'
           AND tr.status IN ('pending', 'in_progress', 'approved')
           
         ORDER BY tr.created_at DESC
         LIMIT 1`,
        [data.bedAssignment.tenant_id]
      );
      
      if (tenantRequests.length > 0) {
        data.existingVacateRequest = tenantRequests[0];
      }
    }
    
    
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (err) {
    console.error("[VACATE] getInitialVacateData error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get initial vacate data"
    });
  }
}
  
  // Calculate penalties for the process
  async calculatePenalties(req, res) {
    try {
      const {
        bedAssignmentId,
        vacateReasonValue,
        isNoticeGiven,
        noticeGivenDate,
        requestedVacateDate
      } = req.body;
      
      if (!bedAssignmentId || !vacateReasonValue || !requestedVacateDate) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: bedAssignmentId, vacateReasonValue, requestedVacateDate"
        });
      }
      
      const calculation = await VacateService.calculateStepByStepPenalties({
        bedAssignmentId,
        vacateReasonValue,
        isNoticeGiven: isNoticeGiven || false,
        noticeGivenDate: noticeGivenDate || null,
        requestedVacateDate
      });
      
      res.json({
        success: true,
        data: calculation
      });
      
    } catch (err) {
      console.error("calculatePenalties error:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to calculate penalties"
      });
    }
  }
  
  // Submit vacate request
  async submitVacateRequest(req, res) {
    try {
      const {
        bedAssignmentId,
        tenantId,
        vacateReasonValue,
        isNoticeGiven,
        noticeGivenDate,
        requestedVacateDate,
        tenantAgreed,
        lockinPeriodMonths,
        lockinPenaltyType,
        lockinPenaltyAmount,
        noticePeriodDays,
        noticePenaltyType,
        noticePenaltyAmount,
        securityDepositAmount,
        totalPenaltyAmount,
        refundableAmount,
        lockinPenaltyApplied,
        noticePenaltyApplied,
        adminApproved,
        tenantVacateRequestId
      } = req.body;

      // Validate required fields
      if (!bedAssignmentId || !tenantId || !requestedVacateDate || !vacateReasonValue) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Check if tenant agreed to terms
      if (!tenantAgreed) {
        return res.status(400).json({
          success: false,
          message: 'Tenant must agree to terms'
        });
      }

      // Get bed assignment details
      const bedAssignment = await VacateService.getBedAssignmentDetails(bedAssignmentId);
      if (!bedAssignment) {
        return res.status(404).json({
          success: false,
          message: 'Bed assignment not found'
        });
      }

      // Submit vacate request
      const vacateRecordId = await VacateService.submitVacateRequest({
        bedAssignmentId,
        tenantId,
        roomId: bedAssignment.room_id,
        propertyId: bedAssignment.property_id,
        vacateReasonValue,
        lockinPeriodMonths,
        lockinPenaltyType,
        lockinPenaltyAmount,
        noticePeriodDays,
        noticePenaltyType,
        noticePenaltyAmount,
        requestedVacateDate,
        noticeGivenDate: isNoticeGiven ? noticeGivenDate : null,
        securityDepositAmount,
        totalPenaltyAmount,
        refundableAmount,
        tenantAgreed,
        status: adminApproved ? 'approved' : 'pending',
        lockinPenaltyApplied,
        noticePenaltyApplied
      });

      // Update tenant request status if exists
      if (tenantVacateRequestId) {
        await VacateService.updateTenantRequestStatus(tenantVacateRequestId, 'completed');
      }

      // Mark bed as available
      await VacateService.markBedAsAvailable(bedAssignmentId);

      res.json({
        success: true,
        message: 'Vacate request submitted successfully',
        data: {
          vacateRecordId,
          status: adminApproved ? 'approved' : 'pending',
          financials: {
            securityDeposit: securityDepositAmount,
            lockinPenalty: lockinPenaltyApplied ? lockinPenaltyAmount : 0,
            noticePenalty: noticePenaltyApplied ? noticePenaltyAmount : 0,
            totalPenalty: totalPenaltyAmount,
            refundableAmount
          }
        }
      });

    } catch (error) {
      console.error('submitVacateRequest error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to submit vacate request'
      });
    }
  }
  
  // Get vacate history
  async getVacateHistory(req, res) {
    try {
      const { bedAssignmentId } = req.params;
      
      if (!bedAssignmentId) {
        return res.status(400).json({
          success: false,
          message: "Bed assignment ID is required"
        });
      }
      
      const history = await VacateService.getVacateHistory(bedAssignmentId);
      
      res.json({
        success: true,
        data: history
      });
      
    } catch (err) {
      console.error("getVacateHistory error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch vacate history"
      });
    }
  }

  // Get bed assignment details
  async getBedAssignmentDetails(req, res) {
    try {
      const { bedAssignmentId } = req.params;
      
      if (!bedAssignmentId) {
        return res.status(400).json({
          success: false,
          message: "Bed assignment ID is required"
        });
      }
      
      const bedAssignment = await VacateService.getBedAssignmentDetails(bedAssignmentId);
      
      if (!bedAssignment) {
        return res.status(404).json({
          success: false,
          message: "Bed assignment not found"
        });
      }
      
      res.json({
        success: true,
        data: bedAssignment
      });
      
    } catch (err) {
      console.error("getBedAssignmentDetails error:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to get bed assignment details"
      });
    }
  }
}

module.exports = new VacateController();