// routes/penaltyRulesRoutes.js
const express = require("express");
const router = express.Router();
const penaltyRulesController = require("../controllers/penaltyRulesController");

// GET /api/penalty-rules/calculate?category=...&from=...&to=...
router.get("/calculate", penaltyRulesController.calculatePenalty);

// GET /api/penalty-rules/stats
router.get("/stats", penaltyRulesController.getPenaltyStats);

// GET /api/penalty-rules?category=...
router.get("/", penaltyRulesController.getPenaltyRules);

// GET /api/penalty-rules/:id
router.get("/:id", penaltyRulesController.getPenaltyRuleById);

// POST /api/penalty-rules
router.post("/", penaltyRulesController.createPenaltyRule);

// PUT /api/penalty-rules/:id
router.put("/:id", penaltyRulesController.updatePenaltyRule);

// DELETE /api/penalty-rules/bulk
router.delete("/bulk", penaltyRulesController.bulkDeletePenaltyRules);

// DELETE /api/penalty-rules/:id
router.delete("/:id", penaltyRulesController.deletePenaltyRule);

module.exports = router;