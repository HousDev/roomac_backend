// controllers/visitorController.js
const VisitorModel = require("../models/visitorModel");

// ── GET all visitors ────────────────────────────────────────────────────────
const getVisitors = async (req, res) => {
  try {
    // Auto-mark overstayed before every fetch
    await VisitorModel.updateOverstayed();

    const filters = {
      property_id: req.query.property_id,
      tenant_id:   req.query.tenant_id,
      status:      req.query.status,
      search:      req.query.search,
      date_from:   req.query.date_from,
      date_to:     req.query.date_to,
    };
    const data = await VisitorModel.getAll(filters);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET single visitor ──────────────────────────────────────────────────────
const getVisitorById = async (req, res) => {
  try {
    const item = await VisitorModel.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Visitor not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── CREATE visitor ──────────────────────────────────────────────────────────
const createVisitor = async (req, res) => {
  try {
    const {
      visitor_name, visitor_phone, tenant_name,
      property_name, room_number,
      id_proof_type, id_proof_number,
      purpose, security_guard_name,
    } = req.body;

    // Validate required fields
    if (!visitor_name || !visitor_phone || !tenant_name || !property_name || !room_number) {
      return res.status(400).json({
        success: false,
        message: "visitor_name, visitor_phone, tenant_name, property_name, room_number are required",
      });
    }

    // ── Check if visitor is blocked using visitor_logs only ────────────────
    const blocked = await VisitorModel.checkBlocked(visitor_phone, id_proof_number);
    if (blocked) {
      return res.status(403).json({
        success: false,
        blocked: true,
        message: "Visitor is blocked",
        reason:      blocked.block_reason,
        blocked_by:  blocked.blocked_by,
        blocked_date: blocked.blocked_date,
      });
    }

    // Generate QR code
    const qr_code = `VIS-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const data = await VisitorModel.create({ ...req.body, qr_code });
    res.status(201).json({ success: true, message: "Visitor registered successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── CHECK OUT single visitor ────────────────────────────────────────────────
const checkOutVisitor = async (req, res) => {
  try {
    const existing = await VisitorModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Visitor not found" });
    if (existing.status === 'checked_out') {
      return res.status(400).json({ success: false, message: "Visitor already checked out" });
    }

    const { checked_out_by } = req.body;
    const data = await VisitorModel.checkOut(req.params.id, checked_out_by || 'Security Guard');
    res.json({ success: true, message: "Visitor checked out successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── BULK CHECK OUT ──────────────────────────────────────────────────────────
const bulkCheckOut = async (req, res) => {
  try {
    const { ids, checked_out_by } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids array is required" });
    }
    const result = await VisitorModel.bulkCheckOut(ids, checked_out_by || 'Security Guard');
    res.json({
      success: true,
      message: `${result.affectedRows} visitor(s) checked out`,
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── UPDATE visitor ──────────────────────────────────────────────────────────
const updateVisitor = async (req, res) => {
  try {
    const existing = await VisitorModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Visitor not found" });
    const data = await VisitorModel.update(req.params.id, req.body);
    res.json({ success: true, message: "Visitor updated successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── DELETE visitor ──────────────────────────────────────────────────────────
const deleteVisitor = async (req, res) => {
  try {
    const existing = await VisitorModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Visitor not found" });
    const result = await VisitorModel.delete(req.params.id);
    res.json({ success: true, message: "Visitor record deleted", affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── BLOCK visitor ───────────────────────────────────────────────────────────
// Updates is_blocked=1 on all visitor_logs rows for this phone+id_proof
const blockVisitor = async (req, res) => {
  try {
    const { visitor_phone, id_proof_number, reason, blocked_by } = req.body;

    if (!visitor_phone || !reason) {
      return res.status(400).json({ success: false, message: "visitor_phone and reason are required" });
    }

    const result = await VisitorModel.blockVisitor({
      visitor_phone,
      id_proof_number: id_proof_number || '',
      reason,
      blocked_by: blocked_by || 'Security',
    });

    res.json({
      success: true,
      message: "Visitor blocked successfully",
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── UNBLOCK visitor ─────────────────────────────────────────────────────────
const unblockVisitor = async (req, res) => {
  try {
    const { visitor_phone, id_proof_number } = req.body;
    if (!visitor_phone) {
      return res.status(400).json({ success: false, message: "visitor_phone is required" });
    }
    const result = await VisitorModel.unblockVisitor(visitor_phone, id_proof_number || '');
    res.json({
      success: true,
      message: "Visitor unblocked successfully",
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── CHECK BLOCKED STATUS ─────────────────────────────────────────────────────
// Queries visitor_logs only — no separate table
const checkBlockedStatus = async (req, res) => {
  try {
    const { visitor_phone, id_proof_number } = req.query;
if (!id_proof_number && !visitor_phone) {
  return res.status(400).json({ success: false, message: "id_proof_number or visitor_phone is required" });
}
    const blocked = await VisitorModel.checkBlocked(visitor_phone, id_proof_number || '');
    res.json({
      success: true,
      is_blocked: !!blocked,
      data: blocked
        ? {
            reason:       blocked.block_reason,
            blocked_by:   blocked.blocked_by,
            blocked_date: blocked.blocked_date,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── STATS ───────────────────────────────────────────────────────────────────
const getVisitorStats = async (req, res) => {
  try {
    const stats = await VisitorModel.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getVisitors,
  getVisitorById,
  createVisitor,
  checkOutVisitor,
  bulkCheckOut,
  updateVisitor,
  deleteVisitor,
  blockVisitor,
  unblockVisitor,
  checkBlockedStatus,
  getVisitorStats,
};