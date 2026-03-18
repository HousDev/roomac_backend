const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { DocumentTemplateModel } = require("../models/documentTemplateModel");

// ==================== UPLOAD CONFIGURATION ====================
// Create upload directories
const uploadPath = path.join(__dirname, "..", "uploads", "template-logos");

// Create folders if not exist
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `logo-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml"
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, WEBP, GIF, SVG) are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
}).single('logo'); // 'logo' is the field name from frontend

// Safe delete helper
const safeDelete = (filePath) => {
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.warn("⚠️ Temp delete failed:", err.message);
      }
    });
  }, 500);
};

// Helper to generate public URL
const toPublicUrl = (filename) => {
  return filename ? `/uploads/template-logos/${filename}` : null;
};

// Helper to delete logo file
const deleteLogoFile = (logoUrl) => {
  if (!logoUrl) return;
  try {
    const filename = logoUrl.split('/').pop();
    const filePath = path.join(uploadPath, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error("Error deleting logo file:", e);
  }
};

// ==================== CONTROLLER METHODS ====================

// GET /api/document-templates
const getAll = async (req, res) => {
  try {
    const data = await DocumentTemplateModel.getAll({
      category: req.query.category,
      is_active: req.query.is_active,
      search: req.query.search,
    });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("getAll error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/document-templates/:id
const getById = async (req, res) => {
  try {
    const item = await DocumentTemplateModel.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    console.error("getById error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/document-templates
const create = async (req, res) => {
  try {

    const { name, category, description, html_content, change_notes } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      if (req.file) safeDelete(req.file.path);
      return res.status(400).json({ success: false, message: "name is required" });
    }

    if (!html_content?.trim()) {
      if (req.file) safeDelete(req.file.path);
      return res.status(400).json({ success: false, message: "html_content is required" });
    }

    // Get logo URL if file was uploaded
    const logo_url = req.file ? toPublicUrl(req.file.filename) : null;

    // Create template in database
    const data = await DocumentTemplateModel.create({
      name: name.trim(),
      category: category || "Other",
      description: description?.trim() || null,
      html_content: html_content.trim(),
      logo_url,
      change_notes: change_notes?.trim() || "Initial version",
      created_by: req.user?.name || "Admin",
    });


    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data
    });

  } catch (err) {
    console.error("create error:", err);
    if (req.file) safeDelete(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/document-templates/:id
const update = async (req, res) => {
  try {

    const existing = await DocumentTemplateModel.getById(req.params.id);
    if (!existing) {
      if (req.file) safeDelete(req.file.path);
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const { name, category, description, html_content, change_notes, is_active, remove_logo } = req.body;

    // Handle logo
    let logo_url = undefined;

    // If new file uploaded
    if (req.file) {
      // Delete old logo if exists
      if (existing.logo_url) {
        deleteLogoFile(existing.logo_url);
      }
      logo_url = toPublicUrl(req.file.filename);
    }
    // If remove_logo flag is true
    else if (remove_logo === "true" || remove_logo === true) {
      if (existing.logo_url) {
        deleteLogoFile(existing.logo_url);
      }
      logo_url = null;
    }

    // Update template
    const data = await DocumentTemplateModel.update(req.params.id, {
      name: name?.trim() || existing.name,
      category: category || existing.category,
      description: description !== undefined ? description?.trim() : existing.description,
      html_content: html_content?.trim() || existing.html_content,
      change_notes: change_notes?.trim() || null,
      logo_url,
      is_active: is_active !== undefined 
        ? (is_active === "true" || is_active === true) 
        : existing.is_active,
      last_modified_by: req.user?.name || "Admin",
    });


    res.json({
      success: true,
      message: `Template updated to v${data.version}`,
      data
    });

  } catch (err) {
    console.error("update error:", err);
    if (req.file) safeDelete(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/document-templates/:id
const remove = async (req, res) => {
  try {
    const existing = await DocumentTemplateModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    // Delete logo file if exists
    if (existing.logo_url) {
      deleteLogoFile(existing.logo_url);
    }

    const result = await DocumentTemplateModel.delete(req.params.id);

    res.json({
      success: true,
      message: "Template deleted successfully",
      affectedRows: result.affectedRows
    });

  } catch (err) {
    console.error("delete error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/document-templates/bulk-delete
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: "ids[] is required" });
    }

    // Get all templates to delete their logos
    for (const id of ids) {
      const template = await DocumentTemplateModel.getById(id);
      if (template?.logo_url) {
        deleteLogoFile(template.logo_url);
      }
    }

    const result = await DocumentTemplateModel.bulkDelete(ids);

    res.json({
      success: true,
      message: `${result.affectedRows} template(s) deleted`
    });

  } catch (err) {
    console.error("bulkDelete error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/document-templates/bulk-status
const bulkStatus = async (req, res) => {
  try {
    const { ids, is_active } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: "ids[] is required" });
    }
    if (is_active === undefined) {
      return res.status(400).json({ success: false, message: "is_active is required" });
    }

    const result = await DocumentTemplateModel.bulkStatus(ids, is_active);

    res.json({
      success: true,
      message: `${result.affectedRows} template(s) updated`
    });

  } catch (err) {
    console.error("bulkStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/document-templates/:id/restore/:version
const restoreVersion = async (req, res) => {
  try {
    const data = await DocumentTemplateModel.restoreVersion(
      req.params.id,
      req.params.version,
      req.user?.name || "Admin"
    );
    
    if (!data) {
      return res.status(404).json({ success: false, message: "Version not found" });
    }
    
    res.json({
      success: true,
      message: `Restored to v${data.version}`,
      data
    });
    
  } catch (err) {
    console.error("restoreVersion error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Export the upload middleware so it can be used in routes
module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  bulkDelete,
  bulkStatus,
  restoreVersion,
  upload // Export upload for routes
};