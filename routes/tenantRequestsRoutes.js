// // routes/tenantRequests.js
// const express = require('express');
// const router = express.Router();
// const TenantRequestController = require('../controllers/tenantRequestController');
// const tenantAuth = require('../middleware/tenantAuth');
// const adminAuth = require('../middleware/adminAuth');

// // ================= TENANT ROUTES (requires tenant token) =================

// // Create new request (tenant)
// router.post('/', tenantAuth, TenantRequestController.createRequest);

// // Get my requests (tenant)
// router.get('/my', tenantAuth, TenantRequestController.getMyRequests);

// // Get single request by ID (tenant can only see their own)
// router.get('/my/:id', tenantAuth, TenantRequestController.getMyRequestById);

// // ================= ADMIN ROUTES (requires admin token) =================

// // Get all requests (admin)
// router.get('/', adminAuth, TenantRequestController.getAllRequests);

// // Get requests by type (for admin dashboard pages)
// router.get('/type/:type', adminAuth, TenantRequestController.getRequestsByType);

// // Get request by ID (admin)
// router.get('/:id', adminAuth, TenantRequestController.getRequestById);

// // Update request (admin)
// router.put('/:id', adminAuth, TenantRequestController.updateRequest);

// // Update request status (admin)
// router.patch('/:id/status', adminAuth, TenantRequestController.updateRequestStatus);

// // Assign request to staff (admin)
// router.patch('/:id/assign', adminAuth, TenantRequestController.assignRequest);

// // Get statistics (admin)
// router.get('/stats/summary', adminAuth, TenantRequestController.getStats);

// // Delete request (admin)
// router.delete('/:id', adminAuth, TenantRequestController.deleteRequest);

// module.exports = router;


// const router = require("express").Router();
// const tenantAuth = require("../middleware/tenantAuth");
// const controller = require("../controllers/tenantRequestController");

// router.post("/", tenantAuth, controller.createRequest);
// router.get("/", tenantAuth, controller.getMyRequests);

// module.exports = router;


const router = require("express").Router();
const tenantAuth = require("../middleware/tenantAuth");
const controller = require("../controllers/tenantRequestController");
const adminAuth = require("../middleware/adminAuth");
const db = require("../config/db"); 
// Route for creating requests - matches frontend call to /api/tenant/requests
router.post("/", tenantAuth, controller.createRequest);

// Route for getting tenant's requests - matches /api/tenant-requests
router.get("/", tenantAuth, controller.getMyRequests);

// Route for vacate reasons
router.get('/vacate-reasons', tenantAuth, controller.getVacateReasons);

// NEW: Route for getting tenant contract details
router.get('/contract-details', tenantAuth, controller.getTenantContractDetails);

// Optional: Route for single request
// router.get("/:id", tenantAuth, controller.getRequestById);

// NEW ROUTES TO ADD:
router.get('/current-room', tenantAuth, controller.getCurrentRoomInfo);
router.get('/properties/active', tenantAuth, controller.getActiveProperties);
router.get('/properties/:propertyId/available-rooms', tenantAuth, controller.getAvailableRooms);
router.get('/change-reasons', tenantAuth, controller.getChangeBedReasons); 
router.get("/leave-types", tenantAuth, controller.getLeaveTypes);
// In your routes file, add these new routes:
router.get('/complaint-categories', tenantAuth, controller.getComplaintCategories);
router.get('/complaint-categories/:categoryId/reasons', tenantAuth, controller.getComplaintReasons);

// Add this route to debug the actual database content
router.get('/debug/simple', tenantAuth, async (req, res) => {
  try {
    const tenant_id = req.user?.id;
    
    console.log('🔍 Simple debug for tenant ID:', tenant_id);
    
    // Simple query without complex joins
    const [tenantRequests] = await db.query(
      `SELECT id, request_type, title, description, status, created_at 
       FROM tenant_requests 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC`,
      [tenant_id]
    );
    
    res.json({
      success: true,
      data: {
        tenant_id,
        requests: tenantRequests,
        count: tenantRequests.length
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// In tenantRequestsRoutes.js, add this test route (no auth required for testing)
router.get('/debug/no-auth', async (req, res) => {
  try {
    console.log('🔍 Debug: Testing master data (no auth)');
    
    // Direct query - no auth - EXACT FIELDS ONLY
    const [complaintTypes] = await db.query(`
      SELECT 
        id,
        code,
        name,
        tab,
        is_active
      FROM master_types
      WHERE tab = 'Complaint' 
        AND is_active = 1
      ORDER BY name
    `);
    
    console.log(`✅ Found ${complaintTypes.length} complaint types directly`);
    
    res.json({
      success: true,
      data: complaintTypes,
      count: complaintTypes.length,
      sql: "SELECT id, code, name, tab, is_active FROM master_types WHERE tab = 'Complaint' AND is_active = 1"
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      sql: error.sql
    });
  }
});
// In tenantRequestsRoutes.js, add this test route
router.get('/test/master-data', async (req, res) => {
  try {
    console.log('🔍 Testing master data...');
    
    // Test 1: Check all master_types - EXACT FIELDS
    const [allTypes] = await db.query(`
      SELECT id, code, name, tab, is_active 
      FROM master_types 
      WHERE is_active = 1 
      ORDER BY id
    `);
    
    console.log('📋 All master_types:');
    allTypes.forEach(type => {
      console.log(`ID: ${type.id}, Code: "${type.code}", Name: "${type.name}", Tab: "${type.tab}"`);
    });
    
    // Test 2: Specifically look for complaint-related types
    const [complaintTypes] = await db.query(`
      SELECT id, code, name, tab, is_active 
      FROM master_types 
      WHERE tab LIKE '%complaint%' OR tab LIKE '%Complaint%'
      ORDER BY id
    `);
    
    console.log('📋 Complaint types (case-insensitive search):');
    complaintTypes.forEach(type => {
      console.log(`ID: ${type.id}, Code: "${type.code}", Name: "${type.name}", Tab: "${type.tab}"`);
    });
    
    // Test 3: Check master_values for complaint categories
    const [foodValues] = await db.query(`
      SELECT mv.id, mv.value, mv.master_type_id, mv.is_active, mt.name as category_name, mt.tab
      FROM master_values mv
      JOIN master_types mt ON mv.master_type_id = mt.id
      WHERE mt.id = 9 AND mv.is_active = 1
      ORDER BY mv.id
    `);
    
    console.log('📋 Food complaint reasons (master_type_id = 9):');
    foodValues.forEach(value => {
      console.log(`ID: ${value.id}, Value: "${value.value}", Category: "${value.category_name}", Tab: "${value.tab}"`);
    });
    
    res.json({
      success: true,
      data: {
        all_master_types: allTypes,
        complaint_types: complaintTypes,
        food_complaint_reasons: foodValues,
        summary: {
          total_types: allTypes.length,
          complaint_types_count: complaintTypes.length,
          food_reasons_count: foodValues.length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;