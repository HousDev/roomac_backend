// controllers/documentListController.js
const { DocumentListModel: DocumentModel } = require("../models/documentListModel");

// GET /api/documents
const getAll = async (req, res) => {
  try {
    res.json({ success: true, ...await DocumentModel.getAll(req.query) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/documents/:id
const getById = async (req, res) => {
  try {
    const doc = await DocumentModel.getById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
    res.json({ success: true, data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/documents
const create = async (req, res) => {
  try {
    const { template_id, document_name, tenant_name, tenant_phone, html_content, data_json = {} } = req.body;
    if (!template_id)   return res.status(400).json({ success: false, message: "template_id required" });
    if (!document_name) return res.status(400).json({ success: false, message: "document_name required" });
    if (!tenant_name)   return res.status(400).json({ success: false, message: "tenant_name required" });
    if (!tenant_phone)  return res.status(400).json({ success: false, message: "tenant_phone required" });
    if (!html_content)  return res.status(400).json({ success: false, message: "html_content required" });

    const dj = typeof data_json === "string" ? JSON.parse(data_json) : (data_json || {});

    const doc = await DocumentModel.create({
      template_id,
      document_name,
      document_title:         dj.document_title         || null,
      document_type:          dj.document_type          || req.body.document_type  || null,
      tenant_id:              req.body.tenant_id         || null,
      tenant_name,
      tenant_phone,
      tenant_email:           dj.tenant_email           || req.body.tenant_email   || null,
      aadhaar_number:         dj.aadhaar_number         || null,
      pan_number:             dj.pan_number             || null,
      emergency_contact_name: dj.emergency_contact_name || null,
      emergency_phone:        dj.emergency_phone        || null,
      property_name:          dj.property_name          || req.body.property_name  || null,
      property_address:       dj.company_address        || dj.property_address     || null,
      room_number:            dj.room_number            || req.body.room_number    || null,
      bed_number:             dj.bed_number             || null,
      move_in_date:           dj.move_in_date           || null,
      rent_amount:            dj.rent_amount            ? parseFloat(dj.rent_amount)      : null,
      security_deposit:       dj.security_deposit       ? parseFloat(dj.security_deposit) : null,
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
      tags:                   Array.isArray(req.body.tags) ? req.body.tags : [],
      notes:                  req.body.notes            || null,
    });

    res.status(201).json({ success: true, message: "Document created", data: doc });
  } catch (e) {
    console.error("create document error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// PATCH /api/documents/:id/status
const updateStatus = async (req, res) => {
  try {
    const { status, signed_by, signature_data,notes} = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status required" });
    const doc = await DocumentModel.updateStatus(
      req.params.id, status,
      req.user?.name || "Admin",
      { signed_by, signature_data, notes }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: `Status → ${status}`, data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/documents/:id/share
const generateShareLink = async (req, res) => {
  try {
    const doc = await DocumentModel.getById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    const { token, expires } = await DocumentModel.generateShareToken(req.params.id);
    const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/document/view/${token}`;
    res.json({ success: true, data: { token, shareUrl, expires } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/documents/:id
const remove = async (req, res) => {
  try {
    const doc = await DocumentModel.getById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    await DocumentModel.delete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/documents/bulk-delete
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length)
      return res.status(400).json({ success: false, message: "ids[] required" });
    const r = await DocumentModel.bulkDelete(ids);
    res.json({ success: true, message: `${r.affectedRows} deleted` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateDocument = async (req, res) => {
  try {
    const doc = await DocumentModel.getById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    const updated = await DocumentModel.updateDocument(req.params.id, {
      tenant_name:            req.body.tenant_name,
      tenant_phone:           req.body.tenant_phone,
      tenant_email:           req.body.tenant_email,
      aadhaar_number:         req.body.aadhaar_number,
      pan_number:             req.body.pan_number,
      emergency_contact_name: req.body.emergency_contact_name,
      emergency_phone:        req.body.emergency_phone,
      property_name:          req.body.property_name,
      room_number:            req.body.room_number,
      bed_number:             req.body.bed_number,
      move_in_date:           req.body.move_in_date,
      rent_amount:            req.body.rent_amount,
      security_deposit:       req.body.security_deposit,
      payment_mode:           req.body.payment_mode,
      company_name:           req.body.company_name,
      company_address:        req.body.company_address,
      notes:                  req.body.notes,
      data_json:              req.body.data_json || {},
    });

    res.json({ success: true, message: "Document updated", data: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
// GET /api/documents/tenant - Get documents for logged-in tenant
const getByTenant = async (req, res) => {
  try {
    const tenantId = req.user.id; // From tenantAuth middleware
    
    const { page = 1, pageSize = 50, status, search } = req.query;
    
    const result = await DocumentModel.getByTenantId(tenantId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      search
    });
    
    res.json({ 
      success: true, 
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages
    });
  } catch (e) { 
    console.error("Error fetching tenant documents:", e);
    res.status(500).json({ success: false, message: e.message }); 
  }
};


module.exports = { getAll, getById, create, updateStatus, generateShareLink, remove, bulkDelete, getByTenant, updateDocument };