// controllers/penaltyRulesController.js
const PenaltyRuleModel = require("../models/penaltyRuleModel");

const getPenaltyRules = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      from: req.query.from,
      to: req.query.to,
    };
    const rules = await PenaltyRuleModel.getAllPenaltyRules(filters);
    res.json({ success: true, count: rules.length, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getPenaltyRuleById = async (req, res) => {
  try {
    const rule = await PenaltyRuleModel.getPenaltyRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: "Penalty rule not found" });
    }
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const calculatePenalty = async (req, res) => {
  try {
    const { category, from, to } = req.query;
    
    if (!category || !from || !to) {
      return res.status(400).json({ 
        success: false, 
        message: "category, from, and to are required" 
      });
    }
    
    const penalty = await PenaltyRuleModel.calculatePenalty(category, from, to);
    
    if (penalty === null) {
      return res.status(404).json({ 
        success: false, 
        message: "No penalty rule found for this condition change" 
      });
    }
    
    res.json({ success: true, data: { penalty_amount: penalty } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createPenaltyRule = async (req, res) => {
  try {
    const { item_category, from_condition, to_condition, penalty_amount, description } = req.body;
    
    if (!item_category || !from_condition || !to_condition || penalty_amount === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: "item_category, from_condition, to_condition, penalty_amount are required" 
      });
    }
    
    if (from_condition === to_condition) {
      return res.status(400).json({ 
        success: false, 
        message: "from_condition and to_condition cannot be the same" 
      });
    }
    
    const rule = await PenaltyRuleModel.createPenaltyRule(req.body);
    res.status(201).json({ 
      success: true, 
      message: "Penalty rule created successfully", 
      data: rule 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updatePenaltyRule = async (req, res) => {
  try {
    const existing = await PenaltyRuleModel.getPenaltyRuleById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Penalty rule not found" });
    }
    
    const result = await PenaltyRuleModel.updatePenaltyRule(req.params.id, req.body);
    res.json({ 
      success: true, 
      message: "Penalty rule updated successfully", 
      affectedRows: result.affectedRows 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const deletePenaltyRule = async (req, res) => {
  try {
    const existing = await PenaltyRuleModel.getPenaltyRuleById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Penalty rule not found" });
    }
    
    const result = await PenaltyRuleModel.deletePenaltyRule(req.params.id);
    res.json({ 
      success: true, 
      message: "Penalty rule deleted successfully", 
      affectedRows: result.affectedRows 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const bulkDeletePenaltyRules = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids array is required" });
    }
    
    const result = await PenaltyRuleModel.bulkDelete(ids);
    res.json({ 
      success: true, 
      message: `${result.affectedRows} rules deleted`, 
      affectedRows: result.affectedRows 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getPenaltyStats = async (req, res) => {
  try {
    const stats = await PenaltyRuleModel.getPenaltyStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getPenaltyRules,
  getPenaltyRuleById,
  calculatePenalty,
  createPenaltyRule,
  updatePenaltyRule,
  deletePenaltyRule,
  bulkDeletePenaltyRules,
  getPenaltyStats,
};