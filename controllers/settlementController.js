const SettlementModel = require("../models/settlementModel");
 
const getSettlements = async (req, res) => {
  try {
    const data = await SettlementModel.getAll({
      status: req.query.status,
      search: req.query.search,
    });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
 
const getSettlementById = async (req, res) => {
  try {
    const item = await SettlementModel.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Settlement not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
 
const createSettlement = async (req, res) => {
  try {
    const { tenant_name, property_name, room_number, settlement_date } = req.body;
    if (!tenant_name || !property_name || !room_number || !settlement_date) {
      return res.status(400).json({ success: false, message: "tenant_name, property_name, room_number, settlement_date are required" });
    }
    // calcSettlement runs inside the model — controller stays clean
    const data = await SettlementModel.create(req.body);
    res.status(201).json({ success: true, message: "Settlement created", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
 
const updateSettlement = async (req, res) => {
  try {
    const existing = await SettlementModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Settlement not found" });
    const data = await SettlementModel.update(req.params.id, req.body);
    res.json({ success: true, message: "Settlement updated", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
 
const deleteSettlement = async (req, res) => {
  try {
    const existing = await SettlementModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Settlement not found" });
    const result = await SettlementModel.delete(req.params.id);
    res.json({ success: true, message: "Settlement deleted", affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
 
const getSettlementStats = async (req, res) => {
  try {
    const stats = await SettlementModel.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
 
module.exports = { getSettlements, getSettlementById, createSettlement, updateSettlement, deleteSettlement, getSettlementStats };