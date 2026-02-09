// controllers/tenantRequestController.js
// const TenantRequest = require('../models/tenantRequestModel');

// class TenantRequestController {
//   // Create new request (tenant)
//   static async createRequest(req, res) {
//     try {
//       const tenantId = req.user.tenantId; // From tenantAuth middleware
//       const { request_type, title, description, priority, property_id } = req.body;
      
//       if (!title || !description) {
//         return res.status(400).json({ 
//           success: false,
//           error: 'Missing required fields: title and description' 
//         });
//       }
      
//       const request = await TenantRequest.create({
//         tenant_id: tenantId,
//         request_type: request_type || 'general',
//         title,
//         description,
//         priority: priority || 'medium',
//         status: 'pending',
//         property_id: property_id || null
//       });
      
//       res.status(201).json({
//         success: true,
//         message: 'Request created successfully',
//         data: request
//       });
//     } catch (error) {
//       console.error('Create request error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to create request',
//         details: error.message 
//       });
//     }
//   }

//   // Get my requests (tenant)
//   static async getMyRequests(req, res) {
//     try {
//       const tenantId = req.user.tenantId; // From tenantAuth middleware
//       const requests = await TenantRequest.findByTenantId(tenantId);
      
//       res.json({
//         success: true,
//         data: requests
//       });
//     } catch (error) {
//       console.error('Get tenant requests error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to fetch requests',
//         details: error.message 
//       });
//     }
//   }

//   // Get single request by ID (tenant)
//   static async getMyRequestById(req, res) {
//     try {
//       const { id } = req.params;
//       const tenantId = req.user.tenantId;
      
//       const request = await TenantRequest.findById(id);
      
//       if (!request) {
//         return res.status(404).json({ 
//           success: false,
//           error: 'Request not found' 
//         });
//       }
      
//       // Check if request belongs to this tenant
//       if (request.tenant_id !== tenantId) {
//         return res.status(403).json({ 
//           success: false,
//           error: 'Access denied' 
//         });
//       }
      
//       res.json({
//         success: true,
//         data: request
//       });
//     } catch (error) {
//       console.error('Get request error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to fetch request',
//         details: error.message 
//       });
//     }
//   }

//   // Get all requests (admin)
//   static async getAllRequests(req, res) {
//     try {
//       const { status, request_type, priority, search } = req.query;
//       const filters = {};
      
//       if (status) filters.status = status;
//       if (request_type) filters.request_type = request_type;
//       if (priority) filters.priority = priority;
//       if (search) filters.search = search;
      
//       const requests = await TenantRequest.findAll(filters);
      
//       res.json({
//         success: true,
//         data: requests
//       });
//     } catch (error) {
//       console.error('Get all requests error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to fetch requests',
//         details: error.message 
//       });
//     }
//   }

//   // Get requests by type (for admin dashboard pages)
//   static async getRequestsByType(req, res) {
//     try {
//       const { type } = req.params;
      
//       if (!type) {
//         return res.status(400).json({ 
//           success: false,
//           error: 'Request type is required' 
//         });
//       }
      
//       const requests = await TenantRequest.findByType(type);
      
//       res.json({
//         success: true,
//         data: requests
//       });
//     } catch (error) {
//       console.error('Get requests by type error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to fetch requests',
//         details: error.message 
//       });
//     }
//   }

//   // Get request by ID (admin)
//   static async getRequestById(req, res) {
//     try {
//       const { id } = req.params;
//       const request = await TenantRequest.findById(id);
      
//       if (!request) {
//         return res.status(404).json({ 
//           success: false,
//           error: 'Request not found' 
//         });
//       }
      
//       res.json({
//         success: true,
//         data: request
//       });
//     } catch (error) {
//       console.error('Get request error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to fetch request',
//         details: error.message 
//       });
//     }
//   }

//   // Update request (admin)
//   static async updateRequest(req, res) {
//     try {
//       const { id } = req.params;
//       const updateData = req.body;
      
//       const existingRequest = await TenantRequest.findById(id);
//       if (!existingRequest) {
//         return res.status(404).json({ 
//           success: false,
//           error: 'Request not found' 
//         });
//       }
      
//       const updatedRequest = await TenantRequest.update(id, updateData);
      
//       res.json({
//         success: true,
//         message: 'Request updated successfully',
//         data: updatedRequest
//       });
//     } catch (error) {
//       console.error('Update request error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to update request',
//         details: error.message 
//       });
//     }
//   }

//   // Update request status (admin)
//   static async updateRequestStatus(req, res) {
//     try {
//       const { id } = req.params;
//       const { status, admin_notes } = req.body;
      
//       if (!status) {
//         return res.status(400).json({ 
//           success: false,
//           error: 'Status is required' 
//         });
//       }
      
//       const existingRequest = await TenantRequest.findById(id);
//       if (!existingRequest) {
//         return res.status(404).json({ 
//           success: false,
//           error: 'Request not found' 
//         });
//       }
      
//       const updatedRequest = await TenantRequest.updateStatus(id, status, admin_notes);
      
//       res.json({
//         success: true,
//         message: 'Status updated successfully',
//         data: updatedRequest
//       });
//     } catch (error) {
//       console.error('Update status error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to update status',
//         details: error.message 
//       });
//     }
//   }

//   // Assign request to staff (admin)
//   static async assignRequest(req, res) {
//     try {
//       const { id } = req.params;
//       const { assigned_to } = req.body;
      
//       if (!assigned_to) {
//         return res.status(400).json({ 
//           success: false,
//           error: 'Staff ID (assigned_to) is required' 
//         });
//       }
      
//       const existingRequest = await TenantRequest.findById(id);
//       if (!existingRequest) {
//         return res.status(404).json({ 
//           success: false,
//           error: 'Request not found' 
//         });
//       }
      
//       const updatedRequest = await TenantRequest.assignToStaff(id, assigned_to);
      
//       res.json({
//         success: true,
//         message: 'Request assigned successfully',
//         data: updatedRequest
//       });
//     } catch (error) {
//       console.error('Assign request error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to assign request',
//         details: error.message 
//       });
//     }
//   }

//   // Get statistics (admin)
//   static async getStats(req, res) {
//     try {
//       const stats = await TenantRequest.getStats();
      
//       res.json({
//         success: true,
//         data: stats
//       });
//     } catch (error) {
//       console.error('Get stats error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to fetch statistics',
//         details: error.message 
//       });
//     }
//   }

//   // Delete request (admin)
//   static async deleteRequest(req, res) {
//     try {
//       const { id } = req.params;
      
//       const existingRequest = await TenantRequest.findById(id);
//       if (!existingRequest) {
//         return res.status(404).json({ 
//           success: false,
//           error: 'Request not found' 
//         });
//       }
      
//       await TenantRequest.delete(id);
      
//       res.json({
//         success: true,
//         message: 'Request deleted successfully'
//       });
//     } catch (error) {
//       console.error('Delete request error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to delete request',
//         details: error.message 
//       });
//     }
//   }
// }

// module.exports = TenantRequestController;


// controllers/tenantRequestController.js
const db = require('../config/db');
const masterModel = require('../models/masterModel');
const ChangeBedRequestModel = require('../models/changeBedRequestModel'); // Add this

class TenantRequestController {
constructor() {
    // Bind methods to ensure proper 'this' context
    this.formatDate = this.formatDate.bind(this);
    this.getPenaltyDescription = this.getPenaltyDescription.bind(this);
    this.calculatePenaltyAmount = this.calculatePenaltyAmount.bind(this);
    this.createRequest = this.createRequest.bind(this);
    this.getTenantContractDetails = this.getTenantContractDetails.bind(this);
    this.getMyRequests = this.getMyRequests.bind(this);
    this.getVacateReasons = this.getVacateReasons.bind(this);
  }

