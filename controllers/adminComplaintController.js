
// controllers/adminComplaintController.js
const db = require("../config/db");
const notificationController = require("../controllers/tenantNotificationController");

exports.getComplaints = async (req, res) => {
  try {
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
        
        -- IMPORTANT: Category name comes from master_item_values (not master_items!)
        -- The category_master_type_id stores the master_item_values.id of the category
        miv_category.id as category_id,
        miv_category.name as category_name,
        
        -- Reason details from master_item_values
        miv_reason.id as reason_id,
        miv_reason.name as reason_value,
        
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
      
      -- JOIN category from master_item_values (this is the actual category value)
      LEFT JOIN master_item_values miv_category ON crd.category_master_type_id = miv_category.id
      
      -- JOIN reason from master_item_values
      LEFT JOIN master_item_values miv_reason ON crd.reason_master_value_id = miv_reason.id
      
      -- JOIN tenant's current bed assignment
      LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN rooms r ON ba.room_id = r.id
      
      WHERE tr.request_type = 'complaint'
      ORDER BY tr.created_at DESC
    `;
    
    const [complaints] = await db.query(sql);
    
    // Format the data
    const formattedComplaints = complaints.map(complaint => {
      // Determine the complaint reason text
      let complaintReason = 'Not specified';
      if (complaint.custom_reason) {
        complaintReason = complaint.custom_reason;
      } else if (complaint.reason_value) {
        complaintReason = complaint.reason_value;
      }
      
      // Determine category name (should be from miv_category.name)
      let categoryName = complaint.category_name || 'General';
      
      return {
        ...complaint,
        complaint_reason: complaintReason,
        complaint_category: categoryName,
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

// Simplified getComplaintById to avoid complex joins
exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    
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
        
        -- Category details from master_item_values
        miv_category.id as category_id,
        miv_category.name as category_name,
        
        -- Reason details from master_item_values
        miv_reason.id as reason_id,
        miv_reason.name as reason_value,
        
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
      
      -- JOIN category from master_item_values
      LEFT JOIN master_item_values miv_category ON crd.category_master_type_id = miv_category.id
      
      -- JOIN reason from master_item_values
      LEFT JOIN master_item_values miv_reason ON crd.reason_master_value_id = miv_reason.id
      
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
      admin_notes: complaint.admin_notes,
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

// Simplified getComplaintCategories to avoid errors
exports.getComplaintCategories = async (req, res) => {
  try {
    // First try to get from master_items
    const sql = `
      SELECT 
        id,
        name,
        tab,
        is_active
      FROM master_items
      WHERE tab = 'Requests' 
        AND is_active = 1
      ORDER BY name
    `;
    
    const [categories] = await db.query(sql);
    
    // If no categories found, return fallback
    if (categories.length === 0) {
      const fallbackCategories = [
        { id: 1, name: 'Food', tab: 'Requests', is_active: 1 },
        { id: 2, name: 'Room', tab: 'Requests', is_active: 1 },
        { id: 3, name: 'Staff', tab: 'Requests', is_active: 1 },
        { id: 4, name: 'Other', tab: 'Requests', is_active: 1 }
      ];
      
      return res.json({
        success: true,
        data: fallbackCategories
      });
    }
    
    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    console.error('❌ Error fetching complaint categories:', err.message);
    
    // Return fallback categories even on error
    const fallbackCategories = [
      { id: 1, name: 'Food', tab: 'Requests', is_active: 1 },
      { id: 2, name: 'Room', tab: 'Requests', is_active: 1 },
      { id: 3, name: 'Staff', tab: 'Requests', is_active: 1 },
      { id: 4, name: 'Other', tab: 'Requests', is_active: 1 }
    ];
    
    res.json({ 
      success: true,  // Send success true with fallback data
      data: fallbackCategories,
      message: "Using default categories due to database error"
    });
  }
};

// Keep other functions (bulkDeleteComplaints, updateComplaint, etc.) as they are
// They don't have the complex joins that are causing issues

exports.bulkDeleteComplaints = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of complaint IDs to delete"
      });
    }
    
    // Start a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // First, delete complaint request details
      await connection.query(
        `DELETE FROM complaint_request_details WHERE request_id IN (?)`,
        [ids]
      );
      
      // Then delete the tenant requests
      const [result] = await connection.query(
        `DELETE FROM tenant_requests WHERE id IN (?) AND request_type = 'complaint'`,
        [ids]
      );
      
      await connection.commit();
      
      res.json({
        success: true,
        message: `Successfully deleted ${result.affectedRows} complaints`,
        data: {
          deletedCount: result.affectedRows,
          deletedIds: ids
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('❌ Error bulk deleting complaints:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete complaints",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get current complaint data
    const [currentComplaint] = await db.query(
      `SELECT tenant_id, status, admin_notes FROM tenant_requests WHERE id = ? AND request_type = 'complaint'`,
      [id]
    );

    if (currentComplaint.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    const tenantId = currentComplaint[0].tenant_id;
    const oldStatus = currentComplaint[0].status;
    const newStatus = updateData.status;
    const currentNotes = currentComplaint[0]?.admin_notes || '';

    // Build update query
    const updates = [];
    const params = [];

    // Handle status update
    if (updateData.status) {
      updates.push('status = ?');
      params.push(updateData.status);
    }

    // Handle assigned_to update
    if (updateData.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(updateData.assigned_to);
    }

    // Handle admin notes - APPEND to existing notes
    if (updateData.admin_notes) {
      const timestamp = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const statusText = updateData.status ? updateData.status.replace('_', ' ').toUpperCase() : 'UPDATED';
      const newNoteEntry = `\n\n[${timestamp}] Status: ${statusText}\nNote: ${updateData.admin_notes}\n----------------------------------------`;
      
      const updatedNotes = currentNotes ? currentNotes + newNoteEntry : `--- Complaint History ---\n${newNoteEntry}`;
      
      updates.push('admin_notes = ?');
      params.push(updatedNotes);
    }

    // Auto-set resolved_at if status is resolved
    if (updateData.status === 'resolved') {
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

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or not a complaint type"
      });
    }

    // Send notification to tenant if status changed
    if (newStatus && newStatus !== oldStatus) {
      try {
        await notificationController.notifyComplaintStatusUpdate(
          id,
          tenantId,
          newStatus,
          updateData.admin_notes 
        );
      } catch (notifError) {
        console.error('❌ Failed to send notification:', notifError);
      }
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