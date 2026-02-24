// controllers/adminChangeBedController.js
const db = require('../config/db');
const notificationController = require("./tenantNotificationController"); 

class ChangeBedRequestController {
  
async getChangeBedRequests(req, res) {
  try {
    const {
      status = '',
      search = '',
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT 
        -- Tenant request info
        tr.id as tenant_request_id,
        tr.tenant_id,
        tr.property_id,
        tr.request_type,
        tr.title,
        tr.description,
        tr.priority,
        tr.status as tenant_request_status,
        tr.admin_notes as tenant_admin_notes,
        tr.assigned_to,
        tr.resolved_at,
        tr.created_at,
        tr.updated_at,
        
        -- Change bed request info
        cbr.id,
        cbr.current_property_id,
        cbr.current_room_id,
        cbr.current_bed_number,
        cbr.preferred_property_id,
        cbr.preferred_room_id,
        cbr.change_reason_id,
        cbr.shifting_date,
        cbr.notes,
        cbr.assigned_bed_number,
        cbr.rent_difference,
        cbr.admin_notes,
        cbr.request_status,
        cbr.created_at as change_request_created_at,
        cbr.updated_at as change_request_updated_at,
        
        -- Tenant info
        t.full_name as tenant_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        
        -- ========== CURRENT ROOM INFO ==========
        cr.room_number as current_room_number,
        cr.rent_per_bed as current_rent,
        cr.total_bed as current_total_beds,
        cp.name as current_property_name,
        cp.address as current_property_address,
        
        -- ========== REQUESTED ROOM INFO ==========
        rr.room_number as requested_room_number,
        rr.rent_per_bed as requested_rent,
        rr.total_bed as requested_total_beds,
        rr.floor as requested_floor,
        rr.has_ac as requested_has_ac,
        rr.has_attached_bathroom as requested_has_attached_bathroom,
        rr.has_balcony as requested_has_balcony,
        rp.name as requested_property_name,
        rp.address as requested_property_address,
        
        -- Change reason
        mv.value as change_reason,
        mt.code as change_reason_code,
        
        -- Occupied beds for requested room
        (
          SELECT COUNT(*) 
          FROM bed_assignments ba 
          WHERE ba.room_id = cbr.preferred_room_id 
            AND ba.is_available = 0
            AND ba.tenant_id IS NOT NULL
        ) as requested_occupied_beds
        
      FROM tenant_requests tr
      
      -- Join tenant info
      INNER JOIN tenants t ON tr.tenant_id = t.id
      
      -- INNER JOIN change_bed_requests (change to INNER JOIN to ensure we only get requests with data)
      INNER JOIN change_bed_requests cbr ON tr.id = cbr.tenant_request_id
      
      -- Current room joins
      LEFT JOIN rooms cr ON cbr.current_room_id = cr.id
      LEFT JOIN properties cp ON cr.property_id = cp.id
      
      -- Requested room joins - IMPORTANT: These must be present
      LEFT JOIN rooms rr ON cbr.preferred_room_id = rr.id
      LEFT JOIN properties rp ON rr.property_id = rp.id
      
      -- Change reason joins
      LEFT JOIN master_values mv ON cbr.change_reason_id = mv.id
      LEFT JOIN master_types mt ON mv.master_type_id = mt.id
      
      WHERE tr.request_type = 'change_bed'
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM tenant_requests tr
      INNER JOIN change_bed_requests cbr ON tr.id = cbr.tenant_request_id
      WHERE tr.request_type = 'change_bed'
    `;

    const queryParams = [];
    const countParams = [];

    // Status filter
    if (status && status !== 'all' && status !== '') {
      baseQuery += ` AND cbr.request_status = ?`;
      countQuery += ` AND cbr.request_status = ?`;
      queryParams.push(status);
      countParams.push(status);
    }

    // Search filter
    if (search) {
      baseQuery += ` AND (
        t.full_name LIKE ? OR 
        t.email LIKE ? OR 
        t.phone LIKE ? OR
        cp.name LIKE ? OR
        rp.name LIKE ? OR
        tr.title LIKE ? OR
        tr.description LIKE ?
      )`;
      countQuery += ` AND (
        t.full_name LIKE ? OR 
        t.email LIKE ? OR 
        t.phone LIKE ? OR
        cp.name LIKE ? OR
        rp.name LIKE ?
      )`;
      
      const searchTerm = `%${search}%`;
      for (let i = 0; i < 7; i++) {
        queryParams.push(searchTerm);
      }
      for (let i = 0; i < 5; i++) {
        countParams.push(searchTerm);
      }
    }

    // Order by
    const orderByMap = {
      'created_at': 'cbr.created_at',
      'shifting_date': 'cbr.shifting_date',
      'priority': 'tr.priority'
    };
    
    const orderField = orderByMap[sort_by] || 'cbr.created_at';
    baseQuery += ` ORDER BY ${orderField} ${sort_order.toUpperCase()}`;

    // Pagination
    baseQuery += ` LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), offset);

    console.log('Executing query for change bed requests...');
    console.log('Status filter:', status);
    console.log('Search filter:', search);

    // Execute queries
    const [requests] = await db.query(baseQuery, queryParams);
    const [countResult] = await db.query(countQuery, countParams);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    console.log(`Found ${requests.length} change bed requests out of ${total} total`);

    // Format the response
    const formattedRequests = requests.map(req => {
      // Log each request's data for debugging
      console.log(`Request ID ${req.tenant_request_id}:`, {
        requested_room_number: req.requested_room_number,
        requested_rent: req.requested_rent,
        requested_property_name: req.requested_property_name,
        requested_occupied_beds: req.requested_occupied_beds
      });

      // Calculate rent difference
      let rentDifference = req.rent_difference;
      if (!rentDifference && req.current_rent && req.requested_rent) {
        const currentRentNum = parseFloat(req.current_rent) || 0;
        const requestedRentNum = parseFloat(req.requested_rent) || 0;
        rentDifference = (requestedRentNum - currentRentNum).toFixed(2);
      }
      
      return {
        id: req.id,
        tenant_request_id: req.tenant_request_id,
        tenant_id: req.tenant_id,
        title: req.title,
        description: req.description,
        priority: req.priority,
        tenant_request_status: req.tenant_request_status,
        created_at: req.created_at,
        
        // Current room details
        current_property_id: req.current_property_id,
        current_room_id: req.current_room_id,
        current_bed_number: req.current_bed_number,
        current_room_number: req.current_room_number,
        current_rent: req.current_rent,
        current_property_name: req.current_property_name,
        current_total_beds: req.current_total_beds,
        current_occupied_beds: req.current_occupied_beds || 0,
        
        // Requested room details - ENSURE THESE ARE INCLUDED
        preferred_property_id: req.preferred_property_id,
        preferred_room_id: req.preferred_room_id,
        requested_room_number: req.requested_room_number,
        requested_rent: req.requested_rent,
        requested_property_name: req.requested_property_name,
        requested_total_beds: req.requested_total_beds,
        requested_occupied_beds: req.requested_occupied_beds || 0,
        requested_floor: req.requested_floor,
        requested_has_ac: req.requested_has_ac,
        requested_has_attached_bathroom: req.requested_has_attached_bathroom,
        requested_has_balcony: req.requested_has_balcony,
        
        // Change request details
        change_reason_id: req.change_reason_id,
        change_reason: req.change_reason,
        change_reason_code: req.change_reason_code,
        shifting_date: req.shifting_date,
        notes: req.notes,
        assigned_bed_number: req.assigned_bed_number,
        rent_difference: rentDifference,
        admin_notes: req.admin_notes || req.tenant_admin_notes,
        request_status: req.request_status,
        
        // Tenant info
        tenant_name: req.tenant_name,
        tenant_email: req.tenant_email,
        tenant_phone: req.tenant_phone
      };
    });

    res.json({
      success: true,
      data: formattedRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: totalPages
      }
    });

  } catch (error) {
    console.error('Error getting change bed requests:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}

  // Get single change bed request by ID
async getChangeBedRequestById(req, res) {
  try {
    const { id } = req.params;

    console.log(`🔍 Getting change bed request details for ID: ${id}`);

    const query = `
      SELECT 
        -- Tenant request info
        tr.id as tenant_request_id,
        tr.tenant_id,
        tr.property_id,
        tr.request_type,
        tr.title,
        tr.description,
        tr.priority,
        tr.status as tenant_request_status,
        tr.admin_notes as tenant_admin_notes,
        tr.assigned_to,
        tr.resolved_at,
        tr.created_at,
        tr.updated_at,
        
        -- Change bed request info
        cbr.id,
        cbr.current_property_id,
        cbr.current_room_id,
        cbr.current_bed_number,
        cbr.preferred_property_id,
        cbr.preferred_room_id,
        cbr.change_reason_id,
        cbr.shifting_date,
        cbr.notes,
        cbr.assigned_bed_number,
        cbr.rent_difference,
        cbr.admin_notes,
        cbr.request_status,
        cbr.created_at as change_request_created_at,
        cbr.updated_at as change_request_updated_at,
        
        -- Tenant info
        t.full_name as tenant_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        
        -- CURRENT ROOM INFO
        cr.room_number as current_room_number,
        cr.rent_per_bed as current_rent,
        cr.total_bed as current_total_beds,
        cr.floor as current_floor,
        cr.has_ac as current_has_ac,
        cr.has_attached_bathroom as current_has_attached_bathroom,
        cr.has_balcony as current_has_balcony,
        cp.name as current_property_name,
        cp.address as current_property_address,
        
        -- REQUESTED ROOM INFO - ENSURE THESE ARE INCLUDED
        rr.room_number as requested_room_number,
        rr.rent_per_bed as requested_rent,
        rr.total_bed as requested_total_beds,
        rr.floor as requested_floor,
        rr.has_ac as requested_has_ac,
        rr.has_attached_bathroom as requested_has_attached_bathroom,
        rr.has_balcony as requested_has_balcony,
        rp.name as requested_property_name,
        rp.address as requested_property_address,
        
        -- Change reason
        mv.value as change_reason,
        mt.code as change_reason_code,
        
        -- Occupied beds for requested room
        (
          SELECT COUNT(*) 
          FROM bed_assignments ba 
          WHERE ba.room_id = cbr.preferred_room_id 
            AND ba.is_available = 0
            AND ba.tenant_id IS NOT NULL
        ) as requested_occupied_beds
        
      FROM tenant_requests tr
      
      -- Join tenant info
      INNER JOIN tenants t ON tr.tenant_id = t.id
      
      -- INNER JOIN change_bed_requests
      INNER JOIN change_bed_requests cbr ON tr.id = cbr.tenant_request_id
      
      -- Current room joins
      LEFT JOIN rooms cr ON cbr.current_room_id = cr.id
      LEFT JOIN properties cp ON cr.property_id = cp.id
      
      -- Requested room joins - CRITICAL FOR DISPLAYING DATA
      LEFT JOIN rooms rr ON cbr.preferred_room_id = rr.id
      LEFT JOIN properties rp ON rr.property_id = rp.id
      
      -- Change reason joins
      LEFT JOIN master_values mv ON cbr.change_reason_id = mv.id
      LEFT JOIN master_types mt ON mv.master_type_id = mt.id
      
      WHERE tr.request_type = 'change_bed'
        AND cbr.id = ?
      
      LIMIT 1
    `;

    const [requests] = await db.query(query, [id]);

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Change bed request not found'
      });
    }

    const request = requests[0];
    
    console.log('📊 Raw data for request:', {
      id: request.id,
      requested_room_number: request.requested_room_number,
      requested_rent: request.requested_rent,
      requested_property_name: request.requested_property_name,
      requested_occupied_beds: request.requested_occupied_beds,
      change_reason: request.change_reason,
      shifting_date: request.shifting_date
    });

    // Calculate rent difference
    let rentDifference = request.rent_difference;
    if (!rentDifference && request.current_rent && request.requested_rent) {
      const currentRentNum = parseFloat(request.current_rent) || 0;
      const requestedRentNum = parseFloat(request.requested_rent) || 0;
      rentDifference = (requestedRentNum - currentRentNum).toFixed(2);
    }

    const response = {
      id: request.id,
      tenant_request_id: request.tenant_request_id,
      tenant_id: request.tenant_id,
      title: request.title,
      description: request.description,
      priority: request.priority,
      tenant_request_status: request.tenant_request_status,
      created_at: request.created_at,
      
      // Current room details
      current_property_id: request.current_property_id,
      current_room_id: request.current_room_id,
      current_bed_number: request.current_bed_number,
      current_room_number: request.current_room_number,
      current_rent: request.current_rent,
      current_property_name: request.current_property_name,
      current_total_beds: request.current_total_beds,
      current_occupied_beds: request.current_occupied_beds || 0,
      current_floor: request.current_floor,
      current_has_ac: request.current_has_ac,
      current_has_attached_bathroom: request.current_has_attached_bathroom,
      current_has_balcony: request.current_has_balcony,
      
      // Requested room details - ENSURE THESE ARE INCLUDED
      preferred_property_id: request.preferred_property_id,
      preferred_room_id: request.preferred_room_id,
      requested_room_number: request.requested_room_number,
      requested_rent: request.requested_rent,
      requested_property_name: request.requested_property_name,
      requested_total_beds: request.requested_total_beds,
      requested_occupied_beds: request.requested_occupied_beds || 0,
      requested_floor: request.requested_floor,
      requested_has_ac: request.requested_has_ac,
      requested_has_attached_bathroom: request.requested_has_attached_bathroom,
      requested_has_balcony: request.requested_has_balcony,
      
      // Change request details
      change_reason_id: request.change_reason_id,
      change_reason: request.change_reason || 'Not specified',
      change_reason_code: request.change_reason_code,
      shifting_date: request.shifting_date,
      notes: request.notes || 'No notes provided',
      assigned_bed_number: request.assigned_bed_number,
      rent_difference: rentDifference,
      admin_notes: request.admin_notes || request.tenant_admin_notes,
      request_status: request.request_status,
      
      // Tenant info
      tenant_name: request.tenant_name,
      tenant_email: request.tenant_email,
      tenant_phone: request.tenant_phone
    };

    console.log('✅ Sending response with data:', {
      requested_room_number: response.requested_room_number,
      requested_rent: response.requested_rent,
      requested_property_name: response.requested_property_name,
      rent_difference: response.rent_difference,
      change_reason: response.change_reason
    });
    
    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error getting change bed request by ID:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}


  // Update change bed request status
 // Update change bed request status - MODIFIED TO ADD NOTIFICATIONS
  async updateRequestStatus(req, res) {
    try {
      const { id } = req.params;
      const {
        request_status,
        assigned_bed_number,
        rent_difference,
        admin_notes,
        process_request = false
      } = req.body;

      // Validate request exists and get tenant info
      const [existingRequest] = await db.query(
        `SELECT cbr.*, tr.tenant_id, t.full_name as tenant_name 
         FROM change_bed_requests cbr
         JOIN tenant_requests tr ON cbr.tenant_request_id = tr.id
         JOIN tenants t ON tr.tenant_id = t.id
         WHERE cbr.id = ?`,
        [id]
      );

      if (existingRequest.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Change bed request not found'
        });
      }

      const changeBedRequest = existingRequest[0];
      const tenantId = changeBedRequest.tenant_id;
      const oldStatus = changeBedRequest.request_status;
      const newStatus = request_status;

      // Start transaction
      await db.query('START TRANSACTION');

      try {
        // Update change_bed_requests table
        const updateFields = [];
        const updateValues = [];

        updateFields.push('request_status = ?');
        updateValues.push(request_status);

        if (assigned_bed_number !== undefined) {
          updateFields.push('assigned_bed_number = ?');
          updateValues.push(assigned_bed_number);
        }

        if (rent_difference !== undefined) {
          updateFields.push('rent_difference = ?');
          updateValues.push(rent_difference);
        }

        if (admin_notes !== undefined) {
          updateFields.push('admin_notes = ?');
          updateValues.push(admin_notes);
        }

        updateFields.push('updated_at = NOW()');
        updateValues.push(id);

        await db.query(
          `UPDATE change_bed_requests SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );

        // Update tenant_requests status if needed
        if (request_status === 'processed' || request_status === 'rejected') {
          const tenantRequestStatus = request_status === 'processed' ? 'completed' : 'rejected';
          
          await db.query(
            `UPDATE tenant_requests SET status = ?, updated_at = NOW() WHERE id = ?`,
            [tenantRequestStatus, changeBedRequest.tenant_request_id]
          );
        }

        // If status is approved and process_request is true, process the bed change
        if (request_status === 'approved' && process_request) {
          await this.processBedChange(changeBedRequest, assigned_bed_number);
        }

        await db.query('COMMIT');

        // SEND NOTIFICATION TO TENANT
        if (newStatus && newStatus !== oldStatus) {
          try {
            await this.sendStatusNotification(
              changeBedRequest.tenant_request_id,
              tenantId,
              newStatus,
              admin_notes,
              changeBedRequest
            );
            console.log(`📨 Notification sent to tenant ${tenantId} for change bed request ${id}`);
          } catch (notifError) {
            console.error('❌ Failed to send notification:', notifError);
            // Don't fail the main operation if notification fails
          }
        }

        // If bed is assigned, send assignment notification
        if (assigned_bed_number && request_status === 'approved') {
          try {
            await notificationController.createNotification({
              tenantId,
              title: 'Bed Number Assigned',
              message: `For your change bed request #${changeBedRequest.tenant_request_id}, bed number ${assigned_bed_number} has been assigned in ${changeBedRequest.preferred_room_id ? 'the requested room' : 'your new room'}.`,
              notificationType: 'change_bed',
              relatedEntityType: 'change_bed',
              relatedEntityId: changeBedRequest.tenant_request_id,
              priority: 'medium'
            });
          } catch (notifError) {
            console.error('❌ Failed to send assignment notification:', notifError);
          }
        }

        res.json({
          success: true,
          message: 'Request status updated successfully'
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error updating request status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // NEW METHOD: Send status notification
  async sendStatusNotification(requestId, tenantId, status, adminNotes, requestData) {
    const statusMessages = {
      'pending': {
        title: 'Change Bed Request Received',
        message: adminNotes 
          ? `Your change bed request #${requestId} has been received. Notes: ${adminNotes}`
          : `Your change bed request #${requestId} has been received and is pending review.`
      },
      'approved': {
        title: 'Change Bed Request Approved',
        message: adminNotes
          ? `Your change bed request #${requestId} has been approved! ${adminNotes}`
          : `Your change bed request #${requestId} has been approved! We'll process it shortly.`
      },
      'rejected': {
        title: 'Change Bed Request Rejected',
        message: adminNotes
          ? `Your change bed request #${requestId} has been rejected. Reason: ${adminNotes}`
          : `Your change bed request #${requestId} has been rejected. Please contact support for more information.`
      },
      'processed': {
        title: 'Change Bed Request Completed',
        message: adminNotes
          ? `Your change bed request #${requestId} has been processed successfully. ${adminNotes}`
          : `Your change bed request #${requestId} has been processed. You have been moved to your new room.`
      }
    };

    const notification = statusMessages[status] || {
      title: 'Change Bed Request Updated',
      message: adminNotes
        ? `Your change bed request #${requestId} status has been updated to ${status}. Notes: ${adminNotes}`
        : `Your change bed request #${requestId} status has been updated to ${status}.`
    };

    // Add rent difference info if available
    if (status === 'approved' && requestData.rent_difference) {
      const diff = parseFloat(requestData.rent_difference);
      const diffText = diff > 0 
        ? `Your new rent will be ₹${diff} higher.` 
        : diff < 0 
          ? `Your new rent will be ₹${Math.abs(diff)} lower.` 
          : 'Your rent will remain the same.';
      
      notification.message += ` ${diffText}`;
    }

    // Add assigned bed info if available
    if (status === 'approved' && requestData.assigned_bed_number) {
      notification.message += ` Bed number ${requestData.assigned_bed_number} has been reserved for you.`;
    }

    return await notificationController.createNotification({
      tenantId,
      title: notification.title,
      message: notification.message,
      notificationType: 'change_bed',
      relatedEntityType: 'change_bed',
      relatedEntityId: requestId,
      priority: status === 'approved' ? 'high' : (status === 'rejected' ? 'medium' : 'low')
    });
  }

  // Process bed change (move tenant to new bed)
  async processBedChange(changeBedRequest, assignedBedNumber) {
    try {
      // Get tenant ID from tenant_request
      const [tenantRequest] = await db.query(
        'SELECT tenant_id FROM tenant_requests WHERE id = ?',
        [changeBedRequest.tenant_request_id]
      );

      if (tenantRequest.length === 0) {
        throw new Error('Tenant request not found');
      }

      const tenantId = tenantRequest[0].tenant_id;

      // Get current bed assignment
      const [currentAssignment] = await db.query(
        `SELECT id FROM bed_assignments 
         WHERE tenant_id = ? AND is_available = 0 
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId]
      );

      if (currentAssignment.length > 0) {
        // Mark current bed as available
        await db.query(
          'UPDATE bed_assignments SET is_available = 1, updated_at = NOW() WHERE id = ?',
          [currentAssignment[0].id]
        );
      }

      // Create new bed assignment
      const bedNumber = assignedBedNumber || 1; // Default to bed 1 if not assigned
      
      await db.query(
        `INSERT INTO bed_assignments 
         (room_id, bed_number, tenant_id, tenant_gender, is_available, created_at) 
         VALUES (?, ?, ?, ?, 0, NOW())`,
        [
          changeBedRequest.preferred_room_id,
          bedNumber,
          tenantId,
          // Get tenant gender from tenants table
          (await db.query('SELECT gender FROM tenants WHERE id = ?', [tenantId]))[0][0]?.gender || 'male'
        ]
      );

      // Update tenant's room_id
      await db.query(
        `UPDATE tenants SET 
          room_id = ?,
          updated_at = NOW()
         WHERE id = ?`,
        [
          changeBedRequest.preferred_room_id,
          tenantId
        ]
      );

      console.log(`✅ Bed change processed for tenant ${tenantId}`);

    } catch (error) {
      console.error('Error processing bed change:', error);
      throw error;
    }
  }

  // Get statistics
  async getStatistics(req, res) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN request_status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN request_status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN request_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN request_status = 'processed' THEN 1 ELSE 0 END) as processed
        FROM change_bed_requests
      `;

      const [stats] = await db.query(query);

      res.json({
        success: true,
        data: stats[0] || {
          total_requests: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          processed: 0
        }
      });

    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new ChangeBedRequestController();