  // Helper functions
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  getPenaltyDescription(amount, type, security_deposit= null) {
    if (!amount) return 'No penalty';
    
    const typeMap = {
      'fixed': `₹${amount} fixed penalty`,
      'percentage': security_deposit ? `${amount}% of security deposit (₹${(security_deposit * amount / 100).toFixed(2)})` : `${amount}% of security deposit`,
    };
    
    return typeMap[type] || `Penalty: ₹${amount}`;
  }

calculatePenaltyAmount(amount, type, security_deposit = null) {
  if (!amount || !security_deposit) return amount || null;
  
  const typeMap = {
    'fixed': parseFloat(amount),
    'percentage': (parseFloat(security_deposit) * parseFloat(amount)) / 100,
  };
  
  return typeMap[type] || parseFloat(amount);
}

//   async createRequest(req, res) {
//     console.log('🎯 createRequest called with body:', req.body);

//     try {
//       const tenant_id = req.user?.id;
//       if (!tenant_id) {
//         return res.status(401).json({
//           success: false,
//           message: 'Authentication required'
//         });
//       }

//       const { 
//         request_type, 
//         title, 
//         description, 
//         priority = 'medium',
//         vacate_data 
//       } = req.body;

//       // Validate required fields
//       if (!title || !description || !request_type) {
//         return res.status(400).json({
//           success: false,
//           message: 'Title, description, and request type are required'
//         });
//       }

//       // Get tenant's property and bed info with lock-in details
//       const [tenantInfo] = await db.query(
//         `SELECT 
//           t.property_id, 
//           -- Get bed assignment details
//           ba.id as bed_assignment_id,
//           ba.room_id,
//           ba.bed_number,
//           t.lockin_period_months,
//           t.lockin_penalty_amount,
//           t.lockin_penalty_type,
//           t.notice_period_days,
//           t.notice_penalty_amount,
//           t.notice_penalty_type,
//           t.check_in_date,
//           r.rent_per_bed as monthly_rent
//          FROM tenants t
//          -- Join bed_assignments to get current assignment
//          LEFT JOIN bed_assignments ba ON ba.tenant_id = t.id AND ba.is_available = 0
//          -- Join rooms to get rent
//          LEFT JOIN rooms r ON ba.room_id = r.id
//          WHERE t.id = ? AND t.deleted_at IS NULL`,
//         [tenant_id]
//       );

//       if (tenantInfo.length === 0) {
//         return res.status(404).json({
//           success: false,
//           message: 'Tenant not found'
//         });
//       }

//       const tenantData = tenantInfo[0];
      
//       console.log('📊 Tenant contract details loaded:', {
//         check_in_date: tenantData.check_in_date,
//         lockin_period_months: tenantData.lockin_period_months,
//         lockin_penalty_amount: tenantData.lockin_penalty_amount,
//         lockin_penalty_type: tenantData.lockin_penalty_type,
//         notice_period_days: tenantData.notice_period_days,
//         notice_penalty_amount: tenantData.notice_penalty_amount,
//         notice_penalty_type: tenantData.notice_penalty_type,
//         monthly_rent: tenantData.monthly_rent,
//         room_id: tenantData.room_id,
//         bed_assignment_id: tenantData.bed_assignment_id,
//         bed_number: tenantData.bed_number
//       });

//       // Check lock-in period for vacate_bed request
//       let lockinDetails = null;
//       let noticeDetails = null;
      
//       if (request_type === 'vacate_bed') {
//         // Calculate lock-in period status
//         if (tenantData.check_in_date && tenantData.lockin_period_months) {
//           const checkInDate = new Date(tenantData.check_in_date);
//           const currentDate = new Date();
//           const monthsDiff = (currentDate.getFullYear() - checkInDate.getFullYear()) * 12 + 
//                            (currentDate.getMonth() - checkInDate.getMonth());

//           const lockInEndDate = new Date(checkInDate);
//           lockInEndDate.setMonth(checkInDate.getMonth() + tenantData.lockin_period_months);
          
//           const isInLockinPeriod = monthsDiff < tenantData.lockin_period_months;
//           const remainingMonths = Math.max(0, tenantData.lockin_period_months - monthsDiff);
          
//           // Calculate penalty amount
//           const lockinPenaltyAmount = this.calculatePenaltyAmount(
//             tenantData.lockin_penalty_amount,
//             tenantData.lockin_penalty_type,
//             tenantData.monthly_rent
//           );
          
//           lockinDetails = {
//             isInLockinPeriod,
//             lockinEnds: lockInEndDate,
//             remainingMonths,
//             penaltyAmount: tenantData.lockin_penalty_amount,
//             penaltyType: tenantData.lockin_penalty_type,
//             monthlyRent: tenantData.monthly_rent,
//             calculatedPenaltyAmount: lockinPenaltyAmount,
//             penaltyDescription: this.getPenaltyDescription(
//               tenantData.lockin_penalty_amount,
//               tenantData.lockin_penalty_type,
//               tenantData.monthly_rent
//             )
//           };
          
//           console.log('🔒 Lock-in details:', lockinDetails);
//         }

//         // Notice period details
//         if (tenantData.notice_period_days) {
//           // Calculate penalty amount
//           const noticePenaltyAmount = this.calculatePenaltyAmount(
//             tenantData.notice_penalty_amount,
//             tenantData.notice_penalty_type,
//             tenantData.monthly_rent
//           );
          
//           noticeDetails = {
//             noticePeriodDays: tenantData.notice_period_days,
//             penaltyAmount: tenantData.notice_penalty_amount,
//             penaltyType: tenantData.notice_penalty_type,
//             monthlyRent: tenantData.monthly_rent,
//             calculatedPenaltyAmount: noticePenaltyAmount,
//             penaltyDescription: this.getPenaltyDescription(
//               tenantData.notice_penalty_amount,
//               tenantData.notice_penalty_type,
//               tenantData.monthly_rent
//             ),
//             requiresAgreement: !!tenantData.notice_penalty_amount
//           };
          
//           console.log('📋 Notice details:', noticeDetails);
//         }

//         // Validate penalty agreements if required
//         if (vacate_data) {
//           if (lockinDetails?.isInLockinPeriod && !vacate_data.lockin_penalty_accepted) {
//             return res.status(400).json({
//               success: false,
//               message: 'You must agree to the lock-in period penalty',
//               requires_lockin_agreement: true,
//               lockin_details: lockinDetails
//             });
//           }
          
//           if (noticeDetails?.requiresAgreement && !vacate_data.notice_penalty_accepted) {
//             return res.status(400).json({
//               success: false,
//               message: 'You must agree to the notice period penalty',
//               requires_notice_agreement: true,
//               notice_details: noticeDetails
//             });
//           }
//         }
//       }

//       // Start transaction
//       await db.query('START TRANSACTION');

//       try {
//         // Create tenant_request record with penalty notes
//         let adminNotes = '';
        
//         if (request_type === 'vacate_bed') {
//           if (lockinDetails?.isInLockinPeriod) {
//             adminNotes += `Lock-in Period Active: Ends ${this.formatDate(lockinDetails.lockinEnds)}\n`;
//             adminNotes += `Early Vacate Penalty: ${lockinDetails.penaltyDescription}\n`;
//             adminNotes += `Tenant agreed to penalty: ${vacate_data?.lockin_penalty_accepted ? 'YES' : 'N/A'}\n`;
//           }
          
//           if (noticeDetails) {
//             adminNotes += `Notice Period: ${noticeDetails.noticePeriodDays} days\n`;
//             adminNotes += `Notice Penalty: ${noticeDetails.penaltyDescription}\n`;
//             adminNotes += `Tenant agreed to penalty: ${vacate_data?.notice_penalty_accepted ? 'YES' : 'N/A'}\n`;
//           }
//         }

//         const [result] = await db.query(
//           `INSERT INTO tenant_requests (
//             tenant_id,
//             property_id,
//             request_type,
//             title,
//             description,
//             priority,
//             status,
//             admin_notes,
//             created_at
//           ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
//           [
//             tenant_id, 
//             tenantData.property_id, 
//             request_type, 
//             title, 
//             description, 
//             priority,
//             adminNotes || null
//           ]
//         );

//         const requestId = result.insertId;

//         // If it's a vacate_bed request, create vacate_bed_request record with penalty flags
//         if (request_type === 'vacate_bed' && vacate_data) {
//   const {
//     primary_reason_id,
//     secondary_reasons = [],
//     overall_rating,
//     food_rating,
//     cleanliness_rating,
//     management_rating,
//     improvement_suggestions,
//     expected_vacate_date, // This should now come from frontend
//     lockin_penalty_accepted = false,
//     notice_penalty_accepted = false
//   } = vacate_data;

//   console.log('📝 Creating vacate_bed_request record with data:', {
//     tenant_id,
//     property_id: tenantData.property_id,
//     bed_id: tenantData.bed_assignment_id,
//     room_id: tenantData.room_id,
//     primary_reason_id,
//     secondary_reasons,
//     overall_rating,
//     food_rating,
//     cleanliness_rating,
//     management_rating,
//     improvement_suggestions,
//     expected_vacate_date, // Log this to check if it's coming from frontend
//     lockin_penalty_accepted,
//     notice_penalty_accepted,
//     tenant_request_id: requestId
//   });

//   // CORRECTED INSERT QUERY with expected_vacate_date included
//   await db.query(
//     `INSERT INTO vacate_bed_requests (
//       tenant_id,
//       property_id,
//       bed_id,
//       room_id,
//       primary_reason_id,
//       secondary_reasons,
//       overall_rating,
//       food_rating,
//       cleanliness_rating,
//       management_rating,
//       improvement_suggestions,
//       expected_vacate_date,  
//       lockin_penalty_accepted,
//       notice_penalty_accepted,
//       status,
//       created_at,
//       tenant_request_id
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
//     [
//       tenant_id,
//       tenantData.property_id,
//       tenantData.bed_assignment_id,
//       tenantData.room_id,
//       primary_reason_id,
//       secondary_reasons.length > 0 ? JSON.stringify(secondary_reasons) : null,
//       overall_rating,
//       food_rating,
//       cleanliness_rating,
//       management_rating,
//       improvement_suggestions,
//       expected_vacate_date || null,  
//       lockin_penalty_accepted ? 1 : 0,
//       notice_penalty_accepted ? 1 : 0,
//       requestId
//     ]
//   );

//   console.log('✅ vacate_bed_request record created successfully');
// }

//         await db.query('COMMIT');

//         res.json({
//           success: true,
//           message: 'Request created successfully',
//           request_id: requestId
//         });

//       } catch (error) {
//         await db.query('ROLLBACK');
//         console.error('❌ Transaction failed:', error);
//         throw error;
//       }

//     } catch (err) {
//       console.error('🔥 Create tenant request error:', err);
//       res.status(500).json({
//         success: false,
//         message: err.message || 'Internal server error'
//       });
//     }
//   }

// async createRequest(req, res) {
//   console.log('🎯 createRequest called with body:', req.body);

//   try {
//     const tenant_id = req.user?.id;
//     if (!tenant_id) {
//       return res.status(401).json({
//         success: false,
//         message: 'Authentication required'
//       });
//     }

//     const { 
//       request_type, 
//       title, 
//       description, 
//       priority = 'medium',
//       vacate_data 
//     } = req.body;

//     // Validate required fields
//     if (!title || !description || !request_type) {
//       return res.status(400).json({
//         success: false,
//         message: 'Title, description, and request type are required'
//       });
//     }

//     // Get tenant's property and bed info with lock-in details
//     const [tenantInfo] = await db.query(
//       `SELECT 
//         t.property_id, 
//         t.full_name,
//         -- Get bed assignment details
//         ba.id as bed_assignment_id,
//         ba.room_id,
//         ba.bed_number,
//         t.lockin_period_months,
//         t.lockin_penalty_amount,
//         t.lockin_penalty_type,
//         t.notice_period_days,
//         t.notice_penalty_amount,
//         t.notice_penalty_type,
//         t.check_in_date,
//         r.rent_per_bed as monthly_rent
//        FROM tenants t
//        -- Join bed_assignments to get current assignment
//        LEFT JOIN bed_assignments ba ON ba.tenant_id = t.id AND ba.is_available = 0
//        -- Join rooms to get rent
//        LEFT JOIN rooms r ON ba.room_id = r.id
//        WHERE t.id = ? AND t.deleted_at IS NULL`,
//       [tenant_id]
//     );

//     if (tenantInfo.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Tenant not found'
//       });
//     }

//     const tenantData = tenantInfo[0];
//     const tenantName = tenantData.full_name;
    
//     console.log('📊 Tenant details for notification:', {
//       tenant_id,
//       tenant_name: tenantName,
//       request_type,
//       title
//     });

//     // Check lock-in period for vacate_bed request
//     let lockinDetails = null;
//     let noticeDetails = null;
    
//     if (request_type === 'vacate_bed') {
//       // Calculate lock-in period status
//       if (tenantData.check_in_date && tenantData.lockin_period_months) {
//         const checkInDate = new Date(tenantData.check_in_date);
//         const currentDate = new Date();
//         const monthsDiff = (currentDate.getFullYear() - checkInDate.getFullYear()) * 12 + 
//                          (currentDate.getMonth() - checkInDate.getMonth());

//         const lockInEndDate = new Date(checkInDate);
//         lockInEndDate.setMonth(checkInDate.getMonth() + tenantData.lockin_period_months);
        
//         const isInLockinPeriod = monthsDiff < tenantData.lockin_period_months;
//         const remainingMonths = Math.max(0, tenantData.lockin_period_months - monthsDiff);
        
//         // Calculate penalty amount
//         const lockinPenaltyAmount = this.calculatePenaltyAmount(
//           tenantData.lockin_penalty_amount,
//           tenantData.lockin_penalty_type,
//           tenantData.monthly_rent
//         );
        
//         lockinDetails = {
//           isInLockinPeriod,
//           lockinEnds: lockInEndDate,
//           remainingMonths,
//           penaltyAmount: tenantData.lockin_penalty_amount,
//           penaltyType: tenantData.lockin_penalty_type,
//           monthlyRent: tenantData.monthly_rent,
//           calculatedPenaltyAmount: lockinPenaltyAmount,
//           penaltyDescription: this.getPenaltyDescription(
//             tenantData.lockin_penalty_amount,
//             tenantData.lockin_penalty_type,
//             tenantData.monthly_rent
//           )
//         };
        
//         console.log('🔒 Lock-in details:', lockinDetails);
//       }

//       // Notice period details
//       if (tenantData.notice_period_days) {
//         // Calculate penalty amount
//         const noticePenaltyAmount = this.calculatePenaltyAmount(
//           tenantData.notice_penalty_amount,
//           tenantData.notice_penalty_type,
//           tenantData.monthly_rent
//         );
        
//         noticeDetails = {
//           noticePeriodDays: tenantData.notice_period_days,
//           penaltyAmount: tenantData.notice_penalty_amount,
//           penaltyType: tenantData.notice_penalty_type,
//           monthlyRent: tenantData.monthly_rent,
//           calculatedPenaltyAmount: noticePenaltyAmount,
//           penaltyDescription: this.getPenaltyDescription(
//             tenantData.notice_penalty_amount,
//             tenantData.notice_penalty_type,
//             tenantData.monthly_rent
//           ),
//           requiresAgreement: !!tenantData.notice_penalty_amount
//         };
        
//         console.log('📋 Notice details:', noticeDetails);
//       }

//       // Validate penalty agreements if required
//       if (vacate_data) {
//         if (lockinDetails?.isInLockinPeriod && !vacate_data.lockin_penalty_accepted) {
//           return res.status(400).json({
//             success: false,
//             message: 'You must agree to the lock-in period penalty',
//             requires_lockin_agreement: true,
//             lockin_details: lockinDetails
//           });
//         }
        
//         if (noticeDetails?.requiresAgreement && !vacate_data.notice_penalty_accepted) {
//           return res.status(400).json({
//             success: false,
//             message: 'You must agree to the notice period penalty',
//             requires_notice_agreement: true,
//             notice_details: noticeDetails
//           });
//         }
//       }
//     }

//     // Start transaction
//     await db.query('START TRANSACTION');

//     try {
//       // Create tenant_request record with penalty notes
//       let adminNotes = '';
      
//       if (request_type === 'vacate_bed') {
//         if (lockinDetails?.isInLockinPeriod) {
//           adminNotes += `Lock-in Period Active: Ends ${this.formatDate(lockinDetails.lockinEnds)}\n`;
//           adminNotes += `Early Vacate Penalty: ${lockinDetails.penaltyDescription}\n`;
//           adminNotes += `Tenant agreed to penalty: ${vacate_data?.lockin_penalty_accepted ? 'YES' : 'N/A'}\n`;
//         }
        
//         if (noticeDetails) {
//           adminNotes += `Notice Period: ${noticeDetails.noticePeriodDays} days\n`;
//           adminNotes += `Notice Penalty: ${noticeDetails.penaltyDescription}\n`;
//           adminNotes += `Tenant agreed to penalty: ${vacate_data?.notice_penalty_accepted ? 'YES' : 'N/A'}\n`;
//         }
//       }

//       const [result] = await db.query(
//         `INSERT INTO tenant_requests (
//           tenant_id,
//           property_id,
//           request_type,
//           title,
//           description,
//           priority,
//           status,
//           admin_notes,
//           created_at
//         ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
//         [
//           tenant_id, 
//           tenantData.property_id, 
//           request_type, 
//           title, 
//           description, 
//           priority,
//           adminNotes || null
//         ]
//       );

//       const requestId = result.insertId;
//       console.log(`✅ Tenant request created with ID: ${requestId}`);

//       // If it's a vacate_bed request, create vacate_bed_request record with penalty flags
//       if (request_type === 'vacate_bed' && vacate_data) {
//         const {
//           primary_reason_id,
//           secondary_reasons = [],
//           overall_rating,
//           food_rating,
//           cleanliness_rating,
//           management_rating,
//           improvement_suggestions,
//           expected_vacate_date,
//           lockin_penalty_accepted = false,
//           notice_penalty_accepted = false
//         } = vacate_data;

//         console.log('📝 Creating vacate_bed_request record with data:', {
//           tenant_id,
//           property_id: tenantData.property_id,
//           bed_id: tenantData.bed_assignment_id,
//           room_id: tenantData.room_id,
//           primary_reason_id,
//           secondary_reasons,
//           overall_rating,
//           food_rating,
//           cleanliness_rating,
//           management_rating,
//           improvement_suggestions,
//           expected_vacate_date,
//           lockin_penalty_accepted,
//           notice_penalty_accepted,
//           tenant_request_id: requestId
//         });

//         await db.query(
//           `INSERT INTO vacate_bed_requests (
//             tenant_id,
//             property_id,
//             bed_id,
//             room_id,
//             primary_reason_id,
//             secondary_reasons,
//             overall_rating,
//             food_rating,
//             cleanliness_rating,
//             management_rating,
//             improvement_suggestions,
//             expected_vacate_date,  
//             lockin_penalty_accepted,
//             notice_penalty_accepted,
//             status,
//             created_at,
//             tenant_request_id
//           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
//           [
//             tenant_id,
//             tenantData.property_id,
//             tenantData.bed_assignment_id,
//             tenantData.room_id,
//             primary_reason_id,
//             secondary_reasons.length > 0 ? JSON.stringify(secondary_reasons) : null,
//             overall_rating,
//             food_rating,
//             cleanliness_rating,
//             management_rating,
//             improvement_suggestions,
//             expected_vacate_date || null,  
//             lockin_penalty_accepted ? 1 : 0,
//             notice_penalty_accepted ? 1 : 0,
//             requestId
//           ]
//         );

//         console.log('✅ vacate_bed_request record created successfully');
//       }

//       // ====================================================
//       // CREATE NOTIFICATIONS FOR ADMINS - ADD THIS SECTION
//       // ====================================================
//       console.log('🔔 Creating notifications for admins...');
      
//       // Get all admins who should receive notifications
//       const [admins] = await db.query(
//         'SELECT id, email FROM staff WHERE role IN ("admin", "super_admin") AND is_active = 1'
//       );
      
//       console.log(`👥 Found ${admins.length} admins to notify`);
      
//       for (const admin of admins) {
//         // Create notification for each admin
//         const notificationData = {
//           recipient_id: admin.id,
//           recipient_type: 'admin',
//           title: `New ${request_type.replace('_', ' ')} Request`,
//           message: `Tenant ${tenantName} has submitted a new ${request_type.replace('_', ' ')} request: "${title}"`,
//           notification_type: 'tenant_request',
//           related_entity_type: 'tenant_request',
//           related_entity_id: requestId,
//           priority: request_type === 'complaint' || request_type === 'maintenance' ? 'high' : 'medium',
//           created_at: new Date()
//         };
        
//         console.log(`📨 Creating notification for admin ${admin.id}:`, {
//           title: notificationData.title,
//           message: notificationData.message
//         });
        
//         await db.query(
//           `INSERT INTO notifications SET ?`,
//           [notificationData]
//         );
//       }
      
//       console.log(`✅ Created notifications for ${admins.length} admins`);
//       // ====================================================
//       // END NOTIFICATION CREATION SECTION
//       // ====================================================

//       await db.query('COMMIT');

//       res.json({
//         success: true,
//         message: 'Request created successfully',
//         request_id: requestId,
//         debug: {
//           tenant_name: tenantName,
//           notifications_created: admins.length
//         }
//       });

//     } catch (error) {
//       await db.query('ROLLBACK');
//       console.error('❌ Transaction failed:', error);
//       throw error;
//     }

//   } catch (err) {
//     console.error('🔥 Create tenant request error:', err);
//     res.status(500).json({
//       success: false,
//       message: err.message || 'Internal server error'
//     });
//   }
// }
// async createRequest(req, res) {
//   console.log('🎯 createRequest called with body:', req.body);

//   try {
//     const tenant_id = req.user?.id;
//     if (!tenant_id) {
//       return res.status(401).json({
//         success: false,
//         message: 'Authentication required'
//       });
//     }

//     const { 
//       request_type, 
//       title, 
//       description, 
//       priority = 'medium',
//       vacate_data 
//     } = req.body;

//     // Validate required fields
//     if (!title || !description || !request_type) {
//       return res.status(400).json({
//         success: false,
//         message: 'Title, description, and request type are required'
//       });
//     }

//     // Get tenant's property and bed info with lock-in details
//     const [tenantInfo] = await db.query(
//       `SELECT 
//         t.property_id, 
//         t.full_name,
//         -- Get bed assignment details
//         ba.id as bed_assignment_id,
//         ba.room_id,
//         ba.bed_number,
//         t.lockin_period_months,
//         t.lockin_penalty_amount,
//         t.lockin_penalty_type,
//         t.notice_period_days,
//         t.notice_penalty_amount,
//         t.notice_penalty_type,
//         t.check_in_date,
//         r.rent_per_bed as monthly_rent
//        FROM tenants t
//        -- Join bed_assignments to get current assignment
//        LEFT JOIN bed_assignments ba ON ba.tenant_id = t.id AND ba.is_available = 0
//        -- Join rooms to get rent
//        LEFT JOIN rooms r ON ba.room_id = r.id
//        WHERE t.id = ? AND t.deleted_at IS NULL`,
//       [tenant_id]
//     );

//     if (tenantInfo.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Tenant not found'
//       });
//     }

//     const tenantData = tenantInfo[0];
    
//     console.log('📊 Tenant details loaded:', {
//       tenant_name: tenantData.full_name,
//       property_id: tenantData.property_id,
//       bed_assignment_id: tenantData.bed_assignment_id
//     });

//     // Check lock-in period for vacate_bed request
//     let lockinDetails = null;
//     let noticeDetails = null;
    
//     if (request_type === 'vacate_bed') {
//       // Calculate lock-in period status
//       if (tenantData.check_in_date && tenantData.lockin_period_months) {
//         const checkInDate = new Date(tenantData.check_in_date);
//         const currentDate = new Date();
//         const monthsDiff = (currentDate.getFullYear() - checkInDate.getFullYear()) * 12 + 
//                          (currentDate.getMonth() - checkInDate.getMonth());

//         const lockInEndDate = new Date(checkInDate);
//         lockInEndDate.setMonth(checkInDate.getMonth() + tenantData.lockin_period_months);
        
//         const isInLockinPeriod = monthsDiff < tenantData.lockin_period_months;
//         const remainingMonths = Math.max(0, tenantData.lockin_period_months - monthsDiff);
        
//         // Calculate penalty amount
//         const lockinPenaltyAmount = this.calculatePenaltyAmount(
//           tenantData.lockin_penalty_amount,
//           tenantData.lockin_penalty_type,
//           tenantData.monthly_rent
//         );
        
//         lockinDetails = {
//           isInLockinPeriod,
//           lockinEnds: lockInEndDate,
//           remainingMonths,
//           penaltyAmount: tenantData.lockin_penalty_amount,
//           penaltyType: tenantData.lockin_penalty_type,
//           monthlyRent: tenantData.monthly_rent,
//           calculatedPenaltyAmount: lockinPenaltyAmount,
//           penaltyDescription: this.getPenaltyDescription(
//             tenantData.lockin_penalty_amount,
//             tenantData.lockin_penalty_type,
//             tenantData.monthly_rent
//           )
//         };
        
//         console.log('🔒 Lock-in details:', lockinDetails);
//       }

//       // Notice period details
//       if (tenantData.notice_period_days) {
//         // Calculate penalty amount
//         const noticePenaltyAmount = this.calculatePenaltyAmount(
//           tenantData.notice_penalty_amount,
//           tenantData.notice_penalty_type,
//           tenantData.monthly_rent
//         );
        
//         noticeDetails = {
//           noticePeriodDays: tenantData.notice_period_days,
//           penaltyAmount: tenantData.notice_penalty_amount,
//           penaltyType: tenantData.notice_penalty_type,
//           monthlyRent: tenantData.monthly_rent,
//           calculatedPenaltyAmount: noticePenaltyAmount,
//           penaltyDescription: this.getPenaltyDescription(
//             tenantData.notice_penalty_amount,
//             tenantData.notice_penalty_type,
//             tenantData.monthly_rent
//           ),
//           requiresAgreement: !!tenantData.notice_penalty_amount
//         };
        
//         console.log('📋 Notice details:', noticeDetails);
//       }

//       // Validate penalty agreements if required
//       if (vacate_data) {
//         if (lockinDetails?.isInLockinPeriod && !vacate_data.lockin_penalty_accepted) {
//           return res.status(400).json({
//             success: false,
//             message: 'You must agree to the lock-in period penalty',
//             requires_lockin_agreement: true,
//             lockin_details: lockinDetails
//           });
//         }
        
//         if (noticeDetails?.requiresAgreement && !vacate_data.notice_penalty_accepted) {
//           return res.status(400).json({
//             success: false,
//             message: 'You must agree to the notice period penalty',
//             requires_notice_agreement: true,
//             notice_details: noticeDetails
//           });
//         }
//       }
//     }

//     // Start transaction
//     await db.query('START TRANSACTION');

//     try {
//       // Create tenant_request record with penalty notes
//       let adminNotes = '';
      
//       if (request_type === 'vacate_bed') {
//         if (lockinDetails?.isInLockinPeriod) {
//           adminNotes += `Lock-in Period Active: Ends ${this.formatDate(lockinDetails.lockinEnds)}\n`;
//           adminNotes += `Early Vacate Penalty: ${lockinDetails.penaltyDescription}\n`;
//           adminNotes += `Tenant agreed to penalty: ${vacate_data?.lockin_penalty_accepted ? 'YES' : 'N/A'}\n`;
//         }
        
//         if (noticeDetails) {
//           adminNotes += `Notice Period: ${noticeDetails.noticePeriodDays} days\n`;
//           adminNotes += `Notice Penalty: ${noticeDetails.penaltyDescription}\n`;
//           adminNotes += `Tenant agreed to penalty: ${vacate_data?.notice_penalty_accepted ? 'YES' : 'N/A'}\n`;
//         }
//       }

//       // Create tenant request
//       const [result] = await db.query(
//         `INSERT INTO tenant_requests (
//           tenant_id,
//           property_id,
//           request_type,
//           title,
//           description,
//           priority,
//           status,
//           admin_notes,
//           created_at
//         ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
//         [
//           tenant_id, 
//           tenantData.property_id, 
//           request_type, 
//           title, 
//           description, 
//           priority,
//           adminNotes || null
//         ]
//       );

//       const requestId = result.insertId;
//       console.log(`✅ Tenant request created with ID: ${requestId}`);

//       // ====================================================
//       // 🚨 CRITICAL: CREATE NOTIFICATION FOR ADMIN DASHBOARD
//       // ====================================================
//       console.log('🚨 CREATING NOTIFICATION FOR ADMIN...');
      
//       try {
//         // Format request type for display
//         const requestTypeDisplay = request_type
//           .replace(/_/g, ' ')
//           .split(' ')
//           .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//           .join(' ');
        
//         // Determine notification priority
//         let notificationPriority = 'medium';
//         if (priority === 'urgent' || priority === 'high') {
//           notificationPriority = priority;
//         } else if (request_type === 'complaint' || request_type === 'maintenance') {
//           notificationPriority = 'high';
//         }
        
//         // Create notification data
//         const notificationData = {
//           recipient_id: 1, // Default admin ID for dashboard
//           recipient_type: 'admin',
//           title: `New ${requestTypeDisplay} Request`,
//           message: `"${title}" - Submitted by ${tenantData.full_name}`,
//           notification_type: 'tenant_request',
//           related_entity_type: 'tenant_request',
//           related_entity_id: requestId,
//           priority: notificationPriority,
//           is_read: 0,
//           created_at: new Date()
//         };
        
//         console.log('📨 Creating notification with data:', {
//           title: notificationData.title,
//           message: notificationData.message,
//           request_id: requestId,
//           tenant: tenantData.full_name
//         });
        
//         // Insert notification
//         const [notificationResult] = await db.query(
//           `INSERT INTO notifications (
//             recipient_id,
//             recipient_type,
//             title,
//             message,
//             notification_type,
//             related_entity_type,
//             related_entity_id,
//             priority,
//             is_read,
//             created_at
//           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//           [
//             notificationData.recipient_id,
//             notificationData.recipient_type,
//             notificationData.title,
//             notificationData.message,
//             notificationData.notification_type,
//             notificationData.related_entity_type,
//             notificationData.related_entity_id,
//             notificationData.priority,
//             notificationData.is_read
//           ]
//         );
        
//         console.log(`✅ NOTIFICATION CREATED SUCCESSFULLY! ID: ${notificationResult.insertId}`);
//         console.log(`🔔 Notification should appear in admin dashboard immediately!`);
        
//       } catch (notificationError) {
//         console.error('❌ FAILED TO CREATE NOTIFICATION:', notificationError);
//         console.error('Notification error details:', {
//           message: notificationError.message,
//           sql: notificationError.sql,
//           code: notificationError.code
//         });
//         // Don't fail the entire request if notification fails
//       }

//       // If it's a vacate_bed request, create vacate_bed_request record
//       if (request_type === 'vacate_bed' && vacate_data) {
//         const {
//           primary_reason_id,
//           secondary_reasons = [],
//           overall_rating,
//           food_rating,
//           cleanliness_rating,
//           management_rating,
//           improvement_suggestions,
//           expected_vacate_date,
//           lockin_penalty_accepted = false,
//           notice_penalty_accepted = false
//         } = vacate_data;

//         console.log('📝 Creating vacate_bed_request record with data:', {
//           tenant_id,
//           property_id: tenantData.property_id,
//           bed_id: tenantData.bed_assignment_id,
//           room_id: tenantData.room_id,
//           primary_reason_id,
//           secondary_reasons,
//           overall_rating,
//           food_rating,
//           cleanliness_rating,
//           management_rating,
//           improvement_suggestions,
//           expected_vacate_date,
//           lockin_penalty_accepted,
//           notice_penalty_accepted,
//           tenant_request_id: requestId
//         });

//         await db.query(
//           `INSERT INTO vacate_bed_requests (
//             tenant_id,
//             property_id,
//             bed_id,
//             room_id,
//             primary_reason_id,
//             secondary_reasons,
//             overall_rating,
//             food_rating,
//             cleanliness_rating,
//             management_rating,
//             improvement_suggestions,
//             expected_vacate_date,  
//             lockin_penalty_accepted,
//             notice_penalty_accepted,
//             status,
//             created_at,
//             tenant_request_id
//           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
//           [
//             tenant_id,
//             tenantData.property_id,
//             tenantData.bed_assignment_id,
//             tenantData.room_id,
//             primary_reason_id,
//             secondary_reasons.length > 0 ? JSON.stringify(secondary_reasons) : null,
//             overall_rating,
//             food_rating,
//             cleanliness_rating,
//             management_rating,
//             improvement_suggestions,
//             expected_vacate_date || null,  
//             lockin_penalty_accepted ? 1 : 0,
//             notice_penalty_accepted ? 1 : 0,
//             requestId
//           ]
//         );

//         console.log('✅ vacate_bed_request record created successfully');
//       }

//       await db.query('COMMIT');

//       res.json({
//         success: true,
//         message: 'Request created successfully',
//         request_id: requestId,
//         debug: {
//           notification_created: true,
//           tenant_name: tenantData.full_name,
//           request_type: request_type,
//           timestamp: new Date().toISOString()
//         }
//       });

//     } catch (error) {
//       await db.query('ROLLBACK');
//       console.error('❌ Transaction failed:', error);
//       throw error;
//     }

//   } catch (err) {
//     console.error('🔥 Create tenant request error:', err);
//     res.status(500).json({
//       success: false,
//       message: err.message || 'Internal server error'
//     });
//   }
// }


async createRequest(req, res) {
  console.log('🎯 createRequest called with FULL body:', JSON.stringify(req.body, null, 2));
  try {
    const tenant_id = req.user?.id;
    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { 
      request_type, 
      title, 
      description, 
      priority = 'medium',
      vacate_data,
      change_bed_data,
      maintenance_data
    } = req.body;

    // Validate required fields
    if (!title || !description || !request_type) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and request type are required'
      });
    }

    // 🚨 CRITICAL: CHECK FOR EXISTING PENDING VACATE REQUESTS
    if (request_type === 'vacate_bed') {
      console.log('🔍 Checking for existing vacate_bed requests...');
      
      const [existingRequests] = await db.query(
        `SELECT tr.id, tr.status, tr.title, tr.created_at,
                vbr.id as vacate_request_id,
                vbr.expected_vacate_date,
                vbr.status as vacate_status
         FROM tenant_requests tr
         LEFT JOIN vacate_bed_requests vbr ON tr.id = vbr.tenant_request_id
         WHERE tr.tenant_id = ? 
           AND tr.request_type = 'vacate_bed'
           AND tr.status IN ('pending', 'in_progress', 'approved')
           AND (vbr.status IS NULL OR vbr.status IN ('pending', 'in_progress', 'approved'))`,
        [tenant_id]
      );

      console.log('📋 Found existing vacate requests:', existingRequests.length);

      // if (existingRequests.length > 0) {
      //   const existingRequest = existingRequests[0];
      //   return res.status(400).json({
      //     success: false,
      //     message: 'You already have a pending or active vacate request.',
      //     code: 'DUPLICATE_VACATE_REQUEST',
      //     data: {
      //       existing_request_id: existingRequest.id,
      //       existing_vacate_request_id: existingRequest.vacate_request_id,
      //       status: existingRequest.status || existingRequest.vacate_status,
      //       title: existingRequest.title,
      //       created_at: existingRequest.created_at,
      //       expected_vacate_date: existingRequest.expected_vacate_date
      //     },
      //     debug: {
      //       message: 'Tenant cannot create multiple vacate requests simultaneously',
      //       allowed_statuses: ['cancelled', 'rejected', 'completed']
      //     }
      //   });
      // }
    }

    // Get tenant's property and bed info with lock-in details
    const [tenantInfo] = await db.query(
      `SELECT 
        t.property_id, 
        t.full_name,
        -- Get bed assignment details
        ba.id as bed_assignment_id,
        ba.room_id,
        ba.bed_number,
        t.lockin_period_months,
        t.lockin_penalty_amount,
        t.lockin_penalty_type,
        t.notice_period_days,
        t.notice_penalty_amount,
        t.notice_penalty_type,
        t.check_in_date,
        r.rent_per_bed as monthly_rent
       FROM tenants t
       -- Join bed_assignments to get current assignment
       LEFT JOIN bed_assignments ba ON ba.tenant_id = t.id AND ba.is_available = 0
       -- Join rooms to get rent
       LEFT JOIN rooms r ON ba.room_id = r.id
       WHERE t.id = ? AND t.deleted_at IS NULL`,
      [tenant_id]
    );

    if (tenantInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const tenantData = tenantInfo[0];
    
    console.log('📊 Tenant details loaded:', {
      tenant_name: tenantData.full_name,
      property_id: tenantData.property_id,
      bed_assignment_id: tenantData.bed_assignment_id,
      room_id: tenantData.room_id,
      bed_number: tenantData.bed_number
    });

    // Check lock-in period for vacate_bed request
    let lockinDetails = null;
    let noticeDetails = null;
    
    if (request_type === 'vacate_bed') {
      // Calculate lock-in period status
      if (tenantData.check_in_date && tenantData.lockin_period_months) {
        const checkInDate = new Date(tenantData.check_in_date);
        const currentDate = new Date();
        const monthsDiff = (currentDate.getFullYear() - checkInDate.getFullYear()) * 12 + 
                         (currentDate.getMonth() - checkInDate.getMonth());

        const lockInEndDate = new Date(checkInDate);
        lockInEndDate.setMonth(checkInDate.getMonth() + tenantData.lockin_period_months);
        
        const isInLockinPeriod = monthsDiff < tenantData.lockin_period_months;
        const remainingMonths = Math.max(0, tenantData.lockin_period_months - monthsDiff);
        
        // Calculate penalty amount
        const lockinPenaltyAmount = this.calculatePenaltyAmount(
          tenantData.lockin_penalty_amount,
          tenantData.lockin_penalty_type,
          tenantData.security_deposit
        );
        
        lockinDetails = {
          isInLockinPeriod,
          lockinEnds: lockInEndDate,
          remainingMonths,
          penaltyAmount: tenantData.lockin_penalty_amount,
          penaltyType: tenantData.lockin_penalty_type,
          calculatedPenaltyAmount: lockinPenaltyAmount,
          penaltyDescription: this.getPenaltyDescription(
            tenantData.lockin_penalty_amount,
            tenantData.lockin_penalty_type,
            tenantData.security_deposit
          )
        };
        
        console.log('🔒 Lock-in details:', lockinDetails);
      }

      // Notice period details
      if (tenantData.notice_period_days) {
        // Calculate penalty amount
        const noticePenaltyAmount = this.calculatePenaltyAmount(
          tenantData.notice_penalty_amount,
          tenantData.notice_penalty_type,
          tenantData.security_deposit
        );
        
        noticeDetails = {
          noticePeriodDays: tenantData.notice_period_days,
          penaltyAmount: tenantData.notice_penalty_amount,
          penaltyType: tenantData.notice_penalty_type,
          calculatedPenaltyAmount: noticePenaltyAmount,
          penaltyDescription: this.getPenaltyDescription(
            tenantData.notice_penalty_amount,
            tenantData.notice_penalty_type,
            tenantData.security_deposit
          ),
          requiresAgreement: !!tenantData.notice_penalty_amount
        };
        
        console.log('📋 Notice details:', noticeDetails);
      }

      // Validate penalty agreements if required
      if (vacate_data) {
        if (lockinDetails?.isInLockinPeriod && !vacate_data.lockin_penalty_accepted) {
          return res.status(400).json({
            success: false,
            message: 'You must agree to the lock-in period penalty',
            requires_lockin_agreement: true,
            lockin_details: lockinDetails
          });
        }
        
        if (noticeDetails?.requiresAgreement && !vacate_data.notice_penalty_accepted) {
          return res.status(400).json({
            success: false,
            message: 'You must agree to the notice period penalty',
            requires_notice_agreement: true,
            notice_details: noticeDetails
          });
        }
      }
    }

    // Validate change bed request data
    if (request_type === 'change_bed' && change_bed_data) {
        console.log('✅ change_bed_data is already an object:', typeof change_bed_data, change_bed_data);

      // Validate required fields for change bed
      const requiredFields = [
        'preferred_property_id',
        'preferred_room_id',
        'change_reason_id',
        'shifting_date'
      ];
      
      const missingFields = requiredFields.filter(field => !change_bed_data[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields for change bed: ${missingFields.join(', ')}`
        });
      }
      
      // Validate shifting date
      const shiftingDate = new Date(change_bed_data.shifting_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (shiftingDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Shifting date cannot be in the past'
        });
      }
    }

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Create tenant_request record with penalty notes
      let adminNotes = '';
      
      if (request_type === 'vacate_bed') {
        if (lockinDetails?.isInLockinPeriod) {
          adminNotes += `Lock-in Period Active: Ends ${this.formatDate(lockinDetails.lockinEnds)}\n`;
          adminNotes += `Early Vacate Penalty: ${lockinDetails.penaltyDescription}\n`;
          adminNotes += `Tenant agreed to penalty: ${vacate_data?.lockin_penalty_accepted ? 'YES' : 'N/A'}\n`;
        }
        
        if (noticeDetails) {
          adminNotes += `Notice Period: ${noticeDetails.noticePeriodDays} days\n`;
          adminNotes += `Notice Penalty: ${noticeDetails.penaltyDescription}\n`;
          adminNotes += `Tenant agreed to penalty: ${vacate_data?.notice_penalty_accepted ? 'YES' : 'N/A'}\n`;
        }
      }

      // Create tenant request
      const [result] = await db.query(
        `INSERT INTO tenant_requests (
          tenant_id,
          property_id,
          request_type,
          title,
          description,
          priority,
          status,
          admin_notes,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
        [
          tenant_id, 
          tenantData.property_id, 
          request_type, 
          title, 
          description, 
          priority,
          adminNotes || null
        ]
      );

      const requestId = result.insertId;
      console.log(`✅ Tenant request created with ID: ${requestId}`);

      // ====================================================
      // 🚨 LEAVE REQUEST VALIDATION AND CREATION
      // ====================================================
      if (request_type === 'leave') {
        console.log('🏖️ Creating leave request...');
        
        // Validate leave request data
        const leaveData = req.body.leave_data || {};
        
        console.log('📋 Leave data received:', leaveData);

        // Validate required fields for leave
        const requiredLeaveFields = [
          'leave_type',
          'leave_start_date',
          'leave_end_date',
          'total_days'
        ];
        
        const missingLeaveFields = requiredLeaveFields.filter(field => !leaveData[field]);
        
        if (missingLeaveFields.length > 0) {
          await db.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Missing required fields for leave request: ${missingLeaveFields.join(', ')}`
          });
        }

        // Validate dates
        const startDate = new Date(leaveData.leave_start_date);
        const endDate = new Date(leaveData.leave_end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('🔍 DEBUG Date Values:', {
          startDate: startDate,
          endDate: endDate,
          today: today,
          startDateString: leaveData.leave_start_date,
          todayString: new Date().toISOString().split('T')[0],
          startDateTimestamp: startDate.getTime(),
          todayTimestamp: today.getTime(),
          isPast: startDate < today
        });

        if (startDate < today) {
          await db.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'Leave start date cannot be in the past'
          });
        }

        if (endDate < startDate) {
          await db.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'Leave end date cannot be before start date'
          });
        }

        // Validate total days
        const calculatedDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        if (parseInt(leaveData.total_days) !== calculatedDays) {
          await db.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Total days (${leaveData.total_days}) doesn't match date range (${calculatedDays} days)`
          });
        }

        // Validate maximum leave days (e.g., 30 days)
        const maxLeaveDays = 30;
        if (parseInt(leaveData.total_days) > maxLeaveDays) {
          await db.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Leave cannot exceed ${maxLeaveDays} days`
          });
        }

        try {
          // Create leave request details
          const [leaveResult] = await db.query(
            `INSERT INTO leave_request_details (
              request_id,
              leave_type,
              leave_start_date,
              leave_end_date,
              total_days,
              contact_address_during_leave,
              emergency_contact_number,
              room_locked,
              keys_submitted,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              requestId,
              leaveData.leave_type,
              leaveData.leave_start_date,
              leaveData.leave_end_date,
              leaveData.total_days,
              leaveData.contact_address_during_leave || null,
              leaveData.emergency_contact_number || null,
              leaveData.room_locked ? 1 : 0,
              leaveData.keys_submitted ? 1 : 0
            ]
          );

          console.log(`✅ Leave request details created with ID: ${leaveResult.insertId}`);

        } catch (leaveError) {
          console.error('❌ Error creating leave request details:', leaveError);
          await db.query('ROLLBACK');
          throw leaveError;
        }
      }

      // ====================================================
      // 🚨 COMPLAINT REQUEST CREATION
      // ====================================================
      if (request_type === 'complaint') {
        console.log('📢 Creating complaint request...');
        
        const complaintData = req.body.complaint_data || {};
        
        console.log('📋 Complaint data received:', complaintData);
        
        // Validate required fields for complaint
        if (!complaintData.category_master_type_id) {
          await db.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'Complaint category is required'
          });
        }
        
        // If custom reason is provided, reason_master_value_id might be null
        // Otherwise, validate reason_master_value_id
        if (!complaintData.custom_reason && !complaintData.reason_master_value_id) {
          await db.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'Please select a reason or provide a custom reason'
          });
        }
        
        try {
          // Create complaint request details
          const [complaintResult] = await db.query(
            `INSERT INTO complaint_request_details (
              request_id,
              category_master_type_id,
              reason_master_value_id,
              custom_reason,
              created_at
            ) VALUES (?, ?, ?, ?, NOW())`,
            [
              requestId,
              complaintData.category_master_type_id,
              complaintData.reason_master_value_id || null,
              complaintData.custom_reason || null
            ]
          );

          console.log(`✅ Complaint request details created with ID: ${complaintResult.insertId}`);

        } catch (complaintError) {
          console.error('❌ Error creating complaint request details:', complaintError);
          await db.query('ROLLBACK');
          throw complaintError;
        }
      }

      // ====================================================
      // 🚨 CREATE CHANGE BED REQUEST
      // ====================================================
      if (request_type === 'change_bed' && change_bed_data) {
        console.log('🛏️ Creating change bed request...');
        console.log('📋 RAW change_bed_data:', change_bed_data);
        
        // Extract data safely - NO preferred_bed_number
        const {
          preferred_property_id,
          preferred_room_id,
          change_reason_id,
          shifting_date,
          notes = '',
          current_property_id,
          current_room_id,
          current_bed_number
        } = change_bed_data;
        
        console.log('📊 Extracted data (without preferred_bed_number):', {
          preferred_property_id,
          preferred_room_id,
          change_reason_id,
          shifting_date,
          notes,
          current_property_id,
          current_room_id,
          current_bed_number
        });
        
        try {
          // Get current room info from tenant's bed assignment
          const [currentRoom] = await db.query(
            `SELECT 
              r.property_id,
              ba.room_id,
              ba.bed_number
             FROM bed_assignments ba
             JOIN rooms r ON ba.room_id = r.id
             WHERE ba.tenant_id = ? AND ba.is_available = 0
             LIMIT 1`,
            [tenant_id]
          );

          let currentRoomInfo = currentRoom[0] || {};
          console.log('📍 Current room info from DB:', currentRoomInfo);

          // If no current assignment, use values from frontend or defaults
          if (!currentRoomInfo.property_id || !currentRoomInfo.room_id) {
            console.warn('⚠️ No current room assignment found in DB');
            
            // Use values from frontend if provided
            if (current_property_id && current_room_id) {
              currentRoomInfo = {
                property_id: current_property_id,
                room_id: current_room_id,
                bed_number: current_bed_number || 1
              };
              console.log('📍 Using frontend current room info:', currentRoomInfo);
            } else {
              // Use tenant's property_id as fallback
              currentRoomInfo = {
                property_id: tenantData.property_id || 1,
                room_id: 1,
                bed_number: 1
              };
              console.log('📍 Using fallback current room info:', currentRoomInfo);
            }
          }

          console.log('📝 Final data for insertion (CORRECTED):', {
            tenant_request_id: requestId,
            current_property_id: currentRoomInfo.property_id,
            current_room_id: currentRoomInfo.room_id,
            current_bed_number: currentRoomInfo.bed_number,
            preferred_property_id: preferred_property_id,
            preferred_room_id: preferred_room_id,
            change_reason_id: change_reason_id,
            shifting_date: shifting_date,
            notes: notes
          });

          // CORRECT INSERT QUERY - WITHOUT preferred_bed_number
          const [changeBedResult] = await db.query(
            `INSERT INTO change_bed_requests (
              tenant_request_id,
              current_property_id,
              current_room_id,
              current_bed_number,
              preferred_property_id,
              preferred_room_id,
              change_reason_id,
              shifting_date,
              notes,
              request_status,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
              requestId,
              currentRoomInfo.property_id,
              currentRoomInfo.room_id,
              currentRoomInfo.bed_number || 1,
              preferred_property_id,
              preferred_room_id,
              change_reason_id,
              shifting_date,
              notes
            ]
          );

          console.log(`✅ SUCCESS: Change bed request created with ID: ${changeBedResult.insertId}`);
          
        } catch (changeBedError) {
          console.error('❌ CRITICAL ERROR creating change bed request:', changeBedError);
          console.error('❌ Error message:', changeBedError.message);
          console.error('❌ Error code:', changeBedError.code);
          console.error('❌ Error sql:', changeBedError.sql);
          
          // Emergency insert with required fields only
          try {
            console.log('🔄 Trying emergency insert...');
            const [emergencyResult] = await db.query(
              `INSERT INTO change_bed_requests (
                tenant_request_id,
                preferred_property_id,
                preferred_room_id,
                change_reason_id, // REQUIRED FIELD
                request_status,
                created_at
              ) VALUES (?, ?, ?, ?, 'pending', NOW())`,
              [
                requestId,
                preferred_property_id || 1,
                preferred_room_id || 1,
                change_reason_id || 1 // REQUIRED - use default if missing
              ]
            );
            console.log(`⚠️ Emergency insert created with ID: ${emergencyResult.insertId}`);
          } catch (emergencyError) {
            console.error('❌ Emergency insert also failed:', emergencyError);
          }
        }
      }

      // If it's a vacate_bed request, create vacate_bed_request record
      if (request_type === 'vacate_bed' && vacate_data) {
        const {
          primary_reason_id,
          secondary_reasons = [],
          overall_rating,
          food_rating,
          cleanliness_rating,
          management_rating,
          improvement_suggestions,
          expected_vacate_date,
          lockin_penalty_accepted = false,
          notice_penalty_accepted = false
        } = vacate_data;

        console.log('📝 Creating vacate_bed_request record with data:', {
          tenant_id,
          property_id: tenantData.property_id,
          bed_id: tenantData.bed_assignment_id,
          room_id: tenantData.room_id,
          primary_reason_id,
          secondary_reasons,
          overall_rating,
          food_rating,
          cleanliness_rating,
          management_rating,
          improvement_suggestions,
          expected_vacate_date,
          lockin_penalty_accepted,
          notice_penalty_accepted,
          tenant_request_id: requestId
        });

        await db.query(
          `INSERT INTO vacate_bed_requests (
            tenant_id,
            property_id,
            bed_id,
            room_id,
            primary_reason_id,
            secondary_reasons,
            overall_rating,
            food_rating,
            cleanliness_rating,
            management_rating,
            improvement_suggestions,
            expected_vacate_date,  
            lockin_penalty_accepted,
            notice_penalty_accepted,
            status,
            created_at,
            tenant_request_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
          [
            tenant_id,
            tenantData.property_id,
            tenantData.bed_assignment_id,
            tenantData.room_id,
            primary_reason_id,
            secondary_reasons.length > 0 ? JSON.stringify(secondary_reasons) : null,
            overall_rating,
            food_rating,
            cleanliness_rating,
            management_rating,
            improvement_suggestions,
            expected_vacate_date || null,  
            lockin_penalty_accepted ? 1 : 0,
            notice_penalty_accepted ? 1 : 0,
            requestId
          ]
        );

        console.log('✅ vacate_bed_request record created successfully');
      }

      // ====================================================
      // 🚨 MAINTENANCE REQUEST CREATION
      // ====================================================
      if (request_type === 'maintenance' && maintenance_data) {
        console.log('🔧 Creating maintenance request...');
        
        console.log('📋 Maintenance data received:', maintenance_data);
        
        // Validate required fields for maintenance
        if (!maintenance_data.issue_category || !maintenance_data.location) {
          await db.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'Issue category and location are required for maintenance requests'
          });
        }
        
        try {
          // Create maintenance request details
          const [maintenanceResult] = await db.query(
            `INSERT INTO maintenance_request_details (
              request_id,
              issue_category,
              location,
              preferred_visit_time,
              access_permission,
              created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              requestId,
              maintenance_data.issue_category,
              maintenance_data.location,
              maintenance_data.preferred_visit_time || 'anytime',
              maintenance_data.access_permission ? 1 : 0
            ]
          );

          console.log(`✅ Maintenance request details created with ID: ${maintenanceResult.insertId}`);

        } catch (maintenanceError) {
          console.error('❌ Error creating maintenance request details:', maintenanceError);
          await db.query('ROLLBACK');
          throw maintenanceError;
        }
      }

      // ====================================================
      // 🚨 CRITICAL: CREATE SINGLE NOTIFICATION BASED ON REQUEST TYPE
      // ====================================================
      console.log('🚨 CREATING SINGLE NOTIFICATION FOR ADMIN...');
      
      try {
        // Default values for notification
        let notificationTitle = 'New Request';
        let notificationMessage = `"${title}" - Submitted by ${tenantData.full_name}`;
        let notificationPriority = priority === 'urgent' || priority === 'high' ? priority : 'medium';
        let notificationType = 'tenant_request';
        let relatedEntityType = 'tenant_request';
        
        // Customize notification based on request type
        switch (request_type) {
          case 'complaint':
            notificationTitle = 'New Complaint';
            // Get complaint details for message
            const complaintData = req.body.complaint_data || {};
            let complaintReason = 'No reason specified';
            
            if (complaintData.reason_master_value_id) {
              const [reasonInfo] = await db.query(
                `SELECT value FROM master_values WHERE id = ?`,
                [complaintData.reason_master_value_id]
              );
              if (reasonInfo.length > 0) {
                complaintReason = reasonInfo[0].value;
              }
            } else if (complaintData.custom_reason) {
              complaintReason = complaintData.custom_reason.substring(0, 50) + 
                               (complaintData.custom_reason.length > 50 ? '...' : '');
            }
            
            // Get category name
            let categoryName = 'Unknown';
            if (complaintData.category_master_type_id) {
              const [categoryInfo] = await db.query(
                `SELECT name FROM master_types WHERE id = ?`,
                [complaintData.category_master_type_id]
              );
              if (categoryInfo.length > 0) {
                categoryName = categoryInfo[0].name;
              }
            }
            
            notificationMessage = `${tenantData.full_name} submitted ${categoryName} complaint: ${complaintReason}`;
            notificationPriority = 'high';
            relatedEntityType = 'complaint_request';
            break;
            
          case 'maintenance':
            notificationTitle = 'New Maintenance Request';
            const maintenanceData = req.body.maintenance_data || {};
            const issueCategory = maintenanceData.issue_category 
              ? maintenanceData.issue_category.replace(/_/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
              : 'Unknown';
            
            notificationMessage = `${tenantData.full_name} reported ${issueCategory} issue in ${maintenanceData.location || 'room'}. Priority: ${priority}`;
            notificationPriority = 'high';
            relatedEntityType = 'maintenance_request';
            break;
            
          case 'leave':
            notificationTitle = 'New Leave Application';
            const leaveData = req.body.leave_data || {};
            const leaveTypeDisplay = leaveData.leave_type
              ? leaveData.leave_type.replace(/_/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
              : 'Leave';
            
            notificationMessage = `${tenantData.full_name} has applied for ${leaveTypeDisplay} (${leaveData.total_days || 1} days)`;
            relatedEntityType = 'leave_request';
            break;
            
          case 'vacate_bed':
            notificationTitle = 'New Vacate Request';
            notificationMessage = `${tenantData.full_name} submitted vacate bed request`;
            notificationPriority = 'high';
            relatedEntityType = 'vacate_request';
            break;
            
          case 'change_bed':
            notificationTitle = 'New Change Bed Request';
            const changeData = req.body.change_bed_data || {};
            let changeReason = 'Not specified';
            
            if (changeData.change_reason_id) {
              const [reasonInfo] = await db.query(
                `SELECT value FROM master_values WHERE id = ?`,
                [changeData.change_reason_id]
              );
              if (reasonInfo.length > 0) {
                changeReason = reasonInfo[0].value;
              }
            }
            
            notificationMessage = `${tenantData.full_name} wants to change bed. Reason: ${changeReason}`;
            relatedEntityType = 'change_bed_request';
            break;
            
          case 'receipt':
            notificationTitle = 'New Receipt Request';
            notificationMessage = `${tenantData.full_name} requested a receipt`;
            relatedEntityType = 'receipt_request';
            break;
            
          default:
            // For general requests, use formatted request type
            const requestTypeDisplay = request_type
              .replace(/_/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            notificationTitle = `New ${requestTypeDisplay} Request`;
            notificationMessage = `"${title}" - Submitted by ${tenantData.full_name}`;
            break;
        }
        
        console.log('📨 Creating notification with data:', {
          title: notificationTitle,
          message: notificationMessage,
          request_id: requestId,
          tenant: tenantData.full_name,
          type: request_type
        });
        
        // Insert SINGLE notification
        const [notificationResult] = await db.query(
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
            1, // Default admin ID
            'admin',
            notificationTitle,
            notificationMessage,
            notificationType,
            relatedEntityType,
            requestId,
            notificationPriority,
            0 // is_read = false
          ]
        );
        
        console.log(`✅ SINGLE NOTIFICATION CREATED SUCCESSFULLY! ID: ${notificationResult.insertId}`);
        console.log(`🔔 ONE notification created for request type: ${request_type}`);
        
      } catch (notificationError) {
        console.error('❌ FAILED TO CREATE NOTIFICATION:', notificationError);
        console.error('Notification error details:', {
          message: notificationError.message,
          sql: notificationError.sql,
          code: notificationError.code
        });
        // Don't fail the entire request if notification fails
      }

      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'Request created successfully',
        request_id: requestId,
        debug: {
          notification_created: true,
          tenant_name: tenantData.full_name,
          request_type: request_type,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Transaction failed:', error);
      throw error;
    }

  } catch (err) {
    console.error('🔥 Create tenant request error:', err);
    
    // Handle duplicate request error specifically
    if (err.message?.includes('DUPLICATE_VACATE_REQUEST') || err.code === 'DUPLICATE_VACATE_REQUEST') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending vacate request.',
        code: 'DUPLICATE_VACATE_REQUEST',
        debug: {
          existing_request: err.existing_request_id
        }
      });
    }

    // handle duplicate change bed request error specifically
    if (err.message?.includes('DUPLICATE_CHANGE_BED_REQUEST') || err.code === 'DUPLICATE_CHANGE_BED_REQUEST') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending change bed request.',
        code: 'DUPLICATE_CHANGE_BED_REQUEST',
        debug: {
          existing_request: err.existing_request_id
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
}

// async createRequest(req, res) {
//   console.log('🎯 createRequest called with FULL body:', JSON.stringify(req.body, null, 2));
//   try {
//     const tenant_id = req.user?.id;
//     if (!tenant_id) {
//       return res.status(401).json({
//         success: false,
//         message: 'Authentication required'
//       });
//     }

//     const { 
//       request_type, 
//       title, 
//       description, 
//       priority = 'medium',
//       vacate_data,
//       change_bed_data ,
//       maintenance_data
//     } = req.body;

//     // Validate required fields
//     if (!title || !description || !request_type) {
//       return res.status(400).json({
//         success: false,
//         message: 'Title, description, and request type are required'
//       });
//     }

//     // 🚨 CRITICAL: CHECK FOR EXISTING PENDING VACATE REQUESTS
//     if (request_type === 'vacate_bed') {
//       console.log('🔍 Checking for existing vacate_bed requests...');
      
//       const [existingRequests] = await db.query(
//         `SELECT tr.id, tr.status, tr.title, tr.created_at,
//                 vbr.id as vacate_request_id,
//                 vbr.expected_vacate_date,
//                 vbr.status as vacate_status
//          FROM tenant_requests tr
//          LEFT JOIN vacate_bed_requests vbr ON tr.id = vbr.tenant_request_id
//          WHERE tr.tenant_id = ? 
//            AND tr.request_type = 'vacate_bed'
//            AND tr.status IN ('pending', 'in_progress', 'approved')
//            AND (vbr.status IS NULL OR vbr.status IN ('pending', 'in_progress', 'approved'))`,
//         [tenant_id]
//       );

//       console.log('📋 Found existing vacate requests:', existingRequests.length);

//       // if (existingRequests.length > 0) {
//       //   const existingRequest = existingRequests[0];
//       //   return res.status(400).json({
//       //     success: false,
//       //     message: 'You already have a pending or active vacate request.',
//       //     code: 'DUPLICATE_VACATE_REQUEST',
//       //     data: {
//       //       existing_request_id: existingRequest.id,
//       //       existing_vacate_request_id: existingRequest.vacate_request_id,
//       //       status: existingRequest.status || existingRequest.vacate_status,
//       //       title: existingRequest.title,
//       //       created_at: existingRequest.created_at,
//       //       expected_vacate_date: existingRequest.expected_vacate_date
//       //     },
//       //     debug: {
//       //       message: 'Tenant cannot create multiple vacate requests simultaneously',
//       //       allowed_statuses: ['cancelled', 'rejected', 'completed']
//       //     }
//       //   });
//       // }
//     }

//     // Get tenant's property and bed info with lock-in details
//     const [tenantInfo] = await db.query(
//       `SELECT 
//         t.property_id, 
//         t.full_name,
//         -- Get bed assignment details
//         ba.id as bed_assignment_id,
//         ba.room_id,
//         ba.bed_number,
//         t.lockin_period_months,
//         t.lockin_penalty_amount,
//         t.lockin_penalty_type,
//         t.notice_period_days,
//         t.notice_penalty_amount,
//         t.notice_penalty_type,
//         t.check_in_date,
//         r.rent_per_bed as monthly_rent
//        FROM tenants t
//        -- Join bed_assignments to get current assignment
//        LEFT JOIN bed_assignments ba ON ba.tenant_id = t.id AND ba.is_available = 0
//        -- Join rooms to get rent
//        LEFT JOIN rooms r ON ba.room_id = r.id
//        WHERE t.id = ? AND t.deleted_at IS NULL`,
//       [tenant_id]
//     );

//     if (tenantInfo.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Tenant not found'
//       });
//     }

//     const tenantData = tenantInfo[0];
    
//     console.log('📊 Tenant details loaded:', {
//       tenant_name: tenantData.full_name,
//       property_id: tenantData.property_id,
//       bed_assignment_id: tenantData.bed_assignment_id,
//       room_id: tenantData.room_id,
//       bed_number: tenantData.bed_number
//     });

//     // Check lock-in period for vacate_bed request
//     let lockinDetails = null;
//     let noticeDetails = null;
    
//     if (request_type === 'vacate_bed') {
//       // Calculate lock-in period status
//       if (tenantData.check_in_date && tenantData.lockin_period_months) {
//         const checkInDate = new Date(tenantData.check_in_date);
//         const currentDate = new Date();
//         const monthsDiff = (currentDate.getFullYear() - checkInDate.getFullYear()) * 12 + 
//                          (currentDate.getMonth() - checkInDate.getMonth());

//         const lockInEndDate = new Date(checkInDate);
//         lockInEndDate.setMonth(checkInDate.getMonth() + tenantData.lockin_period_months);
        
//         const isInLockinPeriod = monthsDiff < tenantData.lockin_period_months;
//         const remainingMonths = Math.max(0, tenantData.lockin_period_months - monthsDiff);
        
//         // Calculate penalty amount
//         const lockinPenaltyAmount = this.calculatePenaltyAmount(
//           tenantData.lockin_penalty_amount,
//           tenantData.lockin_penalty_type,
//           tenantData.security_deposit
//         );
        
//         lockinDetails = {
//           isInLockinPeriod,
//           lockinEnds: lockInEndDate,
//           remainingMonths,
//           penaltyAmount: tenantData.lockin_penalty_amount,
//           penaltyType: tenantData.lockin_penalty_type,
//           calculatedPenaltyAmount: lockinPenaltyAmount,
//           penaltyDescription: this.getPenaltyDescription(
//             tenantData.lockin_penalty_amount,
//             tenantData.lockin_penalty_type,
//             tenantData.security_deposit
//           )
//         };
        
//         console.log('🔒 Lock-in details:', lockinDetails);
//       }

//       // Notice period details
//       if (tenantData.notice_period_days) {
//         // Calculate penalty amount
//         const noticePenaltyAmount = this.calculatePenaltyAmount(
//           tenantData.notice_penalty_amount,
//           tenantData.notice_penalty_type,
//           tenantData.security_deposit
//         );
        
//         noticeDetails = {
//           noticePeriodDays: tenantData.notice_period_days,
//           penaltyAmount: tenantData.notice_penalty_amount,
//           penaltyType: tenantData.notice_penalty_type,
//           calculatedPenaltyAmount: noticePenaltyAmount,
//           penaltyDescription: this.getPenaltyDescription(
//             tenantData.notice_penalty_amount,
//             tenantData.notice_penalty_type,
//             tenantData.security_deposit
//           ),
//           requiresAgreement: !!tenantData.notice_penalty_amount
//         };
        
//         console.log('📋 Notice details:', noticeDetails);
//       }

//       // Validate penalty agreements if required
//       if (vacate_data) {
//         if (lockinDetails?.isInLockinPeriod && !vacate_data.lockin_penalty_accepted) {
//           return res.status(400).json({
//             success: false,
//             message: 'You must agree to the lock-in period penalty',
//             requires_lockin_agreement: true,
//             lockin_details: lockinDetails
//           });
//         }
        
//         if (noticeDetails?.requiresAgreement && !vacate_data.notice_penalty_accepted) {
//           return res.status(400).json({
//             success: false,
//             message: 'You must agree to the notice period penalty',
//             requires_notice_agreement: true,
//             notice_details: noticeDetails
//           });
//         }
//       }
//     }

//     // Validate change bed request data
//     if (request_type === 'change_bed' && change_bed_data) {
//         console.log('✅ change_bed_data is already an object:', typeof change_bed_data, change_bed_data);

//       // Validate required fields for change bed
//       const requiredFields = [
//         'preferred_property_id',
//         'preferred_room_id',
//         'change_reason_id',
//         'shifting_date'
//       ];
      
//       const missingFields = requiredFields.filter(field => !change_bed_data[field]);
      
//       if (missingFields.length > 0) {
//         return res.status(400).json({
//           success: false,
//           message: `Missing required fields for change bed: ${missingFields.join(', ')}`
//         });
//       }
      
//       // Validate shifting date
//       const shiftingDate = new Date(change_bed_data.shifting_date);
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
      
//       if (shiftingDate < today) {
//         return res.status(400).json({
//           success: false,
//           message: 'Shifting date cannot be in the past'
//         });
//       }
//     }




//     // Start transaction
//     await db.query('START TRANSACTION');

//     try {
//       // Create tenant_request record with penalty notes
//       let adminNotes = '';
      
//       if (request_type === 'vacate_bed') {
//         if (lockinDetails?.isInLockinPeriod) {
//           adminNotes += `Lock-in Period Active: Ends ${this.formatDate(lockinDetails.lockinEnds)}\n`;
//           adminNotes += `Early Vacate Penalty: ${lockinDetails.penaltyDescription}\n`;
//           adminNotes += `Tenant agreed to penalty: ${vacate_data?.lockin_penalty_accepted ? 'YES' : 'N/A'}\n`;
//         }
        
//         if (noticeDetails) {
//           adminNotes += `Notice Period: ${noticeDetails.noticePeriodDays} days\n`;
//           adminNotes += `Notice Penalty: ${noticeDetails.penaltyDescription}\n`;
//           adminNotes += `Tenant agreed to penalty: ${vacate_data?.notice_penalty_accepted ? 'YES' : 'N/A'}\n`;
//         }
//       }

//       // Create tenant request
//       const [result] = await db.query(
//         `INSERT INTO tenant_requests (
//           tenant_id,
//           property_id,
//           request_type,
//           title,
//           description,
//           priority,
//           status,
//           admin_notes,
//           created_at
//         ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
//         [
//           tenant_id, 
//           tenantData.property_id, 
//           request_type, 
//           title, 
//           description, 
//           priority,
//           adminNotes || null
//         ]
//       );

//       const requestId = result.insertId;
//       console.log(`✅ Tenant request created with ID: ${requestId}`);

//       // ====================================================
//   // 🚨 LEAVE REQUEST VALIDATION AND CREATION - MOVED HERE
//   // ====================================================
//   if (request_type === 'leave') {
//     console.log('🏖️ Creating leave request...');
    
//     // Validate leave request data
//     const leaveData = req.body.leave_data || {};
    
//     console.log('📋 Leave data received:', leaveData);

//     // Validate required fields for leave
//     const requiredLeaveFields = [
//       'leave_type',
//       'leave_start_date',
//       'leave_end_date',
//       'total_days'
//     ];
    
//     const missingLeaveFields = requiredLeaveFields.filter(field => !leaveData[field]);
    
//     if (missingLeaveFields.length > 0) {
//       await db.query('ROLLBACK');
//       return res.status(400).json({
//         success: false,
//         message: `Missing required fields for leave request: ${missingLeaveFields.join(', ')}`
//       });
//     }

//     // Validate dates
//     const startDate = new Date(leaveData.leave_start_date);
//     const endDate = new Date(leaveData.leave_end_date);
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     console.log('🔍 DEBUG Date Values:', {
//   startDate: startDate,
//   endDate: endDate,
//   today: today,
//   startDateString: leaveData.leave_start_date,
//   todayString: new Date().toISOString().split('T')[0],
//   startDateTimestamp: startDate.getTime(),
//   todayTimestamp: today.getTime(),
//   isPast: startDate < today
// });

//     if (startDate < today) {
//       await db.query('ROLLBACK');
//       return res.status(400).json({
//         success: false,
//         message: 'Leave start date cannot be in the past'
//       });
//     }

//     if (endDate < startDate) {
//       await db.query('ROLLBACK');
//       return res.status(400).json({
//         success: false,
//         message: 'Leave end date cannot be before start date'
//       });
//     }

//     // Validate total days
//     const calculatedDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
//     if (parseInt(leaveData.total_days) !== calculatedDays) {
//       await db.query('ROLLBACK');
//       return res.status(400).json({
//         success: false,
//         message: `Total days (${leaveData.total_days}) doesn't match date range (${calculatedDays} days)`
//       });
//     }

//     // Validate maximum leave days (e.g., 30 days)
//     const maxLeaveDays = 30;
//     if (parseInt(leaveData.total_days) > maxLeaveDays) {
//       await db.query('ROLLBACK');
//       return res.status(400).json({
//         success: false,
//         message: `Leave cannot exceed ${maxLeaveDays} days`
//       });
//     }

//     try {
//       // Create leave request details
//       const [leaveResult] = await db.query(
//         `INSERT INTO leave_request_details (
//           request_id,
//           leave_type,
//           leave_start_date,
//           leave_end_date,
//           total_days,
//           contact_address_during_leave,
//           emergency_contact_number,
//           room_locked,
//           keys_submitted,
//           created_at
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//         [
//           requestId,
//           leaveData.leave_type,
//           leaveData.leave_start_date,
//           leaveData.leave_end_date,
//           leaveData.total_days,
//           leaveData.contact_address_during_leave || null,
//           leaveData.emergency_contact_number || null,
//           leaveData.room_locked ? 1 : 0,
//           leaveData.keys_submitted ? 1 : 0
//         ]
//       );

//       console.log(`✅ Leave request details created with ID: ${leaveResult.insertId}`);

//       // Create notification for leave request
//       const leaveTypeDisplay = leaveData.leave_type
//         .replace(/_/g, ' ')
//         .split(' ')
//         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//         .join(' ');

//       await db.query(
//         `INSERT INTO notifications (
//           recipient_id,
//           recipient_type,
//           title,
//           message,
//           notification_type,
//           related_entity_type,
//           related_entity_id,
//           priority,
//           is_read,
//           created_at
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//         [
//           1,
//           'admin',
//           'New Leave Application',
//           `${tenantData.full_name} has applied for ${leaveTypeDisplay} (${leaveData.total_days} days)`,
//           'tenant_request',
//           'leave_request',
//           requestId,
//           'medium',
//           0
//         ]
//       );

//       console.log('🔔 Leave notification created successfully');

//     } catch (leaveError) {
//       console.error('❌ Error creating leave request details:', leaveError);
//       await db.query('ROLLBACK');
//       throw leaveError;
//     }
//   }

//   // In your createRequest method, add this after maintenance request creation:
// if (request_type === 'complaint') {
//   console.log('📢 Creating complaint request...');
  
//   const complaintData = req.body.complaint_data || {};
  
//   console.log('📋 Complaint data received:', complaintData);
  
//   // Validate required fields for complaint
//   if (!complaintData.category_master_type_id) {
//     await db.query('ROLLBACK');
//     return res.status(400).json({
//       success: false,
//       message: 'Complaint category is required'
//     });
//   }
  
//   // If custom reason is provided, reason_master_value_id might be null
//   // Otherwise, validate reason_master_value_id
//   if (!complaintData.custom_reason && !complaintData.reason_master_value_id) {
//     await db.query('ROLLBACK');
//     return res.status(400).json({
//       success: false,
//       message: 'Please select a reason or provide a custom reason'
//     });
//   }
  
//   try {
//     // Create complaint request details
//     const [complaintResult] = await db.query(
//       `INSERT INTO complaint_request_details (
//         request_id,
//         category_master_type_id,
//         reason_master_value_id,
//         custom_reason,
//         created_at
//       ) VALUES (?, ?, ?, ?, NOW())`,
//       [
//         requestId,
//         complaintData.category_master_type_id,
//         complaintData.reason_master_value_id || null,
//         complaintData.custom_reason || null
//       ]
//     );

//     console.log(`✅ Complaint request details created with ID: ${complaintResult.insertId}`);
    
//     // Get category and reason names for notification
//     let categoryName = 'Unknown';
//     let reasonText = 'No specific reason provided';
    
//     try {
//       const [categoryInfo] = await db.query(
//         `SELECT name FROM master_types WHERE id = ?`,
//         [complaintData.category_master_type_id]
//       );
      
//       if (categoryInfo.length > 0) {
//         categoryName = categoryInfo[0].name;
//       }
      
//       if (complaintData.reason_master_value_id) {
//         const [reasonInfo] = await db.query(
//           `SELECT value FROM master_values WHERE id = ?`,
//           [complaintData.reason_master_value_id]
//         );
        
//         if (reasonInfo.length > 0) {
//           reasonText = reasonInfo[0].value;
//         }
//       } else if (complaintData.custom_reason) {
//         reasonText = complaintData.custom_reason.substring(0, 50) + (complaintData.custom_reason.length > 50 ? '...' : '');
//       }
//     } catch (nameError) {
//       console.warn('⚠️ Could not fetch category/reason names:', nameError.message);
//     }
    
//     // Create notification for complaint request
//     await db.query(
//       `INSERT INTO notifications (
//         recipient_id,
//         recipient_type,
//         title,
//         message,
//         notification_type,
//         related_entity_type,
//         related_entity_id,
//         priority,
//         is_read,
//         created_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//       [
//         1,
//         'admin',
//         'New Complaint',
//         `${tenantData.full_name} submitted ${categoryName} complaint: ${reasonText}`,
//         'tenant_request',
//         'complaint_request',
//         requestId,
//         'high', // Complaints are usually high priority
//         0
//       ]
//     );

//     console.log('🔔 Complaint notification created successfully');

//   } catch (complaintError) {
//     console.error('❌ Error creating complaint request details:', complaintError);
//     await db.query('ROLLBACK');
//     throw complaintError;
//   }
// }

//       // ====================================================
//       // 🚨 CRITICAL: CREATE NOTIFICATION FOR ADMIN DASHBOARD
//       // ====================================================
//       console.log('🚨 CREATING NOTIFICATION FOR ADMIN...');
      
//       try {
//         // Format request type for display
//         const requestTypeDisplay = request_type
//           .replace(/_/g, ' ')
//           .split(' ')
//           .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//           .join(' ');
        
//         // Determine notification priority
//         let notificationPriority = 'medium';
//         if (priority === 'urgent' || priority === 'high') {
//           notificationPriority = priority;
//         } else if (request_type === 'complaint' || request_type === 'maintenance') {
//           notificationPriority = 'high';
//         }
        
//         // Create notification data
//         const notificationData = {
//           recipient_id: 1, // Default admin ID for dashboard
//           recipient_type: 'admin',
//           title: `New ${requestTypeDisplay} Request`,
//           message: `"${title}" - Submitted by ${tenantData.full_name}`,
//           notification_type: 'tenant_request',
//           related_entity_type: 'tenant_request',
//           related_entity_id: requestId,
//           priority: notificationPriority,
//           is_read: 0,
//           created_at: new Date()
//         };
        
//         console.log('📨 Creating notification with data:', {
//           title: notificationData.title,
//           message: notificationData.message,
//           request_id: requestId,
//           tenant: tenantData.full_name
//         });
        
//         // Insert notification
//         const [notificationResult] = await db.query(
//           `INSERT INTO notifications (
//             recipient_id,
//             recipient_type,
//             title,
//             message,
//             notification_type,
//             related_entity_type,
//             related_entity_id,
//             priority,
//             is_read,
//             created_at
//           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//           [
//             notificationData.recipient_id,
//             notificationData.recipient_type,
//             notificationData.title,
//             notificationData.message,
//             notificationData.notification_type,
//             notificationData.related_entity_type,
//             notificationData.related_entity_id,
//             notificationData.priority,
//             notificationData.is_read
//           ]
//         );
        
//         console.log(`✅ NOTIFICATION CREATED SUCCESSFULLY! ID: ${notificationResult.insertId}`);
//         console.log(`🔔 Notification should appear in admin dashboard immediately!`);
        
//       } catch (notificationError) {
//         console.error('❌ FAILED TO CREATE NOTIFICATION:', notificationError);
//         console.error('Notification error details:', {
//           message: notificationError.message,
//           sql: notificationError.sql,
//           code: notificationError.code
//         });
//         // Don't fail the entire request if notification fails
//       }

// // ====================================================
// // 🚨 CREATE CHANGE BED REQUEST - FIXED VERSION
// // ====================================================
// if (request_type === 'change_bed' && change_bed_data) {
//   console.log('🛏️ Creating change bed request...');
//   console.log('📋 RAW change_bed_data:', change_bed_data);
  
//   // Extract data safely - NO preferred_bed_number
//   const {
//     preferred_property_id,
//     preferred_room_id,
//     change_reason_id,
//     shifting_date,
//     notes = '',
//     current_property_id,
//     current_room_id,
//     current_bed_number
//   } = change_bed_data;
  
//   console.log('📊 Extracted data (without preferred_bed_number):', {
//     preferred_property_id,
//     preferred_room_id,
//     change_reason_id,
//     shifting_date,
//     notes,
//     current_property_id,
//     current_room_id,
//     current_bed_number
//   });
  
//   try {
//     // Get current room info from tenant's bed assignment
//     const [currentRoom] = await db.query(
//       `SELECT 
//         r.property_id,
//         ba.room_id,
//         ba.bed_number
//        FROM bed_assignments ba
//        JOIN rooms r ON ba.room_id = r.id
//        WHERE ba.tenant_id = ? AND ba.is_available = 0
//        LIMIT 1`,
//       [tenant_id]
//     );

//     let currentRoomInfo = currentRoom[0] || {};
//     console.log('📍 Current room info from DB:', currentRoomInfo);

//     // If no current assignment, use values from frontend or defaults
//     if (!currentRoomInfo.property_id || !currentRoomInfo.room_id) {
//       console.warn('⚠️ No current room assignment found in DB');
      
//       // Use values from frontend if provided
//       if (current_property_id && current_room_id) {
//         currentRoomInfo = {
//           property_id: current_property_id,
//           room_id: current_room_id,
//           bed_number: current_bed_number || 1
//         };
//         console.log('📍 Using frontend current room info:', currentRoomInfo);
//       } else {
//         // Use tenant's property_id as fallback
//         currentRoomInfo = {
//           property_id: tenantData.property_id || 1,
//           room_id: 1,
//           bed_number: 1
//         };
//         console.log('📍 Using fallback current room info:', currentRoomInfo);
//       }
//     }

//     console.log('📝 Final data for insertion (CORRECTED):', {
//       tenant_request_id: requestId,
//       current_property_id: currentRoomInfo.property_id,
//       current_room_id: currentRoomInfo.room_id,
//       current_bed_number: currentRoomInfo.bed_number,
//       preferred_property_id: preferred_property_id,
//       preferred_room_id: preferred_room_id,
//       change_reason_id: change_reason_id,
//       shifting_date: shifting_date,
//       notes: notes
//       // NO preferred_bed_number - column doesn't exist
//     });

//     // CORRECT INSERT QUERY - WITHOUT preferred_bed_number
//     const [changeBedResult] = await db.query(
//       `INSERT INTO change_bed_requests (
//         tenant_request_id,
//         current_property_id,
//         current_room_id,
//         current_bed_number,
//         preferred_property_id,
//         preferred_room_id,
//         change_reason_id,
//         shifting_date,
//         notes,
//         request_status,
//         created_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
//       [
//         requestId,
//         currentRoomInfo.property_id,
//         currentRoomInfo.room_id,
//         currentRoomInfo.bed_number || 1,
//         preferred_property_id,
//         preferred_room_id,
//         change_reason_id,
//         shifting_date,
//         notes
//         // NO preferred_bed_number value
//       ]
//     );

//     console.log(`✅ SUCCESS: Change bed request created with ID: ${changeBedResult.insertId}`);
    
//     // Create notification
//     const changeReasonName = await this.getChangeReasonName(change_reason_id);
    
//     await db.query(
//       `INSERT INTO notifications (
//         recipient_id,
//         recipient_type,
//         title,
//         message,
//         notification_type,
//         related_entity_type,
//         related_entity_id,
//         priority,
//         is_read,
//         created_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//       [
//         1,
//         'admin',
//         'New Change Bed Request',
//         `${tenantData.full_name} wants to change from room ${currentRoomInfo.room_id} to room ${preferred_room_id}. Reason: ${changeReasonName}`,
//         'tenant_request',
//         'change_bed_request',
//         changeBedResult.insertId,
//         priority === 'urgent' ? 'urgent' : 'medium',
//         0
//       ]
//     );
    
//   } catch (changeBedError) {
//     console.error('❌ CRITICAL ERROR creating change bed request:', changeBedError);
//     console.error('❌ Error message:', changeBedError.message);
//     console.error('❌ Error code:', changeBedError.code);
//     console.error('❌ Error sql:', changeBedError.sql);
    
//     // Emergency insert with required fields only
//     try {
//       console.log('🔄 Trying emergency insert...');
//       const [emergencyResult] = await db.query(
//         `INSERT INTO change_bed_requests (
//           tenant_request_id,
//           preferred_property_id,
//           preferred_room_id,
//           change_reason_id, // REQUIRED FIELD
//           request_status,
//           created_at
//         ) VALUES (?, ?, ?, ?, 'pending', NOW())`,
//         [
//           requestId,
//           preferred_property_id || 1,
//           preferred_room_id || 1,
//           change_reason_id || 1 // REQUIRED - use default if missing
//         ]
//       );
//       console.log(`⚠️ Emergency insert created with ID: ${emergencyResult.insertId}`);
//     } catch (emergencyError) {
//       console.error('❌ Emergency insert also failed:', emergencyError);
//     }
//   }
// }
//       // If it's a vacate_bed request, create vacate_bed_request record
//       if (request_type === 'vacate_bed' && vacate_data) {
//         const {
//           primary_reason_id,
//           secondary_reasons = [],
//           overall_rating,
//           food_rating,
//           cleanliness_rating,
//           management_rating,
//           improvement_suggestions,
//           expected_vacate_date,
//           lockin_penalty_accepted = false,
//           notice_penalty_accepted = false
//         } = vacate_data;

//         console.log('📝 Creating vacate_bed_request record with data:', {
//           tenant_id,
//           property_id: tenantData.property_id,
//           bed_id: tenantData.bed_assignment_id,
//           room_id: tenantData.room_id,
//           primary_reason_id,
//           secondary_reasons,
//           overall_rating,
//           food_rating,
//           cleanliness_rating,
//           management_rating,
//           improvement_suggestions,
//           expected_vacate_date,
//           lockin_penalty_accepted,
//           notice_penalty_accepted,
//           tenant_request_id: requestId
//         });

//         await db.query(
//           `INSERT INTO vacate_bed_requests (
//             tenant_id,
//             property_id,
//             bed_id,
//             room_id,
//             primary_reason_id,
//             secondary_reasons,
//             overall_rating,
//             food_rating,
//             cleanliness_rating,
//             management_rating,
//             improvement_suggestions,
//             expected_vacate_date,  
//             lockin_penalty_accepted,
//             notice_penalty_accepted,
//             status,
//             created_at,
//             tenant_request_id
//           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
//           [
//             tenant_id,
//             tenantData.property_id,
//             tenantData.bed_assignment_id,
//             tenantData.room_id,
//             primary_reason_id,
//             secondary_reasons.length > 0 ? JSON.stringify(secondary_reasons) : null,
//             overall_rating,
//             food_rating,
//             cleanliness_rating,
//             management_rating,
//             improvement_suggestions,
//             expected_vacate_date || null,  
//             lockin_penalty_accepted ? 1 : 0,
//             notice_penalty_accepted ? 1 : 0,
//             requestId
//           ]
//         );

//         console.log('✅ vacate_bed_request record created successfully');
//       }

//       // ====================================================
//       // 🚨 MAINTENANCE REQUEST CREATION - ADD HERE (AFTER requestId is defined)
//       // ====================================================
//       if (request_type === 'maintenance' && maintenance_data) {
//         console.log('🔧 Creating maintenance request...');
        
//         console.log('📋 Maintenance data received:', maintenance_data);
        
//         // Validate required fields for maintenance
//         if (!maintenance_data.issue_category || !maintenance_data.location) {
//           await db.query('ROLLBACK');
//           return res.status(400).json({
//             success: false,
//             message: 'Issue category and location are required for maintenance requests'
//           });
//         }
        
//         try {
//           // Create maintenance request details
//           const [maintenanceResult] = await db.query(
//             `INSERT INTO maintenance_request_details (
//               request_id,
//               issue_category,
//               location,
//               preferred_visit_time,
//               access_permission,
//               created_at
//             ) VALUES (?, ?, ?, ?, ?, NOW())`,
//             [
//               requestId,
//               maintenance_data.issue_category,
//               maintenance_data.location,
//               maintenance_data.preferred_visit_time || 'anytime',
//               maintenance_data.access_permission ? 1 : 0
//             ]
//           );

//           console.log(`✅ Maintenance request details created with ID: ${maintenanceResult.insertId}`);
          
//           // Create notification for maintenance request
//           const issueCategory = maintenance_data.issue_category
//             .replace(/_/g, ' ')
//             .split(' ')
//             .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//             .join(' ');
          
//           await db.query(
//             `INSERT INTO notifications (
//               recipient_id,
//               recipient_type,
//               title,
//               message,
//               notification_type,
//               related_entity_type,
//               related_entity_id,
//               priority,
//               is_read,
//               created_at
//             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//             [
//               1,
//               'admin',
//               'New Maintenance Request',
//               `${tenantData.full_name} reported ${issueCategory} issue in ${maintenance_data.location}. Priority: ${priority}`,
//               'tenant_request',
//               'maintenance_request',
//               requestId,
//               'high', // Maintenance requests are usually high priority
//               0
//             ]
//           );

//           console.log('🔔 Maintenance notification created successfully');

//         } catch (maintenanceError) {
//           console.error('❌ Error creating maintenance request details:', maintenanceError);
//           await db.query('ROLLBACK');
//           throw maintenanceError;
//         }
//       }

      
      

//       await db.query('COMMIT');

//       res.json({
//         success: true,
//         message: 'Request created successfully',
//         request_id: requestId,
//         debug: {
//           notification_created: true,
//           tenant_name: tenantData.full_name,
//           request_type: request_type,
//           timestamp: new Date().toISOString()
//         }
//       });

//     } catch (error) {
//       await db.query('ROLLBACK');
//       console.error('❌ Transaction failed:', error);
//       throw error;
//     }

//   } catch (err) {
//     console.error('🔥 Create tenant request error:', err);
    
//     // Handle duplicate request error specifically
//     if (err.message?.includes('DUPLICATE_VACATE_REQUEST') || err.code === 'DUPLICATE_VACATE_REQUEST') {
//       return res.status(400).json({
//         success: false,
//         message: 'You already have a pending vacate request.',
//         code: 'DUPLICATE_VACATE_REQUEST',
//         debug: {
//           existing_request: err.existing_request_id
//         }
//       });
//     }

//     // handle duplicate change bed request error specifically
//     if (err.message?.includes('DUPLICATE_CHANGE_BED_REQUEST') || err.code === 'DUPLICATE_CHANGE_BED_REQUEST') {
//       return res.status(400).json({
//         success: false,
//         message: 'You already have a pending change bed request.',
//         code: 'DUPLICATE_CHANGE_BED_REQUEST',
//         debug: {
//           existing_request: err.existing_request_id
//         }
//       });
//     }
    
//     res.status(500).json({
//       success: false,
//       message: err.message || 'Internal server error'
//     });
//   }
// }


  // NEW ENDPOINT: Get tenant contract details for frontend to display
  async getTenantContractDetails(req, res) {
    try {
      const tenant_id = req.user?.id;
      if (!tenant_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      console.log('🔍 Getting contract details for tenant ID:', tenant_id);

      // Get tenant's contract details with monthly rent
      const [tenantInfo] = await db.query(
        `SELECT 
          t.id,
          t.full_name,
          t.property_id,
          ba.id as bed_assignment_id,
          ba.room_id,
          ba.bed_number,
          t.lockin_period_months,
          t.lockin_penalty_amount,
          t.lockin_penalty_type,
          t.notice_period_days,
          t.notice_penalty_amount,
          t.notice_penalty_type,
          t.check_in_date,
          -- Get rent from rooms
          r.rent_per_bed as monthly_rent,
          p.security_deposit,
          p.name as property_name,
          r.room_number
        FROM tenants t
        -- Join properties to get property name
        LEFT JOIN properties p ON t.property_id = p.id
        -- Join bed_assignments to get current assignment
        LEFT JOIN bed_assignments ba ON ba.tenant_id = t.id AND ba.is_available = 0
        -- Join rooms to get room details and rent
        LEFT JOIN rooms r ON ba.room_id = r.id
        WHERE t.id = ? AND t.deleted_at IS NULL`,
        [tenant_id]
      );

      console.log('✅ SQL query executed, rows found:', tenantInfo.length);

      if (tenantInfo.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      const tenantData = tenantInfo[0];

       // ⚠️ ADD DEBUG LOGS HERE:
    console.log('🔍 getTenantContractDetails - All fields:', Object.keys(tenantData));
    console.log('🔍 getTenantContractDetails - Security deposit:', tenantData.security_deposit);
    console.log('🔍 getTenantContractDetails - Monthly rent:', tenantData.monthly_rent);
      
      console.log('📊 Tenant data loaded:', {
        check_in_date: tenantData.check_in_date,
        lockin_period_months: tenantData.lockin_period_months,
        lockin_penalty_amount: tenantData.lockin_penalty_amount,
        lockin_penalty_type: tenantData.lockin_penalty_type,
        notice_period_days: tenantData.notice_period_days,
        notice_penalty_amount: tenantData.notice_penalty_amount,
        notice_penalty_type: tenantData.notice_penalty_type,
        monthly_rent: tenantData.monthly_rent,
        room_number: tenantData.room_number,
        bed_number: tenantData.bed_number,
        property_name: tenantData.property_name,
        property_id: tenantData.property_id,
        full_name: tenantData.full_name,
        id: tenantData.id,
        security_deposit: tenantData.security_deposit
      });
      
      // Calculate lock-in period status
      let lockinInfo = null;
      if (tenantData.check_in_date && tenantData.lockin_period_months) {
        const checkInDate = new Date(tenantData.check_in_date);
        const currentDate = new Date();
        const monthsDiff = (currentDate.getFullYear() - checkInDate.getFullYear()) * 12 + 
                         (currentDate.getMonth() - checkInDate.getMonth());

        const lockInEndDate = new Date(checkInDate);
        lockInEndDate.setMonth(checkInDate.getMonth() + tenantData.lockin_period_months);
        
        const isInLockinPeriod = monthsDiff < tenantData.lockin_period_months;
        const remainingMonths = Math.max(0, tenantData.lockin_period_months - monthsDiff);
        
        // Calculate penalty amount - FIXED: Use this.calculatePenaltyAmount
        const lockinPenaltyAmount = this.calculatePenaltyAmount(
          tenantData.lockin_penalty_amount,
          tenantData.lockin_penalty_type,
          tenantData.security_deposit
        );
        
        lockinInfo = {
          isInLockinPeriod,
          lockinEnds: lockInEndDate,
          remainingMonths,
          checkInDate,
          lockinPeriodMonths: tenantData.lockin_period_months,
          penalty: {
            amount: tenantData.lockin_penalty_amount,
            type: tenantData.lockin_penalty_type,
            description: this.getPenaltyDescription(
              tenantData.lockin_penalty_amount,
              tenantData.lockin_penalty_type,
              tenantData.security_deposit
            ),
            calculatedAmount: lockinPenaltyAmount
          }
        };
        
        console.log('🔒 Lock-in info calculated:', lockinInfo);
      } else {
        console.log('⚠️ No lock-in period data found');
      }

      // Calculate notice period info
      let noticeInfo = null;
      if (tenantData.notice_period_days) {
        // Calculate penalty amount - FIXED: Use this.calculatePenaltyAmount
        const noticePenaltyAmount = this.calculatePenaltyAmount(
          tenantData.notice_penalty_amount,
          tenantData.notice_penalty_type,
          tenantData.security_deposit
        );
        
        noticeInfo = {
          noticePeriodDays: tenantData.notice_period_days,
          penalty: {
            amount: tenantData.notice_penalty_amount,
            type: tenantData.notice_penalty_type,
            description: this.getPenaltyDescription(
              tenantData.notice_penalty_amount,
              tenantData.notice_penalty_type,
              tenantData.security_deposit
            ),
            calculatedAmount: noticePenaltyAmount
          },
          requiresAgreement: !!tenantData.notice_penalty_amount
        };
        
        console.log('📋 Notice info calculated:', noticeInfo);
      } else {
        console.log('⚠️ No notice period data found');
      }

      res.json({
        success: true,
        data: {
          tenantDetails: {
            id: tenantData.id,
            full_name: tenantData.full_name,
            property_id: tenantData.property_id,
            property_name: tenantData.property_name,
            room_number: tenantData.room_number,
            bed_number: tenantData.bed_number,
            check_in_date: tenantData.check_in_date,
            lockin_period_months: tenantData.lockin_period_months,
            lockin_penalty_amount: tenantData.lockin_penalty_amount,
            lockin_penalty_type: tenantData.lockin_penalty_type,
            notice_period_days: tenantData.notice_period_days,
            notice_penalty_amount: tenantData.notice_penalty_amount,
            notice_penalty_type: tenantData.notice_penalty_type,
            // monthly_rent: tenantData.monthly_rent,
            security_deposit: tenantData.security_deposit
          },
          lockinInfo,
          noticeInfo
        }
      });

    } catch (err) {
      console.error('🔥 Get tenant contract details error:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Internal server error',
        sql: err.sql,
        code: err.code
      });
    }
  }

  // async getMyRequests(req, res) {
  //   try {
  //     const tenant_id = req.user?.id;
  //     if (!tenant_id) {
  //       return res.status(401).json({
  //         success: false,
  //         message: 'Authentication required'
  //       });
  //     }

  //      console.log('🔍 Getting requests for tenant ID:', tenant_id);

  //     const [requests] = await db.query(
  //       `SELECT tr.*, 
  //               vbr.primary_reason_id,
  //               vbr.secondary_reasons,
  //               vbr.overall_rating,
  //               vbr.food_rating,
  //               vbr.cleanliness_rating,
  //               vbr.management_rating,
  //               vbr.improvement_suggestions,
  //               vbr.lockin_penalty_accepted,
  //               vbr.notice_penalty_accepted,
  //               mv.value as primary_reason_name
  //        FROM tenant_requests tr
  //        LEFT JOIN vacate_bed_requests vbr ON tr.id = vbr.tenant_request_id
  //        LEFT JOIN master_values mv ON vbr.primary_reason_id = mv.id
  //        WHERE tr.tenant_id = ?
  //        ORDER BY tr.created_at DESC`,
  //       [tenant_id]
  //     );

  //     // Parse JSON fields
  //     const parsedRequests = requests.map(req => {
  //       if (req.secondary_reasons) {
  //         try {
  //           req.secondary_reasons = JSON.parse(req.secondary_reasons);
  //         } catch (e) {
  //           req.secondary_reasons = [];
  //         }
  //       }
  //       return req;
  //     });

  //     res.json({
  //       success: true,
  //       data: parsedRequests
  //     });

  //   } catch (err) {
  //     res.status(500).json({
  //       success: false,
  //       message: err.message
  //     });
  //   }
  // }
  async getMyRequests(req, res) {
  try {
    const tenant_id = req.user?.id;
    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('🔍 Getting requests for tenant ID:', tenant_id);

const [requests] = await db.query(
  `SELECT 
    tr.*, 
    vbr.id as vacate_bed_request_id,
    vbr.primary_reason_id,
    vbr.secondary_reasons,
    vbr.overall_rating,
    vbr.food_rating,
    vbr.cleanliness_rating,
    vbr.management_rating,
    vbr.improvement_suggestions,
    vbr.expected_vacate_date,
    vbr.lockin_penalty_accepted,
    vbr.notice_penalty_accepted,
    vbr.status as vacate_status,
    mv.value as primary_reason_name,
    
    -- Change bed data
    cbr.id as change_bed_request_id,
    cbr.preferred_property_id,
    cbr.preferred_room_id,
    cbr.change_reason_id,
    cbr.shifting_date,
    cbr.notes as change_bed_notes,
    cbr.assigned_bed_number,
    cbr.rent_difference,
    cbr.admin_notes as change_bed_admin_notes,
    cbr.request_status as change_bed_status,
    r2.room_number as preferred_room_number,
    p2.name as preferred_property_name,
    mv2.value as change_reason,
    mt1.code as change_reason_code, -- CHANGED: mt1 instead of mt

    -- Leave data
    lrd.id as leave_request_detail_id,
    lrd.leave_type,
    lrd.leave_start_date,
    lrd.leave_end_date,
    lrd.total_days,
    lrd.contact_address_during_leave,
    lrd.emergency_contact_number,
    lrd.room_locked,
    lrd.keys_submitted,
    lrd.created_at as leave_detail_created_at,

    -- Maintenance data
    mrd.id as maintenance_request_detail_id,
    mrd.issue_category,
    mrd.location,
    mrd.preferred_visit_time,
    mrd.access_permission,
    mrd.resolved_at as maintenance_resolved_at,

    -- Complaint data
    crd.id as complaint_request_detail_id,
    crd.category_master_type_id,
    crd.reason_master_value_id,
    crd.custom_reason,
    mt2.name as complaint_category_name, -- CHANGED: mt2 instead of mt
    mv3.value as complaint_reason_name -- CHANGED: mv3 instead of mv
    
   FROM tenant_requests tr
   
   -- Left join for vacate bed requests
   LEFT JOIN vacate_bed_requests vbr ON tr.id = vbr.tenant_request_id AND tr.request_type = 'vacate_bed'
   LEFT JOIN master_values mv ON vbr.primary_reason_id = mv.id
   
   -- Left join for change bed requests
   LEFT JOIN change_bed_requests cbr ON tr.id = cbr.tenant_request_id AND tr.request_type = 'change_bed'
   LEFT JOIN rooms r2 ON cbr.preferred_room_id = r2.id
   LEFT JOIN properties p2 ON cbr.preferred_property_id = p2.id
   LEFT JOIN master_values mv2 ON cbr.change_reason_id = mv2.id
   LEFT JOIN master_types mt1 ON mv2.master_type_id = mt1.id -- CHANGED: mt1 alias

   -- Left join for leave requests
   LEFT JOIN leave_request_details lrd ON tr.id = lrd.request_id AND tr.request_type = 'leave'

   -- Left join for maintenance requests
   LEFT JOIN maintenance_request_details mrd ON tr.id = mrd.request_id AND tr.request_type = 'maintenance'

   -- Left join for complaint requests
   LEFT JOIN complaint_request_details crd ON tr.id = crd.request_id AND tr.request_type = 'complaint'
   LEFT JOIN master_types mt2 ON crd.category_master_type_id = mt2.id -- CHANGED: mt2 alias
   LEFT JOIN master_values mv3 ON crd.reason_master_value_id = mv3.id -- CHANGED: mv3 alias
   
   WHERE tr.tenant_id = ?
   ORDER BY tr.created_at DESC`,
  [tenant_id]
);

    console.log(`✅ Found ${requests.length} requests for tenant`);

    // Parse JSON fields SAFELY
    const parsedRequests = requests.map(req => {
      // Create vacate_data object if it's a vacate_bed request
      if (req.request_type === 'vacate_bed') {
        // SAFELY parse secondary_reasons
        let secondaryReasons = [];
        if (req.secondary_reasons) {
          try {
            // Check if it's already an array
            if (Array.isArray(req.secondary_reasons)) {
              secondaryReasons = req.secondary_reasons;
            } 
            // Check if it's a JSON string
            else if (typeof req.secondary_reasons === 'string' && 
                    (req.secondary_reasons.startsWith('[') || req.secondary_reasons.startsWith('{'))) {
              secondaryReasons = JSON.parse(req.secondary_reasons);
            }
            // It's a plain string - treat it as a single reason
            else if (typeof req.secondary_reasons === 'string') {
              secondaryReasons = [req.secondary_reasons];
            }
          } catch (error) {
            console.error('❌ Error parsing secondary_reasons:', {
              id: req.id,
              secondary_reasons: req.secondary_reasons,
              error: error.message
            });
            secondaryReasons = [];
          }
        }
        
        req.vacate_data = {
          primary_reason_id: req.primary_reason_id,
          secondary_reasons: secondaryReasons,
          overall_rating: req.overall_rating,
          food_rating: req.food_rating,
          cleanliness_rating: req.cleanliness_rating,
          management_rating: req.management_rating,
          improvement_suggestions: req.improvement_suggestions,
          expected_vacate_date: req.expected_vacate_date,
          lockin_penalty_accepted: req.lockin_penalty_accepted,
          notice_penalty_accepted: req.notice_penalty_accepted
        };
      }

       // Create change_bed_data object if it's a change_bed request
        if (req.request_type === 'change_bed' && req.change_bed_request_id) {
          req.change_bed_data = {
            preferred_property_id: req.preferred_property_id,
            preferred_room_id: req.preferred_room_id,
            change_reason_id: req.change_reason_id,
            shifting_date: req.shifting_date,
            notes: req.change_bed_notes,
            assigned_bed_number: req.assigned_bed_number,
            rent_difference: req.rent_difference,
            admin_notes: req.change_bed_admin_notes,
            request_status: req.change_bed_status,
            preferred_room_number: req.preferred_room_number,
            preferred_property_name: req.preferred_property_name,
            change_reason: req.change_reason,
            change_reason_code: req.change_reason_code 
          };
        }

     // Create leave_data object if it's a leave request
      if (req.request_type === 'leave' && req.leave_request_detail_id) {
        req.leave_data = {
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
        
        // Clean up extra fields
        delete req.leave_request_detail_id;
        delete req.leave_type;
        delete req.leave_start_date;
        delete req.leave_end_date;
        delete req.total_days;
        delete req.contact_address_during_leave;
        delete req.emergency_contact_number;
        delete req.room_locked;
        delete req.keys_submitted;
        delete req.leave_detail_created_at;
      }

      // Add this in the parsedRequests.map() function, after parsing leave data:
if (req.request_type === 'maintenance' && req.maintenance_request_detail_id) {
  req.maintenance_data = {
    issue_category: req.issue_category,
    location: req.location,
    preferred_visit_time: req.preferred_visit_time,
    access_permission: req.access_permission === 1,
    resolved_at: req.maintenance_resolved_at
  };
  
  // Clean up extra fields
  delete req.maintenance_request_detail_id;
  delete req.issue_category;
  delete req.location;
  delete req.preferred_visit_time;
  delete req.access_permission;
  delete req.maintenance_resolved_at;
}

// Add this in the parsedRequests.map() function, after parsing maintenance data:
if (req.request_type === 'complaint' && req.complaint_request_detail_id) {
  req.complaint_data = {
    category_master_type_id: req.category_master_type_id,
    reason_master_value_id: req.reason_master_value_id,
    custom_reason: req.custom_reason,
    complaint_category_name: req.complaint_category_name,
    complaint_reason_name: req.complaint_reason_name
  };
  
  // Clean up extra fields
  delete req.complaint_request_detail_id;
  delete req.category_master_type_id;
  delete req.reason_master_value_id;
  delete req.custom_reason;
  delete req.complaint_category_name;
  delete req.complaint_reason_name;
}
      
      // Clean up the extra fields
      delete req.primary_reason_id;
      delete req.secondary_reasons;
      delete req.overall_rating;
      delete req.food_rating;
      delete req.cleanliness_rating;
      delete req.management_rating;
      delete req.improvement_suggestions;
      delete req.expected_vacate_date;
      delete req.lockin_penalty_accepted;
      delete req.notice_penalty_accepted;
      delete req.vacate_bed_request_id;
      delete req.vacate_status;
      delete req.primary_reason_name;
      delete req.change_bed_request_id;
        delete req.preferred_property_id;
        delete req.preferred_room_id;
        delete req.change_reason_id;
        delete req.shifting_date;
        delete req.change_bed_notes;
        delete req.assigned_bed_number;
        delete req.rent_difference;
        delete req.change_bed_admin_notes;
        delete req.change_bed_status;
        delete req.preferred_room_number;
        delete req.preferred_property_name;
        delete req.change_reason;
        delete req.change_reason_code; // Add this line
delete req.complaint_category_name; // Add this line
delete req.complaint_reason_name; // Add this line

  
      
      return req;
    });

    console.log('📋 Parsed requests:', parsedRequests.map(r => ({
      id: r.id,
      type: r.request_type,
      status: r.status,
      has_vacate_data: !!r.vacate_data
    })));

    res.json({
      success: true,
      data: parsedRequests
    });

  } catch (err) {
    console.error('🔥 Error getting my requests:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

  async getVacateReasons(req, res) {
    try {
      const [reasons] = await db.query(
        `SELECT mv.* 
         FROM master_values mv
         JOIN master_types mt ON mv.master_type_id = mt.id
         WHERE mt.code = 'VACATE_REASON' AND mv.is_active = 1
         ORDER BY mv.display_order, mv.value`
      );

      if (reasons.length > 0) {
        return res.json({
          success: true,
          data: reasons
        });
      }

      // Fallback to hardcoded reasons
      const defaultReasons = [
        { id: 1, value: 'Job Change/Relocation' },
        { id: 2, value: 'Personal Reasons' },
        { id: 3, value: 'Financial Issues' },
        { id: 4, value: 'Found Better Accommodation' },
        { id: 5, value: 'Completing Studies' },
        { id: 6, value: 'Medical Reasons' },
        { id: 7, value: 'Family Reasons' },
        { id: 8, value: 'Dissatisfied with Services' }
      ];

      res.json({
        success: true,
        data: defaultReasons
      });

    } catch (err) {
      const defaultReasons = [
        { id: 1, value: 'Job Change/Relocation' },
        { id: 2, value: 'Personal Reasons' },
        { id: 3, value: 'Financial Issues' },
        { id: 4, value: 'Found Better Accommodation' }
      ];

      res.json({
        success: true,
        data: defaultReasons
      });
    }
  }

  // In createRequest method, after creating the request
  async createTenantRequestNotification (tenantId, tenantName, requestId, requestType, title){
   // ====================================================
// CREATE NOTIFICATION FOR ADMIN DASHBOARD
// ====================================================
console.log('🚨🚨🚨 CREATING NOTIFICATION FOR TENANT REQUEST 🚨🚨🚨');
console.log('📊 Request details:', {
  request_id: requestId,
  request_type: request_type,
  title: title,
  tenant_name: tenantData.full_name,
  priority: priority
});

try {
  // Always use recipient_id = 1 for admin dashboard
  const adminId = 1;
  const tenantName = tenantData.full_name || 'Tenant';

  
  
  // Format request type for display
  const requestTypeDisplay = request_type
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Set priority based on request type
  let notificationPriority = 'medium';
  if (priority === 'urgent' || priority === 'high') {
    notificationPriority = priority;
  } else if (request_type === 'complaint' || request_type === 'maintenance') {
    notificationPriority = 'high';
  }
  
  const notificationData = {
    recipient_id: adminId,
    recipient_type: 'admin',
    title: `New ${requestTypeDisplay} Request`,
    message: `"${title}" - Submitted by ${tenantName}`,
    notification_type: 'tenant_request',
    related_entity_type: 'tenant_request',
    related_entity_id: requestId,
    priority: notificationPriority,
    is_read: 0,
    created_at: new Date()
  };
  
  console.log('📨 CREATING NOTIFICATION WITH DATA:', notificationData);
  
  // Direct database insert - SIMPLE and GUARANTEED to work
  const [notificationResult] = await db.query(
    `INSERT INTO notifications 
     (recipient_id, recipient_type, title, message, notification_type, 
      related_entity_type, related_entity_id, priority, is_read, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notificationData.recipient_id,
      notificationData.recipient_type,
      notificationData.title,
      notificationData.message,
      notificationData.notification_type,
      notificationData.related_entity_type,
      notificationData.related_entity_id,
      notificationData.priority,
      notificationData.is_read,
      notificationData.created_at
    ]
  );
  
  console.log(`✅ NOTIFICATION CREATED SUCCESSFULLY! ID: ${notificationResult.insertId}`);
  console.log(`🔔 Notification should appear in admin dashboard immediately!`);
  
} catch (notificationError) {
  console.error('❌❌❌ FAILED TO CREATE NOTIFICATION:', notificationError);
  console.error('❌ Error details:', {
    message: notificationError.message,
    sql: notificationError.sql,
    code: notificationError.code
  });
  // Don't fail the request, but log the error
}
  }

  // Add this method to tenantRequestController.js
async cancelVacateRequest(req, res) {
  try {
    const tenant_id = req.user?.id;
    const { request_id } = req.params;

    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if request belongs to tenant
    const [requestCheck] = await db.query(
      `SELECT id, status FROM tenant_requests 
       WHERE id = ? AND tenant_id = ? AND request_type = 'vacate_bed'`,
      [request_id, tenant_id]
    );

    if (requestCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or you do not have permission'
      });
    }

    // Update status to cancelled
    await db.query(
      `UPDATE tenant_requests SET status = 'cancelled', updated_at = NOW() 
       WHERE id = ?`,
      [request_id]
    );

    // Also update vacate_bed_request if exists
    await db.query(
      `UPDATE vacate_bed_requests SET status = 'cancelled', updated_at = NOW()
       WHERE tenant_request_id = ?`,
      [request_id]
    );

    res.json({
      success: true,
      message: 'Vacate request cancelled successfully'
    });

  } catch (err) {
    console.error('🔥 Cancel vacate request error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
}



// Get current room info
async getCurrentRoomInfo(req, res) {
  try {
    const tenant_id = req.user?.id;
    
    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('🔍 Getting current room info for tenant ID:', tenant_id);

    // Get tenant basic info
    const [tenantInfo] = await db.query(
      `SELECT 
        t.id,
        t.full_name,
        t.email,
        t.phone,
        t.gender,
        t.check_in_date,
        t.property_id,
        t.room_id,
        t.bed_id
       FROM tenants t
       WHERE t.id = ? AND t.deleted_at IS NULL`,
      [tenant_id]
    );

    if (tenantInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const tenant = tenantInfo[0];
    
    // Get tenant's bed assignments using the existing rooms API logic
    const [assignments] = await db.query(
      `SELECT 
        ba.id as bed_assignment_id,
        ba.room_id,
        ba.bed_number,
        ba.tenant_gender,
        ba.is_available,
        ba.created_at as assignment_date,
        
        r.id as room_id,
        r.room_number,
        r.sharing_type,
        r.total_bed,
        r.floor,
        r.rent_per_bed,
        r.is_active as room_active,
        r.room_type,
        r.description as room_description,
        r.has_attached_bathroom,
        r.has_ac,
        r.has_balcony,
        r.amenities as room_amenities,
        
        p.id as property_id,
        p.name as property_name,
        p.address as property_address,
        p.city_id as city,
        p.area,
        p.state,
        p.amenities as property_amenities
        
       FROM bed_assignments ba
       JOIN rooms r ON ba.room_id = r.id
       JOIN properties p ON r.property_id = p.id
       
       WHERE ba.tenant_id = ? AND ba.is_available = 0
       
       ORDER BY ba.created_at DESC
       LIMIT 1`,
      [tenant_id]
    );

    // If no active assignment found
    if (assignments.length === 0) {
      return res.json({
        success: true,
        data: {
          tenant_id: tenant.id,
          tenant_name: tenant.full_name,
          email: tenant.email,
          phone: tenant.phone,
          gender: tenant.gender,
          check_in_date: tenant.check_in_date,
          has_assignment: false,
          message: 'No active bed assignment found'
        }
      });
    }

    const assignment = assignments[0];
    
    // Get occupied beds count for this room
    const [occupiedBeds] = await db.query(
      `SELECT COUNT(*) as occupied_count 
       FROM bed_assignments 
       WHERE room_id = ? AND is_available = 0`,
      [assignment.room_id]
    );

    // Prepare complete response
    const response = {
      // Tenant info
      tenant_id: tenant.id,
      tenant_name: tenant.full_name,
      email: tenant.email,
      phone: tenant.phone,
      gender: tenant.gender,
      check_in_date: tenant.check_in_date,
      has_assignment: true,
      
      // Property info
      property_id: assignment.property_id,
      property_name: assignment.property_name,
      property_address: assignment.property_address || '',
      city: assignment.city || '',
      area: assignment.area || '',
      state: assignment.state || '',
      property_amenities: assignment.property_amenities || '[]',
      
      // Room info
      room_id: assignment.room_id,
      room_number: assignment.room_number,
      sharing_type: assignment.sharing_type,
      total_bed: assignment.total_bed,
      floor: assignment.floor || 1,
      rent_per_bed: assignment.rent_per_bed,
      room_type: assignment.room_type || 'pg',
      room_description: assignment.room_description || '',
      room_amenities: assignment.room_amenities || '[]',
      has_attached_bathroom: assignment.has_attached_bathroom || false,
      has_ac: assignment.has_ac || false,
      has_balcony: assignment.has_balcony || false,
      room_active: assignment.room_active || false,
      
      // Bed info
      bed_assignment_id: assignment.bed_assignment_id,
      bed_number: assignment.bed_number,
      assignment_date: assignment.assignment_date,
      tenant_gender: assignment.tenant_gender,
      
      // Occupancy info
      occupied_beds: occupiedBeds[0]?.occupied_count || 0,
      available_beds: assignment.total_bed - (occupiedBeds[0]?.occupied_count || 0)
    };

    console.log('✅ Current room info loaded successfully');
    
    return res.json({
      success: true,
      data: response
    });

  } catch (err) {
    console.error('🔥 Error getting current room info:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
      sql: err.sql,
      code: err.code
    });
  }
}

// Get active properties
async getActiveProperties(req, res) {
  try {
    const tenant_id = req.user?.id;
    
    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('🏢 Getting active properties...');

    const [properties] = await db.query(
      `SELECT 
        p.id,
        p.name,
        p.address,
        p.city_id as city,
        p.area,
        p.state,
        p.total_rooms,
        p.total_beds,
        p.occupied_beds,
        p.starting_price,
        p.security_deposit,
        p.description,
        p.is_active,
        p.created_at,
        p.updated_at,
        p.rating,
        p.amenities,
        
        -- Count available rooms (rooms with available beds)
        (SELECT COUNT(DISTINCT r.id) 
         FROM rooms r
         WHERE r.property_id = p.id 
           AND r.is_active = 1
           AND r.total_bed > IFNULL(
             (SELECT COUNT(ba.id) 
              FROM bed_assignments ba 
              WHERE ba.room_id = r.id AND ba.is_available = 0), 
             0
           )
        ) as available_rooms_count,
        
        -- Count total active rooms
        (SELECT COUNT(*) 
         FROM rooms r 
         WHERE r.property_id = p.id AND r.is_active = 1) as total_rooms_count
        
       FROM properties p
       WHERE p.is_active = 1
       ORDER BY p.name, p.city_id`
    );

    console.log(`✅ Found ${properties.length} active properties`);

    res.json({
      success: true,
      data: properties
    });

  } catch (err) {
    console.error('🔥 Error getting active properties:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
}

// Get available rooms for a property
async getAvailableRooms(req, res) {
  try {
    const tenant_id = req.user?.id;
    const propertyId = req.params.propertyId;
    
    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!propertyId || isNaN(propertyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid property ID is required'
      });
    }

    console.log(`🚪 Getting available rooms for property ID: ${propertyId}`);

    // Get current tenant info to exclude current room
    const [tenantCurrentRoom] = await db.query(
      `SELECT room_id FROM tenants WHERE id = ?`,
      [tenant_id]
    );
    
    const currentRoomId = tenantCurrentRoom[0]?.room_id;

    const [rooms] = await db.query(
      `SELECT 
        r.id,
        r.room_number,
        r.sharing_type,
        r.total_bed,
        r.floor,
        r.property_id,
        r.rent_per_bed,
        r.room_type,
        r.description,
        r.is_active,
        r.has_attached_bathroom,
        r.has_balcony,
        r.has_ac,
        r.amenities as room_amenities,
        r.photo_urls,
        r.allow_couples,
        
        -- Calculate occupied beds
        IFNULL(ba.occupied_count, 0) as occupied_beds,
        
        -- Calculate available beds
        (r.total_bed - IFNULL(ba.occupied_count, 0)) as available_beds,
        
        -- Property info
        p.name as property_name,
        p.address as property_address,
        p.city_id as city,
        p.area,
        p.state,
        p.amenities as property_amenities
        
       FROM rooms r
       
       LEFT JOIN (
         SELECT room_id, COUNT(*) as occupied_count
         FROM bed_assignments
         WHERE is_available = 0
         GROUP BY room_id
       ) ba ON r.id = ba.room_id
       
       LEFT JOIN properties p ON r.property_id = p.id
       
       WHERE r.property_id = ? 
         AND r.is_active = 1
         AND (r.total_bed - IFNULL(ba.occupied_count, 0)) > 0
         ${currentRoomId ? 'AND r.id != ?' : ''}
       
       ORDER BY r.room_number, r.floor`,
      currentRoomId ? [propertyId, currentRoomId] : [propertyId]
    );

    console.log(`✅ Found ${rooms.length} available rooms for property ${propertyId}`);

    res.json({
      success: true,
      data: rooms
    });

  } catch (err) {
    console.error('🔥 Error getting available rooms:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
}

// Get change bed reasons from master values
async getChangeBedReasons(req, res) {
  try {
    const tenant_id = req.user?.id;
    
    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('📋 Getting change bed reasons...');

    // Try to get from master values - your table structure
    const [reasons] = await db.query(
      `SELECT 
        mv.id,
        mv.value,
        mv.is_active,
        mt.code as reason_code,
        mt.name as reason_name
       
       FROM master_values mv
       JOIN master_types mt ON mv.master_type_id = mt.id
       
       WHERE mt.code IN ('CHANGE_REASON', 'CHANGE_BED_REASON', 'CHANGE_ROOM_REASON')
         AND mv.is_active = 1
         AND mt.is_active = 1
       
       ORDER BY mv.id`
    );

    if (reasons.length > 0) {
      console.log(`✅ Found ${reasons.length} change reasons from master values`);
      
      const formattedReasons = reasons.map(reason => ({
        id: reason.id,
        value: reason.value,
        description: reason.reason_name || '',
        display_order: reason.id, // Using ID as display order
        is_active: reason.is_active,
        reason_code: reason.reason_code
      }));
      
      return res.json({
        success: true,
        data: formattedReasons
      });
    }

    // Fallback reasons
    console.log('⚠️ No reasons found in master values, using fallback');
    
    const fallbackReasons = [
      { id: 1, value: 'Need larger room', description: 'Need more space', display_order: 1, is_active: 1, reason_code: 'LARGER_ROOM' },
      { id: 2, value: 'Need smaller room', description: 'Want to reduce rent', display_order: 2, is_active: 1, reason_code: 'SMALLER_ROOM' },
      { id: 3, value: 'Roommate issues', description: 'Issues with current roommates', display_order: 3, is_active: 1, reason_code: 'ROOMMATE_ISSUES' },
      { id: 4, value: 'Noise concerns', description: 'Too much noise in current room', display_order: 4, is_active: 1, reason_code: 'NOISE_CONCERNS' },
      { id: 5, value: 'Medical reasons', description: 'Health-related requirements', display_order: 5, is_active: 1, reason_code: 'MEDICAL' },
      { id: 6, value: 'Privacy concerns', description: 'Need more privacy', display_order: 6, is_active: 1, reason_code: 'PRIVACY' },
      { id: 7, value: 'Change floor', description: 'Prefer different floor', display_order: 7, is_active: 1, reason_code: 'CHANGE_FLOOR' },
      { id: 8, value: 'Other personal reasons', description: 'Other personal requirements', display_order: 8, is_active: 1, reason_code: 'OTHER' }
    ];

    res.json({
      success: true,
      data: fallbackReasons
    });

  } catch (err) {
    console.error('🔥 Error getting change bed reasons:', err);
    
    // Return fallback reasons on error
    const fallbackReasons = [
      { id: 1, value: 'Need larger room', description: 'Need more space', display_order: 1, is_active: 1, reason_code: 'LARGER_ROOM' },
      { id: 2, value: 'Need smaller room', description: 'Want to reduce rent', display_order: 2, is_active: 1, reason_code: 'SMALLER_ROOM' },
      { id: 3, value: 'Roommate issues', description: 'Issues with current roommates', display_order: 3, is_active: 1, reason_code: 'ROOMMATE_ISSUES' },
      { id: 4, value: 'Other personal reasons', description: 'Other personal requirements', display_order: 4, is_active: 1, reason_code: 'OTHER' }
    ];

    res.json({
      success: true,
      data: fallbackReasons
    });
  }
}

// Get vacate reasons (if not already implemented)
async getVacateReasons(req, res) {
  try {
    const [reasons] = await db.query(
      `SELECT 
        mv.id,
        mv.value,
        mv.is_active,
        mt.code as reason_code
       
       FROM master_values mv
       JOIN master_types mt ON mv.master_type_id = mt.id
       
       WHERE mt.code = 'VACATE_REASON' 
         AND mv.is_active = 1
         AND mt.is_active = 1
       
       ORDER BY mv.id`
    );

    if (reasons.length > 0) {
      const formattedReasons = reasons.map(reason => ({
        id: reason.id,
        value: reason.value,
        description: reason.reason_code || '',
        display_order: reason.id,
        is_active: reason.is_active
      }));
      
      return res.json({
        success: true,
        data: formattedReasons
      });
    }

    // Fallback reasons
    const fallbackReasons = [
      { id: 1, value: 'Job Change/Relocation', description: 'Changing job or moving to new location', display_order: 1, is_active: 1 },
      { id: 2, value: 'Personal Reasons', description: 'Personal or family-related reasons', display_order: 2, is_active: 1 },
      { id: 3, value: 'Financial Issues', description: 'Budget constraints or financial difficulties', display_order: 3, is_active: 1 },
      { id: 4, value: 'Found Better Accommodation', description: 'Found better or cheaper accommodation', display_order: 4, is_active: 1 },
      { id: 5, value: 'Completing Studies', description: 'Education completed or leaving the city', display_order: 5, is_active: 1 },
      { id: 6, value: 'Medical Reasons', description: 'Health-related issues', display_order: 6, is_active: 1 },
      { id: 7, value: 'Family Reasons', description: 'Family commitments or issues', display_order: 7, is_active: 1 },
      { id: 8, value: 'Dissatisfied with Services', description: 'Not satisfied with the services provided', display_order: 8, is_active: 1 }
    ];

    res.json({
      success: true,
      data: fallbackReasons
    });

  } catch (err) {
    console.error('🔥 Error getting vacate reasons:', err);
    
    const fallbackReasons = [
      { id: 1, value: 'Job Change/Relocation', display_order: 1, is_active: 1 },
      { id: 2, value: 'Personal Reasons', display_order: 2, is_active: 1 },
      { id: 3, value: 'Financial Issues', display_order: 3, is_active: 1 },
      { id: 4, value: 'Found Better Accommodation', display_order: 4, is_active: 1 }
    ];

    res.json({
      success: true,
      data: fallbackReasons
    });
  }
}

// Add this helper function in your controller
async getChangeReasonName(reasonId) {
  try {
    const [reason] = await db.query(
      `SELECT value FROM master_values WHERE id = ?`,
      [reasonId]
    );
    return reason[0]?.value || 'Not specified';
  } catch (error) {
    console.error('Error getting change reason name:', error);
    return 'Not specified';
  }
}


async getLeaveTypes(req, res) {
  try {
    const tenant_id = req.user?.id;
    
    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('📋 Getting leave types...');

    try {
      // Try to get from master_values table using your schema
      const [leaveTypes] = await db.query(
        `SELECT 
          mv.id,
          mv.value,
          mv.is_active,
          mt.code as type_code,
          mt.name as type_name
         FROM master_values mv
         JOIN master_types mt ON mv.master_type_id = mt.id
         WHERE mt.code IN ('LEAVE_REASON')
           AND mv.is_active = 1
           AND mt.is_active = 1
         ORDER BY mv.id, mv.value`
      );

      if (leaveTypes.length > 0) {
        console.log(`✅ Found ${leaveTypes.length} leave types from database`);
        
        const formattedTypes = leaveTypes.map(type => ({
          id: type.id,
          value: type.value,
          description: type.type_name || type.value, // Use type_name or value as description
          display_order: type.id, // Using ID as display order
          is_active: type.is_active,
          type_code: type.type_code
        }));
        
        return res.json({
          success: true,
          data: formattedTypes
        });
      }
    } catch (dbError) {
      console.log('⚠️ Database query failed, using fallback:', dbError.message);
    }

    // Fallback leave types
    console.log('⚠️ No leave types found in database, using fallback');
    
    const fallbackTypes = [
      { id: 1, value: 'Personal Leave', description: 'For personal reasons', display_order: 1, is_active: true, type_code: 'PERSONAL' },
      { id: 2, value: 'Vacation', description: 'Annual vacation leave', display_order: 2, is_active: true, type_code: 'VACATION' },
      { id: 3, value: 'Emergency Leave', description: 'Family or personal emergency', display_order: 3, is_active: true, type_code: 'EMERGENCY' },
      { id: 4, value: 'Medical Leave', description: 'Health-related leave with doctor certificate', display_order: 4, is_active: true, type_code: 'MEDICAL' },
      { id: 5, value: 'Family Reasons', description: 'Family functions or emergencies', display_order: 5, is_active: true, type_code: 'FAMILY' },
      { id: 6, value: 'Festival Leave', description: 'For festivals and celebrations', display_order: 6, is_active: true, type_code: 'FESTIVAL' },
      { id: 7, value: 'Educational Leave', description: 'For exams or educational purposes', display_order: 7, is_active: true, type_code: 'EDUCATIONAL' },
      { id: 8, value: 'Other', description: 'Other reasons not listed', display_order: 8, is_active: true, type_code: 'OTHER' }
    ];

    res.json({
      success: true,
      data: fallbackTypes
    });

  } catch (err) {
    console.error('🔥 Error getting leave types:', err);
    
    // Return fallback types on error
    const fallbackTypes = [
      { id: 1, value: 'Personal Leave', description: 'For personal reasons', display_order: 1, is_active: true, type_code: 'PERSONAL' },
      { id: 2, value: 'Vacation', description: 'Annual vacation leave', display_order: 2, is_active: true, type_code: 'VACATION' },
      { id: 3, value: 'Emergency Leave', description: 'Family or personal emergency', display_order: 3, is_active: true, type_code: 'EMERGENCY' },
      { id: 4, value: 'Medical Leave', description: 'Health-related leave', display_order: 4, is_active: true, type_code: 'MEDICAL' }
    ];

    res.json({
      success: true,
      message: 'Using fallback leave types',
      data: fallbackTypes
    });
  }
}

// Add these methods to your TenantRequestController class:

// Get complaint categories from master_types - EXACT FIELDS VERSION
async getComplaintCategories(req, res) {
  try {
    const tenant_id = req.user?.id;
    
    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('📋 Getting complaint categories...');

    // SIMPLE QUERY: Just get all active master_types
    const [allTypes] = await db.query(
      `SELECT 
        id,
        code,
        name,
        tab,
        is_active
       FROM master_types
       WHERE is_active = 1
       ORDER BY name`
    );

    console.log(`✅ Found ${allTypes.length} total master types`);
    
    // Log what we found
    allTypes.forEach(type => {
      console.log(`ID: ${type.id}, Code: "${type.code}", Name: "${type.name}", Tab: "${type.tab}"`);
    });

    // Filter for complaint types (case-insensitive)
    const complaintTypes = allTypes.filter(type => 
      type.tab && type.tab.toLowerCase() === 'complaint'
    );

    console.log(`✅ Filtered to ${complaintTypes.length} complaint categories`);
    
    if (complaintTypes.length === 0) {
      console.log('⚠️ No complaint categories found with tab="Complaint"');
      
      // If still nothing, return a manual list
      console.log('⚠️ No complaint categories found, returning manual list');
      const manualList = [
        { id: 9, code: 'COMPLAINT_FOOD', name: 'Food', tab: 'Complaint', is_active: 1 },
        { id: 10, code: 'COMPLAINT_ROOM', name: 'Room', tab: 'Complaint', is_active: 1 },
        { id: 11, code: 'COMPLAINT_STAFF', name: 'Staff', tab: 'Complaint', is_active: 1 },
        { id: 12, code: 'COMPLAINT_OTHER', name: 'Other', tab: 'Complaint', is_active: 1 }
      ];
      
      return res.json({
        success: true,
        data: manualList,
        note: 'Using manual fallback list'
      });
    }

    // Return the found complaint types
    res.json({
      success: true,
      data: complaintTypes,
      note: 'Found using tab="Complaint" filter'
    });

  } catch (err) {
    console.error('🔥 Error getting complaint categories:', err);
    
    // Always return some data even on error
    const fallbackCategories = [
      { id: 9, code: 'COMPLAINT_FOOD', name: 'Food', tab: 'Complaint', is_active: 1 },
      { id: 10, code: 'COMPLAINT_ROOM', name: 'Room', tab: 'Complaint', is_active: 1 },
      { id: 11, code: 'COMPLAINT_STAFF', name: 'Staff', tab: 'Complaint', is_active: 1 },
      { id: 12, code: 'COMPLAINT_OTHER', name: 'Other', tab: 'Complaint', is_active: 1 }
    ];

    res.json({
      success: false,
      message: 'Database error, using fallback data',
      data: fallbackCategories
    });
  }
}

// Get complaint reasons for a specific category - EXACT FIELDS VERSION
async getComplaintReasons(req, res) {
  try {
    const tenant_id = req.user?.id;
    const { categoryId } = req.params;
    
    if (!tenant_id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!categoryId || isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid category ID is required'
      });
    }

    console.log(`📋 Getting complaint reasons for category ID: ${categoryId}`);

    // Direct query to master_values - ONLY EXACT FIELDS
    const [reasons] = await db.query(
      `SELECT 
        id,
        value,
        master_type_id,
        is_active
       FROM master_values
       WHERE master_type_id = ? AND is_active = 1
       ORDER BY value`,
      [categoryId]
    );

    console.log(`✅ Found ${reasons.length} reasons for category ${categoryId}`);
    
    if (reasons.length > 0) {
      console.log('📝 Reasons found:', reasons.map(r => r.value));
    }

    // If no reasons found, check what master_type exists
    if (reasons.length === 0) {
      console.log(`⚠️ No reasons found for category ID ${categoryId}`);
      
      // Check what master_type this is
      const [categoryInfo] = await db.query(
        `SELECT * FROM master_types WHERE id = ?`,
        [categoryId]
      );
      
      if (categoryInfo.length > 0) {
        console.log(`ℹ️ Category ${categoryId} exists:`, categoryInfo[0].name);
      }
      
      // Provide fallback based on category ID
      let fallbackReasons = [];
      const catId = parseInt(categoryId);
      
      if (catId === 9) { // Food
        fallbackReasons = [
          { id: 33, value: 'Oily food', master_type_id: 9, is_active: 1 },
          { id: 34, value: 'Too spicy', master_type_id: 9, is_active: 1 },
          { id: 35, value: 'Bad quality', master_type_id: 9, is_active: 1 },
          { id: 36, value: 'Not fresh', master_type_id: 9, is_active: 1 },
          { id: 37, value: 'Others', master_type_id: 9, is_active: 1 }
        ];
      } else {
        // Generic fallback for other categories
        fallbackReasons = [
          { id: 1000, value: 'General issue', master_type_id: catId, is_active: 1 },
          { id: 1001, value: 'Others', master_type_id: catId, is_active: 1 }
        ];
      }
      
      return res.json({
        success: true,
        data: fallbackReasons,
        note: 'Using fallback reasons'
      });
    }

    res.json({
      success: true,
      data: reasons
    });

  } catch (err) {
    console.error('🔥 Error getting complaint reasons:', err);
    
    // Provide fallback
    const catId = parseInt(req.params.categoryId);
    let fallbackReasons = [];
    
    if (catId === 9) { // Food
      fallbackReasons = [
        { id: 33, value: 'Oily food', master_type_id: 9, is_active: 1 },
        { id: 34, value: 'Too spicy', master_type_id: 9, is_active: 1 },
        { id: 35, value: 'Bad quality', master_type_id: 9, is_active: 1 },
        { id: 36, value: 'Not fresh', master_type_id: 9, is_active: 1 },
        { id: 37, value: 'Others', master_type_id: 9, is_active: 1 }
      ];
    } else {
      fallbackReasons = [
        { id: 1000, value: 'General issue', master_type_id: catId, is_active: 1 },
        { id: 1001, value: 'Others', master_type_id: catId, is_active: 1 }
      ];
    }
    
    res.json({
      success: false,
      message: 'Database error, using fallback data',
      data: fallbackReasons
    });
  }
}

}

module.exports = new TenantRequestController();