// controllers/expenseController.js
const ExpenseModel = require("../models/expenseModel");
const path = require("path");
const fs = require("fs");

/* ── save uploaded receipt to disk ────────────────────────────────────────── */
const saveReceipt = (file) => {
  if (!file) return { url: null, name: null };
  const uploadDir = path.join(__dirname, "../uploads/receipts");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const ext = path.extname(file.originalname);
  const filename = `receipt_${Date.now()}${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
  return { url: `/uploads/receipts/${filename}`, name: file.originalname };
};

// GET /api/expenses
const getExpenses = async (req, res) => {
  try {
    const filters = {
      property_id: req.query.property_id,
      category_id: req.query.category_id,
      payment_mode: req.query.payment_mode,
      status: req.query.status,
      search: req.query.search,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
    };
    const data = await ExpenseModel.getAll(filters);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/expenses/stats
const getExpenseStats = async (req, res) => {
  try {
    const data = await ExpenseModel.getStats({
      property_id: req.query.property_id,
      payment_mode: req.query.payment_mode,
      month: req.query.month,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/expenses/:id
const getExpenseById = async (req, res) => {
  try {
    const item = await ExpenseModel.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Expense not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update createExpense function
const createExpense = async (req, res) => {
  try {
    // Parse items if it's a string in the request body
    let items = req.body.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.error("Error parsing items in controller:", e);
        items = [];
      }
    }
    
    const expenseData = {
      property_id: req.body.property_id,
      property_name: req.body.property_name,
      category_id: req.body.category_id,
      category_name: req.body.category_name,
      total_amount: req.body.total_amount || req.body.amount, // Handle both field names
      vendor_name: req.body.vendor_name,
      expense_date: req.body.expense_date,
      status: req.body.status || 'Pending',
      added_by_name: req.body.added_by_name,
      notes: req.body.notes,
      items: items,
      payment_mode: req.body.payment_mode,
    };
    
    // Handle receipt file
    if (req.file) {
      const { url, name } = saveReceipt(req.file);
      expenseData.receipt_url = url;
      expenseData.receipt_name = name;
    }
    
    const result = await ExpenseModel.create(expenseData);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update updateExpense function
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (req.file) {
      updateData.receipt_url = `/uploads/${req.file.filename}`;
      updateData.receipt_name = req.file.originalname;
    }
    
    const result = await ExpenseModel.update(id, updateData);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const existing = await ExpenseModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Expense not found" });

    if (existing.receipt_url) {
      const filePath = path.join(__dirname, "..", existing.receipt_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await ExpenseModel.delete(req.params.id);
    res.json({ success: true, message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/expenses/:id/payment
const addExpensePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      paid_amount, 
      payment_mode, 
      transaction_date, 
      reference_no,
      notes,
      created_by 
    } = req.body;
    
    console.log("Processing payment:", { id, paid_amount, payment_mode, transaction_date, reference_no });
    
    const result = await ExpenseModel.createPaymentTransaction({
      expense_id: id,
      paid_amount: paid_amount,
      payment_mode: payment_mode,
      transaction_date: transaction_date,
      reference_no: reference_no,
      notes: notes,
      created_by: created_by || req.user?.name || 'System',
    });
    
    console.log("Payment result:", result);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Add payment error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/expenses/:id/payments
const getExpensePayments = async (req, res) => {
  try {
    const { id } = req.params;
    const payments = await ExpenseModel.getPaymentTransactions(id);
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/expense-payments
const getAllPayments = async (req, res) => {
  try {
    const filters = {
      expense_id: req.query.expense_id,
      status: req.query.status,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
    };
    const payments = await ExpenseModel.getAllPaymentTransactions(filters);
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};



module.exports = {
  getExpenses,
  getExpenseStats,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  addExpensePayment,      // New
  getExpensePayments,     // New
  getAllPayments,  
};