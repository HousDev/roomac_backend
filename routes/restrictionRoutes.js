// routes/restrictionRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/restrictionController");

router.get("/stats",        ctrl.getStats);
router.get("/active-now",   ctrl.getActiveNow);
router.get("/",             ctrl.getRestrictions);
router.get("/:id",          ctrl.getRestrictionById);
router.post("/",            ctrl.createRestriction);
router.put("/:id",          ctrl.updateRestriction);
router.patch("/:id/toggle", ctrl.toggleStatus);
router.delete("/:id",       ctrl.deleteRestriction);
router.post("/bulk-delete", ctrl.bulkDelete);

module.exports = router;