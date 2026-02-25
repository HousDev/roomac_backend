const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const ChangeBedRequestController = require("../controllers/adminChangeBedController");

// All routes are protected with adminAuth
router.get("/", adminAuth, ChangeBedRequestController.getChangeBedRequests);
router.get("/stats/summary", adminAuth, ChangeBedRequestController.getStatistics);
router.get("/:id", adminAuth, ChangeBedRequestController.getChangeBedRequestById);
router.put("/:id/status", adminAuth, ChangeBedRequestController.updateRequestStatus);
// Add to your adminChangeBedRoutes.js
router.get("/debug/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.query(`
      SELECT 
        tr.id as tenant_request_id,
        tr.tenant_id,
        cbr.*,
        mv.id as master_value_id,
        mv.value as reason_value,
        mt.name as master_type_name
      FROM tenant_requests tr
      LEFT JOIN change_bed_requests cbr ON tr.id = cbr.tenant_request_id
      LEFT JOIN master_values mv ON cbr.change_reason_id = mv.id
      LEFT JOIN master_types mt ON mv.master_type_id = mt.id
      WHERE tr.id = ? OR cbr.id = ?
    `, [id, id]);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add to your adminChangeBedRoutes.js
router.get("/debug/reason/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.query(`
      SELECT 
        cbr.id,
        cbr.change_reason_id,
        mv.id as master_value_id,
        mv.value as reason_text,
        mt.name as master_type_name
      FROM change_bed_requests cbr
      LEFT JOIN master_values mv ON cbr.change_reason_id = mv.id
      LEFT JOIN master_types mt ON mv.master_type_id = mt.id
      WHERE cbr.id = ?
    `, [id]);
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;