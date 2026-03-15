// routes/documentListRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/documentListController");

// bulk BEFORE /:id
router.post("/bulk-delete",  ctrl.bulkDelete);

router.get("/",              ctrl.getAll);
router.post("/",             ctrl.create);
router.get("/:id",           ctrl.getById);
router.delete("/:id",        ctrl.remove);
router.patch("/:id/status",  ctrl.updateStatus);
router.post("/:id/share",    ctrl.generateShareLink);

module.exports = router;