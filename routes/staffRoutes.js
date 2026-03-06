// routes/staffRoutes.js
const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffcontroller");
const { uploadFields } = require("../middleware/uploadStaffDoc");

// Route definitions with file upload middleware
router.post("/", uploadFields, staffController.createStaff);
router.get("/", staffController.getStaff);
router.get("/:id", staffController.getStaffById);
router.put("/:id", uploadFields, staffController.updateStaff);
router.delete("/:id", staffController.deleteStaff);
// In routes/staffRoutes.js - update the deleteDocument route

router.delete("/:id/document", async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;
    
    const staffModel = require("../models/staffModel");
    const updatedStaff = await staffModel.deleteDocument(id, documentType);
    
    const { password, ...staffWithoutPassword } = updatedStaff;
    
    // Build file URLs for response
    const buildFileUrl = (filename) => {
      if (!filename) return null;
      if (filename.startsWith('http') || filename.startsWith('/uploads')) {
        return filename;
      }
      return `/uploads/staff-documents/${filename}`;
    };

    res.json({
      success: true,
      message: "Document deleted successfully",
      data: {
        ...staffWithoutPassword,
        aadhar_document_url: updatedStaff.aadhar_document_url ? buildFileUrl(updatedStaff.aadhar_document_url) : null,
        pan_document_url: updatedStaff.pan_document_url ? buildFileUrl(updatedStaff.pan_document_url) : null,
        photo_url: updatedStaff.photo_url ? buildFileUrl(updatedStaff.photo_url) : null
      }
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete document"
    });
  }
});
module.exports = router;