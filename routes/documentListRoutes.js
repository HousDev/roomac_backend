// routes/documentListRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/documentListController");
const tenantAuth = require("../middleware/tenantAuth"); 

// TEST ROUTE - Add this temporarily
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Document routes are working" });
});

// bulk BEFORE /:id
router.post("/bulk-delete",  ctrl.bulkDelete);
router.get("/tenant", tenantAuth, ctrl.getByTenant); 
router.get("/",              ctrl.getAll);
router.post("/",             ctrl.create);
router.get("/:id",           ctrl.getById);
router.delete("/:id",        ctrl.remove);
router.patch("/:id/status",  ctrl.updateStatus);
router.post("/:id/share",    ctrl.generateShareLink);

module.exports = router;