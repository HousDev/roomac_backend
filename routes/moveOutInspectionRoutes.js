const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/moveOutInspectionController");

// Stats
router.get("/stats", ctrl.getInspectionStats);

// Default penalty rules
router.get("/penalty-rules/default", ctrl.getDefaultPenaltyRules);

// Bulk operations
router.post("/bulk-delete", ctrl.bulkDeleteInspections);

// Main CRUD
router.get("/", ctrl.getInspections);
router.get("/by-handover/:handoverId", ctrl.getInspectionsByHandover);
router.get("/:id", ctrl.getInspectionById);
router.post("/", ctrl.createInspection);
router.put("/:id", ctrl.updateInspection);
router.delete("/:id", ctrl.deleteInspection);

module.exports = router;