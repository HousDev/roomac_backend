const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const tenantAuth = require("../middleware/tenantAuth");
const controller = require("../controllers/adminNoticeController");
const db = require("../config/db");

// Admin routes
router.get("/", adminAuth, controller.getNoticeRequests);
router.post("/", adminAuth, controller.createNoticeRequest);
router.put("/:id", adminAuth, controller.updateNoticeRequest);
router.post("/bulk-delete", adminAuth, controller.bulkDeleteNoticeRequests);

// ===== TENANT ROUTES =====

// Get unseen count for tenant
router.get("/tenant/unseen", tenantAuth, async (req, res) => {
  try {
    const tenantId = req.user.id;
    
    const [rows] = await db.query(
      "SELECT COUNT(*) as count FROM notice_period_requests WHERE tenant_id = ? AND is_seen = 0",
      [tenantId]
    );
    
    res.json({
      success: true,
      count: rows[0]?.count || 0
    });
  } catch (err) {
    console.error("Error getting unseen count:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get unseen count"
    });
  }
});

// Mark notice request as seen - THIS IS THE CRITICAL ROUTE
router.patch("/tenant/:id/seen", tenantAuth, async (req, res) => {
  
  
  try {
    const { id } = req.params;
    const tenantId = req.user.id;

    const [result] = await db.query(
      "UPDATE notice_period_requests SET is_seen = 1, updated_at = NOW() WHERE id = ? AND tenant_id = ?",
      [id, tenantId]
    );


    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notice request not found or already seen"
      });
    }

    res.json({
      success: true,
      message: "Notice request marked as seen"
    });
  } catch (err) {
    console.error("Error marking notice as seen:", err);
    res.status(500).json({
      success: false,
      message: "Failed to mark as seen"
    });
  }
});

module.exports = router;