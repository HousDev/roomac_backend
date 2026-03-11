// routes/handoverRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/handoverController");

router.get("/stats",  ctrl.getHandoverStats);
router.get("/",       ctrl.getHandovers);
router.get("/:id",    ctrl.getHandoverById);
router.post("/",      ctrl.createHandover);
router.put("/:id",    ctrl.updateHandover);
router.delete("/:id", ctrl.deleteHandover);

module.exports = router;
