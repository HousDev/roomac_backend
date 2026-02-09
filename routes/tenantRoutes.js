// routes/tenantRoutes.js
const express = require("express");
const router = express.Router();
const TenantController = require("../controllers/tenantController");
const { 
  tenantDocumentUpload,
  tenantDocumentUploadFlexible,
  handleUploadError 
} = require("../middleware/uploadDocument");
const adminAuth = require("../middleware/adminAuth");

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Public routes (no file upload)
router.get("/diagnostic", TenantController.diagnostic);
router.get("/options/preferred", TenantController.getPreferredOptions);
router.get("/options/sharing-types", TenantController.getSharingTypes);
router.get("/options/room-types", TenantController.getRoomTypeOptions);
router.get("/options/properties", TenantController.getProperties);
router.get("/options/occupations", TenantController.getOccupationalCategories);
router.get("/options/locations", TenantController.getLocationOptions);
router.get("/export/excel", TenantController.exportToExcel);
router.get("/credentials/by-ids", TenantController.getCredentialsByTenantIds);
router.get("/rooms/available", TenantController.getAvailableRooms);
router.get("/rooms/types", TenantController.getRoomTypes);
router.get("/properties/all", TenantController.getAllProperties);
router.post("/bulk-delete", TenantController.bulkDelete);
router.post("/bulk-status", TenantController.bulkStatus);
router.post("/bulk-portal-access", TenantController.bulkPortalAccess);
router.post("/credentials", TenantController.createCredential);
router.put("/credentials/:tenantId", TenantController.resetCredential);
router.get("/", TenantController.list);

router.post("/", tenantDocumentUploadFlexible, handleUploadError, TenantController.create);
router.put("/:id", tenantDocumentUploadFlexible, handleUploadError, TenantController.update);


// Other routes without file upload
router.get("/:id", TenantController.getById);
router.delete("/:id", TenantController.remove);

// Get property details with terms for tenant form
router.get("/property/:id/details", async (req, res) => {
  try {
    const propertyId = req.params.id;
    if (!propertyId) {
      return res.status(400).json({ 
        success: false, 
        message: "Property ID is required" 
      });
    }

    // Import PropertyModel
    const PropertyModel = require("../models/propertyModel");
    const property = await PropertyModel.findById(propertyId);
    
    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: "Property not found" 
      });
    }

    // Return only the needed fields
    const propertyDetails = {
      id: property.id,
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      lockin_period_months: property.lockin_period_months || 0,
      lockin_penalty_amount: property.lockin_penalty_amount || 0,
      lockin_penalty_type: property.lockin_penalty_type || 'fixed',
      notice_period_days: property.notice_period_days || 0,
      notice_penalty_amount: property.notice_penalty_amount || 0,
      notice_penalty_type: property.notice_penalty_type || 'fixed'
    };

    return res.json({
      success: true,
      data: propertyDetails
    });
  } catch (err) {
    console.error("Error fetching property details:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch property details" 
    });
  }
});
router.get("/with-assignments", TenantController.listWithAssignments);


// Get active properties
router.get('/properties/active', adminAuth, async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT id, name, address, city, is_active 
      FROM properties 
      WHERE is_active = 1
      ORDER BY name
    `);
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get available rooms in a property
router.get('/properties/:propertyId/available-rooms', adminAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const [rooms] = await db.query(`
      SELECT 
        id,
        room_number,
        sharing_type,
        total_bed,
        occupied_beds,
        rent_per_bed,
        floor,
        (total_bed - occupied_beds) as available_beds
      FROM rooms 
      WHERE property_id = ? 
        AND is_active = 1
        AND total_bed > occupied_beds
      ORDER BY room_number
    `, [propertyId]);
    
    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get tenant's current room info
router.get('/current-room', adminAuth, async (req, res) => {
  try {
    const tenantId = req.user.id;
    
    const [roomInfo] = await db.query(`
      SELECT 
        t.room_id,
        t.bed_number,
        t.property_id,
        r.room_number,
        r.rent_per_bed,
        r.sharing_type,
        r.total_bed,
        r.occupied_beds,
        p.name as property_name
      FROM tenants t
      LEFT JOIN rooms r ON t.room_id = r.id
      LEFT JOIN properties p ON t.property_id = p.id
      WHERE t.id = ?
    `, [tenantId]);
    
    if (roomInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room information not found'
      });
    }
    
    res.json({
      success: true,
      data: roomInfo[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;