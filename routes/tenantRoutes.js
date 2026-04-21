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
const uploadImport = require("../middleware/uploadImport");
const db = require("../config/db");


// Import route - add this BEFORE other POST routes
router.post(
  "/import",
  uploadImport.single("file"),
  TenantController.import
);


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
// In routes/tenantRoutes.js, add this new route
router.get("/check-existence", TenantController.checkExistence);

router.post("/", tenantDocumentUploadFlexible, handleUploadError, TenantController.create);
router.put("/:id", tenantDocumentUploadFlexible, handleUploadError, TenantController.update);
router.post("/:id/send-credentials", TenantController.sendCredentials);

router.post("/birthday-wish", TenantController.sendBirthdayWishes);

// Other routes without file upload
router.get("/:id", TenantController.getById);
// router.delete("/:id", TenantController.remove);
// Soft delete route
router.patch("/:id/soft-delete", TenantController.softDelete);

// Restore route
router.patch("/:id/restore", TenantController.restore);

// Get deleted tenants
router.get("/deleted", TenantController.getDeleted);

// Optional: Modify your existing delete route to support permanent delete
router.delete("/:id", (req, res) => {
  if (req.query.permanent === 'true') {
    // Permanent delete
    return TenantController.remove(req, res);
  } else {
    // Soft delete (default)
    return TenantController.softDelete(req, res);
  }
});

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

    // Return the needed fields INCLUDING security_deposit
    const propertyDetails = {
      id: property.id,
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      security_deposit: property.security_deposit || 0,  // IMPORTANT: Include this
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


// Get tenants by room
router.get("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Fix: Use 'is_active' instead of 'status' column
    const [rows] = await db.execute(`
      SELECT DISTINCT 
        t.id, 
        t.full_name, 
        t.phone, 
        t.email,
        t.salutation,
        t.country_code
      FROM tenants t
      INNER JOIN bed_assignments ba ON t.id = ba.tenant_id
      WHERE ba.room_id = ? 
        AND ba.is_available = 0 
        AND t.is_active = 1
        AND t.deleted_at IS NULL
      ORDER BY t.full_name ASC
    `, [roomId]);
    
    res.json({ 
      success: true, 
      data: rows 
    });
  } catch (error) {
    console.error("Error fetching tenants by room:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// routes/tenantRoutes.js - Update filter endpoint

router.get("/filter", async (req, res) => {
  try {
    const { propertyId, roomId, search } = req.query;
    let query = `
      SELECT DISTINCT 
        t.id, 
        t.full_name, 
        t.phone, 
        t.email,
        t.salutation,
        t.country_code,
        r.room_number, 
        p.name as property_name
      FROM tenants t
      INNER JOIN bed_assignments ba ON t.id = ba.tenant_id
      INNER JOIN rooms r ON ba.room_id = r.id
      INNER JOIN properties p ON r.property_id = p.id
      WHERE ba.is_available = 0 
        AND t.is_active = 1
        AND t.deleted_at IS NULL
    `;
    let params = [];

    if (propertyId) {
      query += " AND r.property_id = ?";
      params.push(propertyId);
    }
    if (roomId) {
      query += " AND ba.room_id = ?";
      params.push(roomId);
    }
    if (search) {
      query += " AND (t.full_name LIKE ? OR t.phone LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY t.full_name ASC";
    
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error in filter endpoint:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// routes/tenantRoutes.js - Add this route for manual testing
router.post("/birthday-cron/run", async (req, res) => {
  try {
    const birthdayCron = require("../utils/birthdayCron");
    const result = await birthdayCron.sendBirthdayEmails();
    
    return res.json({
      success: result.success,
      message: result.success ? "Birthday emails sent successfully" : "Failed to send birthday emails",
      data: result
    });
  } catch (error) {
    console.error("Manual birthday cron error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Optional: Check birthdays for a specific date
router.get("/birthday-check/:date", async (req, res) => {
  try {
    const birthdayCron = require("../utils/birthdayCron");
    const tenants = await birthdayCron.checkBirthdaysForDate(req.params.date);
    
    return res.json({
      success: true,
      data: tenants
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/couple/:coupleId/primary', TenantController.getPrimaryTenantByCoupleId);

module.exports = router;