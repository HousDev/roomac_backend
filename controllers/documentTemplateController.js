// controllers/documentTemplateController.js
const path = require("path");
const fs   = require("fs");
const { DocumentTemplateModel } = require("../models/documentTemplateModel");

const toPublicUrl = (filename) =>
  filename ? `/uploads/template-logos/${filename}` : null;

const deleteLogoFile = (logoUrl) => {
  if (!logoUrl) return;
  try {
    const filePath = path.join(__dirname, "../public", logoUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) { /* ignore */ }
};

// GET /api/document-templates
const getAll = async (req, res) => {
  try {
    const data = await DocumentTemplateModel.getAll({
      category:  req.query.category,
      is_active: req.query.is_active,
      search:    req.query.search,
    });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/document-templates/:id
const getById = async (req, res) => {
  try {
    const item = await DocumentTemplateModel.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Template not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/document-templates
const create = async (req, res) => {
  try {
    const { name, category, description, html_content, change_notes } = req.body;
    if (!name?.trim())         return res.status(400).json({ success: false, message: "name is required" });
    if (!html_content?.trim()) return res.status(400).json({ success: false, message: "html_content is required" });

    const logo_url = req.file ? toPublicUrl(req.file.filename) : null;

    const data = await DocumentTemplateModel.create({
      name, category, description, html_content,
      logo_url, change_notes,
      created_by: req.user?.name || "Admin",
    });

    res.status(201).json({ success: true, message: "Template created", data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/document-templates/:id
const update = async (req, res) => {
  try {
    const existing = await DocumentTemplateModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Template not found" });

    let logo_url = undefined;
    if (req.file) {
      deleteLogoFile(existing.logo_url);
      logo_url = toPublicUrl(req.file.filename);
    } else if (req.body.remove_logo === "true") {
      deleteLogoFile(existing.logo_url);
      logo_url = null;
    }

    const { name, category, description, html_content, change_notes, is_active } = req.body;

    const data = await DocumentTemplateModel.update(req.params.id, {
      name, category, description, html_content, change_notes, logo_url,
      is_active: is_active !== undefined ? (is_active === "true" || is_active === true) : undefined,
      last_modified_by: req.user?.name || "Admin",
    });

    res.json({ success: true, message: `Updated to v${data.version}`, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/document-templates/:id
const remove = async (req, res) => {
  try {
    const existing = await DocumentTemplateModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Template not found" });
    deleteLogoFile(existing.logo_url);
    const result = await DocumentTemplateModel.delete(req.params.id);
    res.json({ success: true, message: "Template deleted", affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/document-templates/bulk-delete
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length)
      return res.status(400).json({ success: false, message: "ids[] is required" });
    const result = await DocumentTemplateModel.bulkDelete(ids);
    res.json({ success: true, message: `${result.affectedRows} template(s) deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/document-templates/bulk-status
const bulkStatus = async (req, res) => {
  try {
    const { ids, is_active } = req.body;
    if (!Array.isArray(ids) || !ids.length)
      return res.status(400).json({ success: false, message: "ids[] is required" });
    if (is_active === undefined)
      return res.status(400).json({ success: false, message: "is_active is required" });
    const result = await DocumentTemplateModel.bulkStatus(ids, is_active);
    res.json({ success: true, message: `${result.affectedRows} template(s) updated` });
  } catch (err) {
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
    if (!data) return res.status(404).json({ success: false, message: "Version not found" });
    res.json({ success: true, message: `Restored to v${data.version}`, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove, bulkDelete, bulkStatus, restoreVersion };