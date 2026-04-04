const MaterialPurchaseModel = require("../models/materialPurchaseModel");

const getPurchases = async (req, res) => {
  try {
    const filters = {
      property_id: req.query.property_id,
      payment_status: req.query.payment_status,
      search: req.query.search,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
    };
    const purchases = await MaterialPurchaseModel.getAllPurchases(filters);
    res.json({ success: true, count: purchases.length, data: purchases });
  } catch (err) {
    console.error("Error in getPurchases:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const getPurchaseById = async (req, res) => {
  try {
    const purchase = await MaterialPurchaseModel.getPurchaseById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: "Purchase not found" });
    res.json({ success: true, data: purchase });
  } catch (err) {
    console.error("Error in getPurchaseById:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const createPurchase = async (req, res) => {
  try {
    const { purchase_date, vendor_name, invoice_number, property_id, items } = req.body;
    
    if (!purchase_date || !vendor_name || !invoice_number || !property_id || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "purchase_date, vendor_name, invoice_number, property_id, and items are required" 
      });
    }

    const purchase = await MaterialPurchaseModel.createPurchase(req.body);
    res.status(201).json({ success: true, message: "Purchase created successfully", data: purchase });
  } catch (err) {
    console.error("Error in createPurchase:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const updatePurchase = async (req, res) => {
  try {
    console.log(req.body)
    const existing = await MaterialPurchaseModel.getPurchaseById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Purchase not found" });

    const result = await MaterialPurchaseModel.updatePurchase(req.params.id, req.body);
    res.json({ success: true, message: "Purchase updated successfully", affectedRows: result.affectedRows });
  } catch (err) {
    console.error("Error in updatePurchase:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const addPayment = async (req, res) => {
  try {
    const { amount, payment_method } = req.body;
    
    // Validate required fields
    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ success: false, message: "amount is required" });
    }
    
    if (!payment_method) {
      return res.status(400).json({ success: false, message: "payment_method is required" });
    }

    // Parse amount to ensure it's a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    const existing = await MaterialPurchaseModel.getPurchaseById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Purchase not found" });

    const result = await MaterialPurchaseModel.addPayment(req.params.id, {
      ...req.body,
      amount: parsedAmount
    });
    
    res.json({ success: true, message: "Payment added successfully", data: result });
  } catch (err) {
    console.error("Error in addPayment:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const deletePurchase = async (req, res) => {
  try {
    const existing = await MaterialPurchaseModel.getPurchaseById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Purchase not found" });

    const result = await MaterialPurchaseModel.deletePurchase(req.params.id);
    res.json({ success: true, message: "Purchase deleted successfully", affectedRows: result.affectedRows });
  } catch (err) {
    console.error("Error in deletePurchase:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const bulkDeletePurchases = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids array is required" });
    }

    const result = await MaterialPurchaseModel.bulkDelete(ids);
    res.json({ success: true, message: `${result.affectedRows} purchases deleted`, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("Error in bulkDeletePurchases:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const getPurchaseStats = async (req, res) => {
  try {
    const stats = await MaterialPurchaseModel.getPurchaseStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("Error in getPurchaseStats:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  addPayment,
  deletePurchase,
  bulkDeletePurchases,
  getPurchaseStats
};