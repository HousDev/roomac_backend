// routes/visitorRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/visitorController");

// ── Stats & check-blocked first (before /:id to avoid param conflicts) ──────
router.get("/stats",          ctrl.getVisitorStats);
router.get("/check-blocked",  ctrl.checkBlockedStatus);

// ── Core CRUD ────────────────────────────────────────────────────────────────
router.get("/",               ctrl.getVisitors);
router.get("/:id",            ctrl.getVisitorById);
router.post("/",              ctrl.createVisitor);
router.put("/:id",            ctrl.updateVisitor);
router.delete("/:id",         ctrl.deleteVisitor);

// ── Check-out ────────────────────────────────────────────────────────────────
router.put("/:id/checkout",   ctrl.checkOutVisitor);
router.post("/bulk-checkout", ctrl.bulkCheckOut);

// ── Block / Unblock (uses visitor_logs only, no separate table) ──────────────
router.post("/block",         ctrl.blockVisitor);
router.post("/unblock",       ctrl.unblockVisitor);

module.exports = router;