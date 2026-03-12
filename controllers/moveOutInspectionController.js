const MoveOutInspectionModel = require("../models/moveOutInspectionModel");
const HandoverModel = require("../models/handoverModel");

const getInspections = async (req, res) => {
  try {
    const filters = {
      property_id: req.query.property_id,
      status: req.query.status,
      tenant_name: req.query.tenant_name,
      search: req.query.search
    };
    const data = await MoveOutInspectionModel.getAll(filters);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getInspectionById = async (req, res) => {
  try {
    const item = await MoveOutInspectionModel.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Inspection not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getInspectionsByHandover = async (req, res) => {
  try {
    const data = await MoveOutInspectionModel.getByHandoverId(req.params.handoverId);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createInspection = async (req, res) => {
  try {
    const { handover_id } = req.body;

    if (!handover_id) {
      return res.status(400).json({ success: false, message: "handover_id is required" });
    }

    // Check if handover exists and get details
    const handover = await HandoverModel.getById(handover_id);
    if (!handover) {
      return res.status(404).json({ success: false, message: "Handover not found" });
    }

    // Merge handover data with inspection data
    const inspectionData = {
      ...req.body,
      tenant_name: handover.tenant_name,
      tenant_phone: handover.tenant_phone,
      tenant_email: handover.tenant_email,
      property_id: handover.property_id,
      property_name: handover.property_name,
      room_number: handover.room_number,
      bed_number: handover.bed_number,
      move_in_date: handover.move_in_date
    };

    const data = await MoveOutInspectionModel.create(inspectionData);
    res.status(201).json({ success: true, message: "Inspection created successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateInspection = async (req, res) => {
  try {
    const existing = await MoveOutInspectionModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Inspection not found" });

    const data = await MoveOutInspectionModel.update(req.params.id, req.body);
    res.json({ success: true, message: "Inspection updated successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteInspection = async (req, res) => {
  try {
    const existing = await MoveOutInspectionModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Inspection not found" });

    const result = await MoveOutInspectionModel.delete(req.params.id);
    res.json({ success: true, message: "Inspection deleted successfully", affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const bulkDeleteInspections = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Please provide an array of IDs to delete" });
    }

    const result = await MoveOutInspectionModel.bulkDelete(ids);
    res.json({ success: true, message: `${result.affectedRows} inspection(s) deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getInspectionStats = async (req, res) => {
  try {
    const stats = await MoveOutInspectionModel.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getDefaultPenaltyRules = async (req, res) => {
  try {
    const rules = await MoveOutInspectionModel.getDefaultPenaltyRules();
    res.json({ success: true, count: rules.length, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getInspections,
  getInspectionById,
  getInspectionsByHandover,
  createInspection,
  updateInspection,
  deleteInspection,
  bulkDeleteInspections,
  getInspectionStats,
  getDefaultPenaltyRules
};