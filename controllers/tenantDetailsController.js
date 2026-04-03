// controllers/tenantDetailsController.js
const pool = require("../config/db");

const TenantDetailsModel = require("../models/tenantDetailsModel");

const TenantDetailsController = {
async getProfile(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId || isNaN(tenantId)) {
        return res.status(400).json({ success: false, message: "Valid Tenant ID required" });
      }


      const profile = await TenantDetailsModel.getById(parseInt(tenantId));
      
      if (!profile) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }

      res.json({
        success: true,
        data: profile
      });
    } catch (err) {
      console.error("getProfile error:", err.message);
      res.status(500).json({ 
        success: false, 
        message: "Server error",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },

  async getProfileByToken(req, res) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }


      const profile = await TenantDetailsModel.getById(tenantId);
      
      if (!profile) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }

      res.json({
        success: true,
        data: profile
      });
    } catch (err) {
      console.error("getProfileByToken error:", err.message);
      res.status(500).json({ 
        success: false, 
        message: "Server error" 
      });
    }
  },

  async updateProfile(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.params.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID required" });
    }

    const updateData = req.body;
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No data provided" });
    }

    const updated = await TenantDetailsModel.updateProfile(tenantId, updateData);

    if (updated) {
      res.json({
        success: true,
        message: "Profile updated successfully"
      });
    } else {
      res.status(400).json({ success: false, message: "Failed to update profile" });
    }
  } catch (err) {
    console.error("updateProfile error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
},

   async getAdditionalDocuments(req, res) {
    try {
      const tenantId = req.user?.tenantId || req.params.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ success: false, message: "Tenant ID required" });
      }

      const documents = await TenantDetailsModel.getAdditionalDocuments(tenantId);
      
      res.json({
        success: true,
        data: documents
      });
    } catch (err) {
      console.error("getAdditionalDocuments error:", err.message);
      res.status(500).json({ 
        success: false, 
        message: "Server error"
      });
    }
  },


  // Add this to your TenantDetailsController
async getBedAssignmentHistory(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.params.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID required" });
    }

    const history = await TenantDetailsModel.getBedAssignmentHistory(tenantId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    console.error("getBedAssignmentHistory error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error"
    });
  }
},

async debugProfile(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.params.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID required" });
    }

    
    const [rows] = await pool.query(`
      SELECT 
        t.*,
        ba.room_id,
        ba.bed_number,
        r.room_number,
        r.floor,
        r.room_type,
        r.rent_per_bed,
        p.id as property_id,
        p.name as property_name,
        p.address as property_address,
        p.property_manager_name,
        p.property_manager_phone
      FROM tenants t
      LEFT JOIN bed_assignments ba ON ba.tenant_id = t.id
      LEFT JOIN rooms r ON r.id = ba.room_id
      LEFT JOIN properties p ON p.id = r.property_id
      WHERE t.id = ?
    `, [tenantId]);
    
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('❌ DEBUG error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
},
async getAdditionalDocuments(req, res) {
  try {
    const tenantId = req.user?.tenantId || req.params.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID required" });
    }

    const [rows] = await pool.query(
      `SELECT additional_documents FROM tenants WHERE id = ? AND deleted_at IS NULL`,
      [tenantId]
    );

    if (!rows || rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    let additionalDocs = [];
    if (rows[0].additional_documents) {
      try {
        additionalDocs = typeof rows[0].additional_documents === 'string'
          ? JSON.parse(rows[0].additional_documents)
          : rows[0].additional_documents;
      } catch (e) {
        console.error('Error parsing additional_documents:', e);
        additionalDocs = [];
      }
    }

    console.log('📄 Returning additional documents:', additionalDocs.length);
    
    res.json({
      success: true,
      data: additionalDocs
    });
  } catch (err) {
    console.error("getAdditionalDocuments error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error"
    });
  }
},

async uploadDocuments(req, res) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const files = req.files || {};
    
    const {
      id_proof_type,
      id_proof_number,
      address_proof_type,
      address_proof_number,
      partner_id_proof_type,
      partner_id_proof_number,
      partner_address_proof_type,
      partner_address_proof_number
    } = req.body;

    const updateFields = {};
    
    // ✅ CHANGE: files are ARRAYS, access [0]
    if (files.id_proof_url && files.id_proof_url[0]) {
updateFields.partner_id_proof_url = '/' + files.partner_id_proof_url[0].path.replace(/\\/g, '/');    }
    if (files.address_proof_url && files.address_proof_url[0]) {
      updateFields.address_proof_url = files.address_proof_url[0].path.replace(/\\/g, '/');
    }
    if (files.photo_url && files.photo_url[0]) {
      updateFields.photo_url = files.photo_url[0].path.replace(/\\/g, '/');
    }
    
    if (files.partner_id_proof_url && files.partner_id_proof_url[0]) {
      updateFields.partner_id_proof_url = files.partner_id_proof_url[0].path.replace(/\\/g, '/');
    }
    if (files.partner_address_proof_url && files.partner_address_proof_url[0]) {
      updateFields.partner_address_proof_url = files.partner_address_proof_url[0].path.replace(/\\/g, '/');
    }
    if (files.partner_photo_url && files.partner_photo_url[0]) {
      updateFields.partner_photo_url = files.partner_photo_url[0].path.replace(/\\/g, '/');
    }
    
    if (id_proof_type) updateFields.id_proof_type = id_proof_type;
    if (id_proof_number) updateFields.id_proof_number = id_proof_number;
    if (address_proof_type) updateFields.address_proof_type = address_proof_type;
    if (address_proof_number) updateFields.address_proof_number = address_proof_number;
    
    if (partner_id_proof_type) updateFields.partner_id_proof_type = partner_id_proof_type;
    if (partner_id_proof_number) updateFields.partner_id_proof_number = partner_id_proof_number;
    if (partner_address_proof_type) updateFields.partner_address_proof_type = partner_address_proof_type;
    if (partner_address_proof_number) updateFields.partner_address_proof_number = partner_address_proof_number;
    
    // Handle additional documents
if (files.additional_documents && files.additional_documents.length > 0) {
  console.log('📎 Processing additional documents:', files.additional_documents.length);
  
  let currentDocs = [];
  
  // Get existing additional documents from database
  const [existingRows] = await pool.query(
    `SELECT additional_documents FROM tenants WHERE id = ?`,
    [tenantId]
  );
  
  if (existingRows[0]?.additional_documents) {
    try {
      const existing = typeof existingRows[0].additional_documents === 'string'
        ? JSON.parse(existingRows[0].additional_documents)
        : existingRows[0].additional_documents;
      if (Array.isArray(existing)) {
        currentDocs = existing;
      }
    } catch (e) {
      console.error('Error parsing existing docs:', e);
    }
  }
  
  // Add new documents
  for (const file of files.additional_documents) {
    currentDocs.push({
      filename: file.originalname,
      url: '/' + file.path.replace(/\\/g, '/'),
      uploaded_at: new Date().toISOString(),
      size: file.size,
      mime_type: file.mimetype
    });
  }
  
  updateFields.additional_documents = JSON.stringify(currentDocs);
  console.log('✅ Additional documents to save:', currentDocs.length);
}

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: "No files or data to upload" });
    }

    const [result] = await pool.query(
      `UPDATE tenants SET ? WHERE id = ?`,
      [updateFields, tenantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    res.json({ success: true, message: "Documents uploaded successfully" });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
};




module.exports = TenantDetailsController;