// controllers/documentController.js — 

const { DocumentModel } = require("../models/documentModel");

const getAll = async (req, res) => {
  try {
    res.json({ success: true, ...await DocumentModel.getAll(req.query) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getById = async (req, res) => {
  try {
    const doc = await DocumentModel.getById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── NEW: returns tenant_ids that already have a document for a given template ─
// GET /api/documents/tenants-with-template/:templateId
const getTenantsWithTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    if (!templateId) return res.status(400).json({ success: false, message: "templateId required" });
    const rows = await DocumentModel.getTenantsWithTemplate(templateId);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const create = async (req, res) => {
  try {
    const {
      template_id, document_name, tenant_name, tenant_phone,
      html_content, data_json = {},
    } = req.body;

    if (!template_id)   return res.status(400).json({ success: false, message: "template_id required" });
    if (!document_name) return res.status(400).json({ success: false, message: "document_name required" });
    if (!tenant_name)   return res.status(400).json({ success: false, message: "tenant_name required" });
    if (!tenant_phone)  return res.status(400).json({ success: false, message: "tenant_phone required" });
    if (!html_content)  return res.status(400).json({ success: false, message: "html_content required" });

    const dj = typeof data_json === "string" ? JSON.parse(data_json) : (data_json || {});

    const doc = await DocumentModel.create({
      template_id,
      document_name,
      document_title:         dj.document_title         || req.body.document_title         || null,
      document_type:          dj.document_type          || req.body.document_type          || null,
      tenant_id:              req.body.tenant_id         || null,
      tenant_name,
      tenant_phone,
      tenant_email:           dj.tenant_email           || req.body.tenant_email           || null,
      aadhaar_number:         dj.aadhaar_number         || null,
      pan_number:             dj.pan_number             || null,
      emergency_contact_name: dj.emergency_contact_name || null,
      emergency_phone:        dj.emergency_phone        || null,
      property_name:          dj.property_name          || req.body.property_name          || null,
      property_address:       dj.company_address        || dj.property_address             || null,
      room_number:            dj.room_number            || req.body.room_number            || null,
      bed_number:             dj.bed_number             || null,
      move_in_date:           dj.move_in_date           || null,
      rent_amount:            dj.rent_amount            ? parseFloat(dj.rent_amount)       : null,
      security_deposit:       dj.security_deposit       ? parseFloat(dj.security_deposit)  : null,
      payment_mode:           dj.payment_mode           || null,
      company_name:           dj.company_name           || null,
      company_address:        dj.company_address        || null,
      html_content,
      data_json:              dj,
      status:                 req.body.status           || "Created",
      created_by:             req.user?.name            || req.body.created_by || "Admin",
      signature_required:     req.body.signature_required ?? false,
      priority:               req.body.priority         || "normal",
      expiry_date:            req.body.expiry_date      || null,
      tags:                   req.body.tags             || [],
      notes:                  req.body.notes            || null,
    });

    res.status(201).json({ success: true, message: "Document created", data: doc });
  } catch (e) {
    console.error("create document error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status, signed_by, signature_data } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status required" });
    const doc = await DocumentModel.updateStatus(
      req.params.id, status, req.user?.name || "Admin",
      { signed_by, signature_data }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: `Status updated to ${status}`, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const remove = async (req, res) => {
  try {
    const doc = await DocumentModel.getById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    await DocumentModel.delete(req.params.id);
    res.json({ success: true, message: "Document deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length)
      return res.status(400).json({ success: false, message: "ids[] required" });
    const r = await DocumentModel.bulkDelete(ids);
    res.json({ success: true, message: `${r.affectedRows} document(s) deleted` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getAll, getById, create, updateStatus, remove, bulkDelete, getTenantsWithTemplate };