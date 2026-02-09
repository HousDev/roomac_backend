// controllers/adminChangeBedController.js
const db = require('../config/db');

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
        
        -- Change bed request info (if exists)
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
        -- Current room from change_bed_requests (if available)
        cr.room_number as current_room_number,
        cr.rent_per_bed as current_rent,
        cr.total_bed as current_total_beds,
        cp.name as current_property_name,
        cp.address as current_property_address,
        
        -- ========== FALLBACK: Current room from tenant's ACTIVE bed assignment ==========
        ba_current.room_id as fallback_current_room_id,
        ba_current.bed_number as fallback_current_bed_number,
        ba_current.property_id as fallback_current_property_id,  -- ADDED THIS
        r_current.room_number as fallback_current_room_number,
        r_current.rent_per_bed as fallback_current_rent,
        r_current.total_bed as fallback_current_total_beds,
        p_current.name as fallback_current_property_name,
        p_current.address as fallback_current_property_address,
        
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
        
        -- ========== OCCUPIED BEDS COUNT ==========
        -- Occupied beds for requested room
        (
          SELECT COUNT(*) 
          FROM bed_assignments ba 
          WHERE ba.room_id = cbr.preferred_room_id 
            AND ba.is_available = 0
            AND ba.tenant_id IS NOT NULL
        ) as requested_occupied_beds,
        
        -- Occupied beds for current room (from cbr or fallback)
        (
          SELECT COUNT(*) 
          FROM bed_assignments ba2 
          WHERE ba2.room_id = COALESCE(cbr.current_room_id, ba_current.room_id) 
            AND ba2.is_available = 0
            AND ba2.tenant_id IS NOT NULL
        ) as current_occupied_beds
        
      FROM tenant_requests tr
      
      -- Join tenant info
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      
      -- LEFT JOIN change_bed_requests (so we get ALL change bed tenant_requests)
      LEFT JOIN change_bed_requests cbr ON tr.id = cbr.tenant_request_id
      
      -- ========== CURRENT ROOM JOINS (from change_bed_requests) ==========
      LEFT JOIN rooms cr ON cbr.current_room_id = cr.id
      LEFT JOIN properties cp ON cr.property_id = cp.id
      
      -- ========== FALLBACK: Get tenant's CURRENT ACTIVE bed assignment ==========
      LEFT JOIN (
        SELECT 
          ba.tenant_id, 
          ba.room_id, 
          ba.bed_number,
          r.property_id
        FROM bed_assignments ba
        INNER JOIN rooms r ON ba.room_id = r.id
        WHERE ba.is_available = 0 
          AND ba.tenant_id IS NOT NULL
      ) ba_current ON t.id = ba_current.tenant_id
      
      LEFT JOIN rooms r_current ON ba_current.room_id = r_current.id
      LEFT JOIN properties p_current ON r_current.property_id = p_current.id
      
      -- ========== REQUESTED ROOM JOINS ==========
      LEFT JOIN rooms rr ON cbr.preferred_room_id = rr.id
      LEFT JOIN properties rp ON rr.property_id = rp.id
      
      -- ========== CHANGE REASON JOINS ==========
      LEFT JOIN master_values mv ON cbr.change_reason_id = mv.id
      LEFT JOIN master_types mt ON mv.master_type_id = mt.id
      
      WHERE tr.request_type = 'change_bed'
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM tenant_requests tr
      WHERE tr.request_type = 'change_bed'
    `;

    const queryParams = [];
    const countParams = [];

    // Status filter - check both tables
    if (status && status !== 'all' && status !== '') {
      baseQuery += ` AND (
        cbr.request_status = ? OR 
        (cbr.request_status IS NULL AND tr.status = ?)
      )`;
      countQuery += ` AND (
        EXISTS (
          SELECT 1 FROM change_bed_requests cbr2 
          WHERE cbr2.tenant_request_id = tr.id AND cbr2.request_status = ?
        ) OR 
        NOT EXISTS (
          SELECT 1 FROM change_bed_requests cbr3 
          WHERE cbr3.tenant_request_id = tr.id
        )
      )`;
      queryParams.push(status, status);
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
        EXISTS (
          SELECT 1 FROM change_bed_requests cbr4
          LEFT JOIN rooms cr4 ON cbr4.current_room_id = cr4.id
          LEFT JOIN properties cp4 ON cbr4.current_property_id = cp4.id
          LEFT JOIN rooms rr4 ON cbr4.preferred_room_id = rr4.id
          LEFT JOIN properties rp4 ON cbr4.preferred_property_id = rp4.id
          WHERE cbr4.tenant_request_id = tr.id AND (
            cp4.name LIKE ? OR
            rp4.name LIKE ?
          )
        ) OR
        tr.title LIKE ? OR
        tr.description LIKE ?
      )`;
      
      const searchTerm = `%${search}%`;
      // For base query
      for (let i = 0; i < 7; i++) {
        queryParams.push(searchTerm);
      }
      // For count query
      for (let i = 0; i < 7; i++) {
        countParams.push(searchTerm);
      }
    }

    // Order by - prioritize change_bed_requests date, fallback to tenant_requests
    const orderByMap = {
      'created_at': 'COALESCE(cbr.created_at, tr.created_at)',
      'shifting_date': 'cbr.shifting_date',
      'priority': 'tr.priority'
    };
    
    const orderField = orderByMap[sort_by] || 'COALESCE(cbr.created_at, tr.created_at)';
    baseQuery += ` ORDER BY ${orderField} ${sort_order.toUpperCase()}`;

    // Pagination
    baseQuery += ` LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), offset);

    console.log('Executing query with params:', queryParams);
    console.log('Base query (first 500 chars):', baseQuery.substring(0, 500));

    // Execute queries
    const [requests] = await db.query(baseQuery, queryParams);
    const [countResult] = await db.query(countQuery, countParams);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    console.log(`Found ${requests.length} change bed requests out of ${total} total`);

    // Format the response
    const formattedRequests = requests.map(req => {
      // Determine which data to use (cbr data or fallback)
      const hasChangeBedRequest = !!req.id; // cbr.id
      
      // ========== CURRENT ROOM DATA ==========
      // Priority: cbr data > fallback from active assignment
      const currentRoomNumber = req.current_room_number || req.fallback_current_room_number;
      const currentRent = req.current_rent || req.fallback_current_rent;
      const currentPropertyName = req.current_property_name || req.fallback_current_property_name;
      const currentBedNumber = req.current_bed_number || req.fallback_current_bed_number;
      const currentTotalBeds = req.current_total_beds || req.fallback_current_total_beds;
      
      // ========== REQUESTED ROOM DATA ==========
      // Only use if cbr exists
      const requestedRoomNumber = req.requested_room_number;
      const requestedRent = req.requested_rent;
      const requestedPropertyName = req.requested_property_name;
      const requestedTotalBeds = req.requested_total_beds;
      const requestedOccupiedBeds = req.requested_occupied_beds || 0;
      
      // ========== RENT DIFFERENCE CALCULATION ==========
      let rentDifference = req.rent_difference;
      
      // Calculate rent difference if not provided
      if (!rentDifference && currentRent && requestedRent) {
        const currentRentNum = parseFloat(currentRent) || 0;
        const requestedRentNum = parseFloat(requestedRent) || 0;
        rentDifference = (requestedRentNum - currentRentNum).toFixed(2);
      }
      
      return {
        id: req.id || req.tenant_request_id,
        tenant_request_id: req.tenant_request_id,
        tenant_id: req.tenant_id,
        title: req.title,
        description: req.description,
        priority: req.priority,
        tenant_request_status: req.tenant_request_status,
        created_at: req.created_at,
        
        // ========== CURRENT ROOM DETAILS ==========
        current_property_id: req.current_property_id || req.fallback_current_property_id,
        current_room_id: req.current_room_id || req.fallback_current_room_id,
        current_bed_number: currentBedNumber,
        current_room_number: currentRoomNumber,
        current_rent: currentRent,
        current_property_name: currentPropertyName,
        current_total_beds: currentTotalBeds,
        current_occupied_beds: req.current_occupied_beds || 0,
        
        // ========== REQUESTED ROOM DETAILS ==========
        preferred_property_id: req.preferred_property_id,
        preferred_room_id: req.preferred_room_id,
        change_reason_id: req.change_reason_id,
        shifting_date: req.shifting_date,
        notes: req.notes,
        assigned_bed_number: req.assigned_bed_number,
        rent_difference: rentDifference,
        admin_notes: req.admin_notes || req.tenant_admin_notes,
        request_status: req.request_status || req.tenant_request_status,
        
        // ========== TENANT INFO ==========
        tenant_name: req.tenant_name,
        tenant_email: req.tenant_email,
        tenant_phone: req.tenant_phone,
        
        // ========== REQUESTED ROOM EXTRA INFO ==========
        requested_room_number: requestedRoomNumber,
        requested_rent: requestedRent,
        requested_property_name: requestedPropertyName,
        requested_total_beds: requestedTotalBeds,
        requested_occupied_beds: requestedOccupiedBeds,
        
        // Additional requested room details
        requested_floor: req.requested_floor,
        requested_has_ac: req.requested_has_ac,
        requested_has_attached_bathroom: req.requested_has_attached_bathroom,
        requested_has_balcony: req.requested_has_balcony,
        
        // ========== CHANGE REASON ==========
        change_reason: req.change_reason,
        change_reason_code: req.change_reason_code,
        
        // ========== DEBUG INFO ==========
        has_change_bed_request: hasChangeBedRequest,
        has_current_room_data: !!(currentRoomNumber && currentRent),
        has_requested_room_data: !!(requestedRoomNumber && requestedRent)
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
    console.log('🔍 Sample request data (first row):');
if (requests.length > 0) {
  const sample = requests[0];
  console.log('Request ID:', sample.tenant_request_id);
  console.log('Tenant:', sample.tenant_name);
  console.log('Current room number:', sample.current_room_number);
  console.log('Current rent:', sample.current_rent);
  console.log('Current property name:', sample.current_property_name);
  console.log('Requested room number:', sample.requested_room_number);
  console.log('Requested rent:', sample.requested_rent);
  console.log('Requested property name:', sample.requested_property_name);
  console.log('Change reason:', sample.change_reason);
  console.log('Shifting date:', sample.shifting_date);
}

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

    // Use a simplified but complete query
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
        
        -- FALLBACK current room from tenant's active assignment
        ba_current.room_id as fallback_current_room_id,
        ba_current.bed_number as fallback_current_bed_number,
        ba_current.property_id as fallback_current_property_id,
        r_current.room_number as fallback_current_room_number,
        r_current.rent_per_bed as fallback_current_rent,
        r_current.total_bed as fallback_current_total_beds,
        p_current.name as fallback_current_property_name,
        p_current.address as fallback_current_property_address,
        
        -- REQUESTED ROOM INFO
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
        ) as requested_occupied_beds,
        
        -- Occupied beds for current room
        (
          SELECT COUNT(*) 
          FROM bed_assignments ba2 
          WHERE ba2.room_id = COALESCE(cbr.current_room_id, ba_current.room_id) 
            AND ba2.is_available = 0
            AND ba2.tenant_id IS NOT NULL
        ) as current_occupied_beds
        
      FROM tenant_requests tr
      
      -- Join tenant info
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      
      -- Join change_bed_requests (MUST BE LEFT JOIN to handle missing entries)
      LEFT JOIN change_bed_requests cbr ON tr.id = cbr.tenant_request_id
      
      -- Current room joins (from change_bed_requests)
      LEFT JOIN rooms cr ON cbr.current_room_id = cr.id
      LEFT JOIN properties cp ON cr.property_id = cp.id
      
      -- Fallback current room from tenant's active assignment
      LEFT JOIN (
        SELECT 
          ba.tenant_id, 
          ba.room_id, 
          ba.bed_number,
          r.property_id
        FROM bed_assignments ba
        INNER JOIN rooms r ON ba.room_id = r.id
        WHERE ba.is_available = 0 
          AND ba.tenant_id IS NOT NULL
      ) ba_current ON t.id = ba_current.tenant_id
      
      LEFT JOIN rooms r_current ON ba_current.room_id = r_current.id
      LEFT JOIN properties p_current ON r_current.property_id = p_current.id
      
      -- Requested room joins
      LEFT JOIN rooms rr ON cbr.preferred_room_id = rr.id
      LEFT JOIN properties rp ON rr.property_id = rp.id
      
      -- Change reason joins
      LEFT JOIN master_values mv ON cbr.change_reason_id = mv.id
      LEFT JOIN master_types mt ON mv.master_type_id = mt.id
      
      WHERE tr.request_type = 'change_bed'
        AND (cbr.id = ? OR tr.id = ?)
      
      LIMIT 1
    `;

    const [requests] = await db.query(query, [id, id]);

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Change bed request not found'
      });
    }

    const request = requests[0];
    
    console.log('📊 Raw data for request:', {
      id: request.id || request.tenant_request_id,
      has_change_bed_request: !!request.id,
      current_room_number: request.current_room_number,
      current_rent: request.current_rent,
      current_property_name: request.current_property_name,
      fallback_current_room_number: request.fallback_current_room_number,
      fallback_current_rent: request.fallback_current_rent,
      fallback_current_property_name: request.fallback_current_property_name,
      requested_room_number: request.requested_room_number,
      requested_rent: request.requested_rent,
      requested_property_name: request.requested_property_name,
      change_reason: request.change_reason,
      shifting_date: request.shifting_date
    });

    // Format the response
    const hasChangeBedRequest = !!request.id;
    
    // Current room data - use cbr data if available, otherwise fallback
    const currentRoomNumber = request.current_room_number || request.fallback_current_room_number;
    const currentRent = request.current_rent || request.fallback_current_rent;
    const currentPropertyName = request.current_property_name || request.fallback_current_property_name;
    const currentBedNumber = request.current_bed_number || request.fallback_current_bed_number;
    const currentTotalBeds = request.current_total_beds || request.fallback_current_total_beds;
    const currentOccupiedBeds = request.current_occupied_beds || 0;
    
    // Requested room data - only if cbr exists
    const requestedRoomNumber = request.requested_room_number;
    const requestedRent = request.requested_rent;
    const requestedPropertyName = request.requested_property_name;
    const requestedTotalBeds = request.requested_total_beds;
    const requestedOccupiedBeds = request.requested_occupied_beds || 0;
    
    // Rent difference calculation
    let rentDifference = request.rent_difference;
    if (!rentDifference && currentRent && requestedRent) {
      const currentRentNum = parseFloat(currentRent) || 0;
      const requestedRentNum = parseFloat(requestedRent) || 0;
      rentDifference = (requestedRentNum - currentRentNum).toFixed(2);
    }

    const response = {
      id: request.id || request.tenant_request_id,
      tenant_request_id: request.tenant_request_id,
      tenant_id: request.tenant_id,
      title: request.title,
      description: request.description,
      priority: request.priority,
      tenant_request_status: request.tenant_request_status,
      created_at: request.created_at,
      
      // Current room details
      current_property_id: request.current_property_id || request.fallback_current_property_id,
      current_room_id: request.current_room_id || request.fallback_current_room_id,
      current_bed_number: currentBedNumber,
      current_room_number: currentRoomNumber,
      current_rent: currentRent,
      current_property_name: currentPropertyName,
      current_total_beds: currentTotalBeds,
      current_occupied_beds: currentOccupiedBeds,
      current_floor: request.current_floor,
      current_has_ac: request.current_has_ac,
      current_has_attached_bathroom: request.current_has_attached_bathroom,
      current_has_balcony: request.current_has_balcony,
      
      // Requested room details
      preferred_property_id: request.preferred_property_id,
      preferred_room_id: request.preferred_room_id,
      change_reason_id: request.change_reason_id,
      shifting_date: request.shifting_date,
      notes: request.notes,
      assigned_bed_number: request.assigned_bed_number,
      rent_difference: rentDifference,
      admin_notes: request.admin_notes || request.tenant_admin_notes,
      request_status: request.request_status || request.tenant_request_status,
      
      // Tenant info
      tenant_name: request.tenant_name,
      tenant_email: request.tenant_email,
      tenant_phone: request.tenant_phone,
      
      // Requested room extra info
      requested_room_number: requestedRoomNumber,
      requested_rent: requestedRent,
      requested_property_name: requestedPropertyName,
      requested_total_beds: requestedTotalBeds,
      requested_occupied_beds: requestedOccupiedBeds,
      requested_floor: request.requested_floor,
      requested_has_ac: request.requested_has_ac,
      requested_has_attached_bathroom: request.requested_has_attached_bathroom,
      requested_has_balcony: request.requested_has_balcony,
      
      // Change reason
      change_reason: request.change_reason,
      change_reason_code: request.change_reason_code,
      
      // Debug info
      has_change_bed_request: hasChangeBedRequest
    };

    console.log('✅ Sending response for request ID:', response.id);
    
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

      // Validate request exists
      const [existingRequest] = await db.query(
        'SELECT * FROM change_bed_requests WHERE id = ?',
        [id]
      );

      if (existingRequest.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Change bed request not found'
        });
      }

      const changeBedRequest = existingRequest[0];

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