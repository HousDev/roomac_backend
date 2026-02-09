// routes/adminMaintenanceRoutes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const controller = require("../controllers/adminMaintenanceController");

router.get("/", adminAuth, controller.getMaintenanceRequests);
router.put("/:id", adminAuth, controller.updateMaintenanceRequest);

module.exports = router;