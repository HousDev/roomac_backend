// routes/documentRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/documentController");

router.post("/bulk-delete",                    ctrl.bulkDelete);            // MUST be before /:id
// ── NEW: tenants that already have a doc for this template ──────────────────
router.get("/tenants-with-template/:templateId", ctrl.getTenantsWithTemplate); // MUST be before /:id

router.get("/",              ctrl.getAll);
router.post("/",             ctrl.create);
router.get("/:id",           ctrl.getById);
router.delete("/:id",        ctrl.remove);
router.patch("/:id/status",  ctrl.updateStatus);

module.exports = router;