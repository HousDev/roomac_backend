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

// POST /api/expenses
const createExpense = async (req, res) => {
  try {
    const { property_id, category_id, description, payment_mode, expense_date } = req.body;
    if (!property_id || !category_id || !description || !payment_mode || !expense_date) {
      return res.status(400).json({
        success: false,
        message: "property_id, category_id, description, payment_mode and expense_date are required",
      });
    }

    let receipt = { url: null, name: null };
    if (req.file) receipt = saveReceipt(req.file);

    let items = [];
    if (req.body.items) {
      try {
        items = JSON.parse(req.body.items);
      } catch { /* ignore */ }
    }

    const expenseData = {
      property_id: req.body.property_id,
      property_name: req.body.property_name,
      category_id: req.body.category_id,
      category_name: req.body.category_name,
      description: req.body.description,
      amount: req.body.amount,
      payment_mode: req.body.payment_mode || "Cash",
      receipt_url: receipt.url,
      receipt_name: receipt.name,
      expense_date: req.body.expense_date,
      status: req.body.status || "Pending",
      added_by_name: req.body.added_by_name,
      notes: req.body.notes,
      items: items,
    };

    const result = await ExpenseModel.create(expenseData);
    res.status(201).json({ success: true, message: "Expense created", data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/expenses/:id
const updateExpense = async (req, res) => {
  try {
    const existing = await ExpenseModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Expense not found" });

    let receipt = { url: existing.receipt_url, name: existing.receipt_name };
    if (req.file) receipt = saveReceipt(req.file);

    let items = existing.items || [];
    if (req.body.items) {
      try {
        items = JSON.parse(req.body.items);
      } catch { /* ignore */ }
    }

    const expenseData = {
      property_id: req.body.property_id,
      property_name: req.body.property_name,
      category_id: req.body.category_id,
      category_name: req.body.category_name,
      description: req.body.description,
      amount: req.body.amount,
      payment_mode: req.body.payment_mode || "Cash",
      receipt_url: receipt.url,
      receipt_name: receipt.name,
      expense_date: req.body.expense_date,
      status: req.body.status,
      added_by_name: req.body.added_by_name,
      notes: req.body.notes,
      items: items,
    };

    await ExpenseModel.update(req.params.id, expenseData);
    res.json({ success: true, message: "Expense updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
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

module.exports = {
  getExpenses,
  getExpenseStats,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};