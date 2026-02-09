// routes/staffRoutes.js
const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffcontroller");
const { uploadFields } = require("../middleware/uploadStaffDoc");

// Route definitions with file upload middleware
router.post("/", uploadFields, staffController.createStaff);
router.get("/", staffController.getStaff);
router.put("/:id", uploadFields, staffController.updateStaff);
router.delete("/:id", staffController.deleteStaff);
router.delete("/:id/document", staffController.deleteDocument);

module.exports = router;