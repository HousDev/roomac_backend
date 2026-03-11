// inventoryController.js
const InventoryModel = require("../models/inventoryModel");

const getInventory = async (req, res) => {
  try {
    const filters = {
      property_id: req.query.property_id,
      category_id: req.query.category_id,
      stock_status: req.query.stock_status,
      search: req.query.search,
    };
    const items = await InventoryModel.getAllInventory(filters);
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getInventoryById = async (req, res) => {
  try {
    const item = await InventoryModel.getInventoryById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createInventory = async (req, res) => {
  try {
    const { item_name, category_id, property_id, quantity } = req.body;
    if (!item_name || !category_id || !property_id || quantity === undefined) {
      return res.status(400).json({ success: false, message: "item_name, category_id, property_id, quantity are required" });
    }
    const item = await InventoryModel.createInventory(req.body);
    res.status(201).json({ success: true, message: "Item created successfully", data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateInventory = async (req, res) => {
  try {
    const existing = await InventoryModel.getInventoryById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Item not found" });
    const result = await InventoryModel.updateInventory(req.params.id, req.body);
    res.json({ success: true, message: "Item updated successfully", affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteInventory = async (req, res) => {
  try {
    const existing = await InventoryModel.getInventoryById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Item not found" });
    const result = await InventoryModel.deleteInventory(req.params.id);
    res.json({ success: true, message: "Item deleted successfully", affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const bulkDeleteInventory = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids array is required" });
    }
    const result = await InventoryModel.bulkDelete(ids);
    res.json({ success: true, message: `${result.affectedRows} items deleted`, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getInventoryStats = async (req, res) => {
  try {
    const stats = await InventoryModel.getInventoryStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getInventory, getInventoryById, createInventory, updateInventory, deleteInventory, bulkDeleteInventory, getInventoryStats };