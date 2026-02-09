// controllers/adminComplaintController.js
const db = require("../config/db");

exports.getComplaints = async (req, res) => {
  try {
    console.log('🔍 Fetching complaints...');
    
    const sql = `
      SELECT 
        tr.id,
        tr.tenant_id,
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
            WHERE ba.tenant_id = tr.tenant_id 
              AND ba.is_available = 0
            ORDER BY ba.created_at DESC
            LIMIT 1
          ),
          p.name,
          'Not specified'
        ) as property_name,
        
        tr.request_type,
        tr.title,
        tr.description,
        tr.priority,
        tr.status,
        tr.admin_notes,
        tr.assigned_to,
        s.name as staff_name,
        s.role as staff_role,
        tr.resolved_at,
        tr.created_at,
        tr.updated_at,
        
        -- COMPLAINT SPECIFIC DATA
        crd.id as complaint_detail_id,
        crd.category_master_type_id,
        crd.reason_master_value_id,
        crd.custom_reason,
        
        -- Category details
        mt.id as category_id,
        mt.code as category_code,
        mt.name as category_name,
        mt.tab as category_tab,
        
        -- Reason details (if from master_values)
        mv.id as reason_id,
        mv.value as reason_value,
        
        -- Get tenant's room info
        ba.room_id,
        r.room_number,
        ba.bed_number
      FROM tenant_requests tr
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      LEFT JOIN properties p ON tr.property_id = p.id
      LEFT JOIN staff s ON tr.assigned_to = s.id
      
      -- JOIN complaint details
      LEFT JOIN complaint_request_details crd ON tr.id = crd.request_id
      
      -- JOIN category (master_types)
      LEFT JOIN master_types mt ON crd.category_master_type_id = mt.id
      
      -- JOIN reason (master_values) - only if reason_master_value_id exists
      LEFT JOIN master_values mv ON crd.reason_master_value_id = mv.id
      
      -- JOIN tenant's current bed assignment
      LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN rooms r ON ba.room_id = r.id
      
      WHERE tr.request_type = 'complaint'
      ORDER BY tr.created_at DESC
    `;
    
    const [complaints] = await db.query(sql);
    console.log(`✅ Found ${complaints.length} complaints`);
    
    // Format the data
    const formattedComplaints = complaints.map(complaint => {
      // Determine the complaint reason text
      let complaintReason = 'Not specified';
      if (complaint.custom_reason) {
        complaintReason = complaint.custom_reason;
      } else if (complaint.reason_value) {
        complaintReason = complaint.reason_value;
      }
      
      return {
        ...complaint,
        complaint_reason: complaintReason,
        complaint_category: complaint.category_name || 'General',
        room_info: complaint.room_number ? 
          `Room ${complaint.room_number}, Bed ${complaint.bed_number}` : 
          'Not assigned'
      };
    });
    
    res.json({
      success: true,
      data: formattedComplaints
    });
  } catch (err) {
    console.error('❌ Error fetching complaints:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch complaints",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Fetching complaint with ID: ${id}`);
    
    const sql = `
      SELECT 
        tr.*,
        t.full_name as tenant_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        t.check_in_date,
        p.name as property_name,
        p.address as property_address,
        s.name as staff_name,
        s.role as staff_role,
        s.email as staff_email,
        s.phone as staff_phone,
        
        -- COMPLAINT SPECIFIC DATA
        crd.id as complaint_detail_id,
        crd.category_master_type_id,
        crd.reason_master_value_id,
        crd.custom_reason,
        
        -- Category details
        mt.id as category_id,
        mt.code as category_code,
        mt.name as category_name,
        mt.tab as category_tab,
        
        -- Reason details (if from master_values)
        mv.id as reason_id,
        mv.value as reason_value,
        
        -- Get tenant's room info
        ba.room_id,
        r.room_number,
        ba.bed_number,
        r.sharing_type,
        r.rent_per_bed,
        
        -- Get available status options for this complaint
        tr.status as current_status
      FROM tenant_requests tr
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      LEFT JOIN properties p ON tr.property_id = p.id
      LEFT JOIN staff s ON tr.assigned_to = s.id
      
      -- JOIN complaint details
      LEFT JOIN complaint_request_details crd ON tr.id = crd.request_id
      
      -- JOIN category (master_types)
      LEFT JOIN master_types mt ON crd.category_master_type_id = mt.id
      
      -- JOIN reason (master_values)
      LEFT JOIN master_values mv ON crd.reason_master_value_id = mv.id
      
      -- JOIN tenant's current bed assignment
      LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN rooms r ON ba.room_id = r.id
      
      WHERE tr.id = ? AND tr.request_type = 'complaint'
    `;

    const [rows] = await db.query(sql, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }
    
    const complaint = rows[0];
    
    // Format the complaint data
    const formattedComplaint = {
      ...complaint,
      complaint_details: {
        category_master_type_id: complaint.category_master_type_id,
        category_name: complaint.category_name,
        reason_master_value_id: complaint.reason_master_value_id,
        reason_value: complaint.reason_value,
        custom_reason: complaint.custom_reason,
        complaint_reason: complaint.custom_reason || complaint.reason_value || 'Not specified'
      },
      tenant_room_info: complaint.room_number ? {
        room_id: complaint.room_id,
        room_number: complaint.room_number,
        bed_number: complaint.bed_number,
        sharing_type: complaint.sharing_type,
        rent_per_bed: complaint.rent_per_bed
      } : null
    };
    
    res.json({
      success: true,
      data: formattedComplaint
    });
  } catch (err) {
    console.error('❌ Error fetching complaint by ID:', err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch complaint",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('📝 Updating complaint:', id, updateData);

    // Build update query
    const updates = [];
    const params = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        updates.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });

    // Auto-set resolved_at if status is resolved
    if (updateData.status === 'resolved' && !updateData.resolved_at) {
      updates.push('resolved_at = NOW()');
    }
    
    // Auto-set updated_at
    updates.push('updated_at = NOW()');

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided for update"
      });
    }

    params.push(id);

    const sql = `
      UPDATE tenant_requests 
      SET ${updates.join(', ')} 
      WHERE id = ? AND request_type = 'complaint'
    `;

    console.log('📝 Update SQL:', sql);
    console.log('📝 Update parameters:', params);

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or not a complaint type"
      });
    }

    // Get the updated complaint
    const getSql = `
      SELECT 
        tr.*,
        t.full_name as tenant_name,
        t.email as tenant_email,
        s.name as staff_name,
        s.role as staff_role
      FROM tenant_requests tr
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      LEFT JOIN staff s ON tr.assigned_to = s.id
      WHERE tr.id = ? AND tr.request_type = 'complaint'
    `;
    
    const [updatedRows] = await db.query(getSql, [id]);
    
    res.json({ 
      success: true, 
      message: "Complaint updated successfully",
      data: updatedRows[0]
    });
  } catch (err) {
    console.error('❌ Error updating complaint:', err.message);
    
    res.status(500).json({ 
      success: false,
      message: "Failed to update complaint",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getActiveStaff = async (req, res) => {
  try {
    const sql = `
      SELECT 
        id,
        name,
        email,
        phone,
        role,
        department,
        is_active,
        created_at
      FROM staff 
      WHERE is_active = 1
      ORDER BY 
        CASE role 
          WHEN 'manager' THEN 1
          WHEN 'supervisor' THEN 2
          WHEN 'executive' THEN 3
          ELSE 4
        END,
        name
    `;
    
    const [staff] = await db.query(sql);
    
    res.json({
      success: true,
      data: staff
    });
  } catch (err) {
    console.error('❌ Error fetching staff:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch staff"
    });
  }
};

// Get complaint categories for dropdown
exports.getComplaintCategories = async (req, res) => {
  try {
    const sql = `
      SELECT 
        id,
        code,
        name,
        tab,
        is_active
      FROM master_types
      WHERE tab = 'Complaint' AND is_active = 1
      ORDER BY name
    `;
    
    const [categories] = await db.query(sql);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    console.error('❌ Error fetching complaint categories:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch complaint categories"
    });
  }
};