// routes/adminRequestCountsRoutes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const db = require("../config/db");

// Get all request counts in one endpoint
router.get("/all", adminAuth, async (req, res) => {
  try {
    console.log('📊 Fetching all request counts...');

    // Run all count queries in parallel
    const [
      complaintsResult,
      maintenanceResult,
      receiptsResult,
      vacateResult,
      changeResult,
      deletionResult,
      noticeResult
    ] = await Promise.allSettled([
      // Complaints count
      db.query(`
        SELECT COUNT(*) as count 
        FROM tenant_requests 
        WHERE request_type = 'complaint' 
        AND status IN ('pending', 'in_progress')
      `),
      
      // Maintenance count
      db.query(`
        SELECT COUNT(*) as count 
        FROM tenant_requests 
        WHERE request_type = 'maintenance' 
        AND status IN ('pending', 'in_progress')
      `),
      
      // Receipts count (pending in receipt_requests)
      db.query(`
        SELECT COUNT(*) as count 
        FROM receipt_requests 
        WHERE status = 'pending'
      `),
      
      // Vacate requests count
      db.query(`
        SELECT COUNT(*) as count 
        FROM vacate_bed_requests 
        WHERE request_status = 'pending'
      `),
      
      // Change bed requests count
      db.query(`
        SELECT COUNT(*) as count 
        FROM change_bed_requests 
        WHERE request_status = 'pending'
      `),
      
      // Account deletion requests count
      db.query(`
        SELECT COUNT(*) as count 
        FROM tenant_deletion_requests 
        WHERE status = 'pending'
      `),
      
      // Notice period requests count (unseen)
      db.query(`
        SELECT COUNT(*) as count 
        FROM notice_period_requests 
        WHERE is_seen = 0
      `)
    ]);

    // Extract counts with error handling
    const complaints = complaintsResult.status === 'fulfilled' 
      ? complaintsResult.value[0][0]?.count || 0 
      : 0;
    
    const maintenance = maintenanceResult.status === 'fulfilled' 
      ? maintenanceResult.value[0][0]?.count || 0 
      : 0;
    
    const receipts = receiptsResult.status === 'fulfilled' 
      ? receiptsResult.value[0][0]?.count || 0 
      : 0;
    
    const vacate = vacateResult.status === 'fulfilled' 
      ? vacateResult.value[0][0]?.count || 0 
      : 0;
    
    const change = changeResult.status === 'fulfilled' 
      ? changeResult.value[0][0]?.count || 0 
      : 0;
    
    const deletion = deletionResult.status === 'fulfilled' 
      ? deletionResult.value[0][0]?.count || 0 
      : 0;
    
    const notice = noticeResult.status === 'fulfilled' 
      ? noticeResult.value[0][0]?.count || 0 
      : 0;

    const total = complaints + maintenance + receipts + vacate + change + deletion + notice;

    console.log('✅ Request counts:', {
      complaints,
      maintenance,
      receipts,
      vacate,
      change,
      deletion,
      notice,
      total
    });

    res.json({
      success: true,
      data: {
        complaints,
        maintenance,
        receipts,
        vacate,
        change,
        deletion,
        notice,
        total
      }
    });

  } catch (err) {
    console.error('❌ Error fetching request counts:', err.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch request counts"
    });
  }
});

// Individual count endpoints (if needed separately)

// Complaints count
router.get("/complaints", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count 
       FROM tenant_requests 
       WHERE request_type = 'complaint' 
       AND status IN ('pending', 'in_progress')`
    );
    res.json({ success: true, count: rows[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Maintenance count
router.get("/maintenance", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count 
       FROM tenant_requests 
       WHERE request_type = 'maintenance' 
       AND status IN ('pending', 'in_progress')`
    );
    res.json({ success: true, count: rows[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Receipts count
router.get("/receipts", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count 
       FROM receipt_requests 
       WHERE status = 'pending'`
    );
    res.json({ success: true, count: rows[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Vacate requests count
router.get("/vacate", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count 
       FROM vacate_bed_requests 
       WHERE request_status = 'pending'`
    );
    res.json({ success: true, count: rows[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Change bed requests count
router.get("/change", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count 
       FROM change_bed_requests 
       WHERE request_status = 'pending'`
    );
    res.json({ success: true, count: rows[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Account deletion requests count
router.get("/deletion", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count 
       FROM tenant_deletion_requests 
       WHERE status = 'pending'`
    );
    res.json({ success: true, count: rows[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Notice period requests count (unseen)
router.get("/notice", adminAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count 
       FROM notice_period_requests 
       WHERE is_seen = 0`
    );
    res.json({ success: true, count: rows[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;