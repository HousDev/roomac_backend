// controllers/adminReceiptController.js
const db = require("../config/db");

exports.getReceiptRequests = async (req, res) => {
  try {
    console.log('🧾 Fetching receipt requests...');
    
    const sql = `
      SELECT 
        tr.id,
        tr.tenant_id,
        t.full_name as tenant_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        
        -- Get property name from bed_assignments
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
        
        -- Get room number
        (
          SELECT r.room_number 
          FROM bed_assignments ba
          INNER JOIN rooms r ON ba.room_id = r.id
          WHERE ba.tenant_id = tr.tenant_id 
            AND ba.is_available = 0
          ORDER BY ba.created_at DESC
          LIMIT 1
        ) as room_number,
        
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
        tr.updated_at
      FROM tenant_requests tr
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      LEFT JOIN properties p ON tr.property_id = p.id
      LEFT JOIN staff s ON tr.assigned_to = s.id
      WHERE tr.request_type = 'receipt'
      ORDER BY 
        CASE tr.priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        tr.created_at DESC
    `;
    
    const [requests] = await db.query(sql);
    console.log(`✅ Found ${requests.length} receipt requests`);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (err) {
    console.error('❌ Error fetching receipt requests:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch receipt requests"
    });
  }
};

exports.updateReceiptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🧾 Updating receipt request:', id, updateData);

    // Build update query
    const updates = [];
    const params = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        updates.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });

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
      WHERE id = ? AND request_type = 'receipt'
    `;

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Receipt request not found"
      });
    }

    res.json({ 
      success: true, 
      message: "Receipt request updated successfully"
    });
  } catch (err) {
    console.error('❌ Error updating receipt request:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to update receipt request"
    });
  }
};

// New: Generate receipt (you can expand this based on your payment system)
exports.generateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { receipt_details } = req.body;

    console.log('🧾 Generating receipt for request:', id);

    // First, get the request details
    const [request] = await db.query(
      `SELECT tr.*, t.full_name as tenant_name, t.email as tenant_email 
       FROM tenant_requests tr
       LEFT JOIN tenants t ON tr.tenant_id = t.id
       WHERE tr.id = ? AND tr.request_type = 'receipt'`,
      [id]
    );

    if (request.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Receipt request not found"
      });
    }

    // Update request status
    await db.query(
      `UPDATE tenant_requests SET status = 'resolved', admin_notes = ? WHERE id = ?`,
      [`Receipt generated: ${receipt_details}`, id]
    );

    // In a real app, you would:
    // 1. Fetch tenant's payment history
    // 2. Generate PDF receipt
    // 3. Save receipt to database
    // 4. Send email with receipt

    res.json({ 
      success: true, 
      message: "Receipt generated successfully",
      data: {
        request_id: id,
        tenant_name: request[0].tenant_name,
        receipt_details: receipt_details,
        generated_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('❌ Error generating receipt:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to generate receipt"
    });
  }
};