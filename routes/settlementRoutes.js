const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/settlementController");
 
router.get("/stats",  ctrl.getSettlementStats);
router.get("/",       ctrl.getSettlements);
router.get("/:id",    ctrl.getSettlementById);
router.post("/",      ctrl.createSettlement);
router.put("/:id",    ctrl.updateSettlement);
router.delete("/:id", ctrl.deleteSettlement);
 
module.exports = router;