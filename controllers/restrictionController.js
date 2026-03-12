// controllers/restrictionController.js
const RestrictionModel = require("../models/restrictionModel");

const getRestrictions = async (req, res) => {
  try {
    const filters = {
      property_id:      req.query.property_id,
      is_active:        req.query.is_active,
      restriction_type: req.query.restriction_type,
      search:           req.query.search,
    };
    const data = await RestrictionModel.getAll(filters);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getRestrictionById = async (req, res) => {
  try {
    const item = await RestrictionModel.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Restriction not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createRestriction = async (req, res) => {
  try {
    const { property_name, restriction_type, description } = req.body;
    if (!property_name || !description) {
      return res.status(400).json({ success: false, message: "property_name and description are required" });
    }
    const data = await RestrictionModel.create(req.body);
    res.status(201).json({ success: true, message: "Restriction created successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateRestriction = async (req, res) => {
  try {
    const existing = await RestrictionModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Restriction not found" });
    const data = await RestrictionModel.update(req.params.id, req.body);
    res.json({ success: true, message: "Restriction updated successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const existing = await RestrictionModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Restriction not found" });
    const newStatus = !existing.is_active;
    const data = await RestrictionModel.toggleStatus(req.params.id, newStatus);
    res.json({ success: true, message: `Restriction ${newStatus ? 'activated' : 'deactivated'}`, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteRestriction = async (req, res) => {
  try {
    const existing = await RestrictionModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Restriction not found" });
    const result = await RestrictionModel.delete(req.params.id);
    res.json({ success: true, message: "Restriction deleted", affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids array is required" });
    }
    const result = await RestrictionModel.bulkDelete(ids);
    res.json({ success: true, message: `${result.affectedRows} restriction(s) deleted`, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await RestrictionModel.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getActiveNow = async (req, res) => {
  try {
    const { property_id } = req.query;
    if (!property_id) return res.status(400).json({ success: false, message: "property_id is required" });
    const data = await RestrictionModel.getActiveNow(property_id);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getRestrictions, getRestrictionById,
  createRestriction, updateRestriction,
  toggleStatus, deleteRestriction,
  bulkDelete, getStats, getActiveNow,
};