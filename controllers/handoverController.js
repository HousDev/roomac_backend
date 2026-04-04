const HandoverModel = require("../models/handoverModel");

const getHandovers = async (req, res) => {
  try {
    const filters = {
      property_id: req.query.property_id,
      tenant_id:   req.query.tenant_id,
      status:      req.query.status,
      search:      req.query.search,
    };
    const data = await HandoverModel.getAll(filters);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getHandoverById = async (req, res) => {
  try {
    const item = await HandoverModel.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Handover not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createHandover = async (req, res) => {
  try {
    const { tenant_name, property_id, room_number } = req.body;
    if (!tenant_name || !property_id || !room_number) {
      return res.status(400).json({ success: false, message: "tenant_name, property_id, room_number are required" });
    }
    const data = await HandoverModel.create(req.body);
    res.status(201).json({ success: true, message: "Handover created successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateHandover = async (req, res) => {
  try {
    const existing = await HandoverModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Handover not found" });
    const data = await HandoverModel.update(req.params.id, req.body);
    res.json({ success: true, message: "Handover updated successfully", data });
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteHandover = async (req, res) => {
  try {
    const existing = await HandoverModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Handover not found" });
    const result = await HandoverModel.delete(req.params.id);
    res.json({ success: true, message: "Handover deleted successfully", affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getHandoverStats = async (req, res) => {
  try {
    const stats = await HandoverModel.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getHandovers, getHandoverById, createHandover, updateHandover, deleteHandover, getHandoverStats };
