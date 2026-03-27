// routes/pricingPlanRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/pricingPlanController");

// ── Health ────────────────────────────────────────────────────
router.get("/health", ctrl.healthCheck);

// ── Short Stay Banner ─────────────────────────────────────────
// GET  /api/pricing-plans/short-stay-banner?property_id=1
router.get("/short-stay-banner", ctrl.getShortStayBanner);
// POST /api/pricing-plans/short-stay-banner
router.post("/short-stay-banner", ctrl.upsertShortStayBanner);

// ── Pricing Plans (CRUD) ──────────────────────────────────────
// GET  /api/pricing-plans?property_id=1        (all, simple list)
router.get("/", ctrl.getAll);
// GET  /api/pricing-plans/paginated             (paginated + filters)
router.get("/paginated", ctrl.getPaginated);
// GET  /api/pricing-plans/:id
router.get("/:id", ctrl.getById);
// POST /api/pricing-plans
router.post("/", ctrl.create);
// PATCH /api/pricing-plans/:id
router.patch("/:id", ctrl.update);
// PATCH /api/pricing-plans/:id/toggle
router.patch("/:id/toggle", ctrl.toggleActive);
// DELETE /api/pricing-plans/:id
router.delete("/:id", ctrl.remove);

module.exports = router;

