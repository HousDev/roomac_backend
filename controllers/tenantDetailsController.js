// controllers/tenantDetailsController.js
const TenantDetailsModel = require("../models/tenantDetailsModel");

const TenantDetailsController = {
async getProfile(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId || isNaN(tenantId)) {
        return res.status(400).json({ success: false, message: "Valid Tenant ID required" });
      }

      console.log('🔍 Fetching profile for tenant ID:', tenantId);

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

      console.log('🔍 [Token Auth] Getting profile for tenant ID:', tenantId);

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

    console.log('🔍 DEBUG - Getting full profile for tenant ID:', tenantId);
    
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
    
    console.log('📊 DEBUG - Full query result:', JSON.stringify(rows[0], null, 2));
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('❌ DEBUG error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}


};

module.exports = TenantDetailsController;