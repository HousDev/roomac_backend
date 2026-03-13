// routes/expenseRoutes.js
const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const ctrl     = require("../controllers/expenseController");

// Use memory storage so controller decides where to save
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only images and PDFs are allowed"));
  },
});

// GET  /api/expenses/stats
router.get("/stats", ctrl.getExpenseStats);

// GET  /api/expenses
router.get("/", ctrl.getExpenses);

// GET  /api/expenses/:id
router.get("/:id", ctrl.getExpenseById);

// POST /api/expenses   (multipart: receipt file optional)
router.post("/", upload.single("receipt"), ctrl.createExpense);

// PUT  /api/expenses/:id
router.put("/:id", upload.single("receipt"), ctrl.updateExpense);

// DELETE /api/expenses/:id
router.delete("/:id", ctrl.deleteExpense);

module.exports = router;