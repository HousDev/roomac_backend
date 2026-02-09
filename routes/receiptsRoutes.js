// routes/receipts.js
const express = require('express');
const router = express.Router();
const ReceiptController = require('../controllers/receiptController');
const adminAuth = require('../middleware/adminAuth');

// Get all receipt requests
router.get('/', adminAuth, ReceiptController.getReceiptRequests);

// Get receipt statistics
router.get('/stats', adminAuth, ReceiptController.getReceiptStats);

// Get receipt by ID
router.get('/:id', adminAuth, ReceiptController.getReceiptById);

// Generate receipt
router.post('/:id/generate', adminAuth, ReceiptController.generateReceipt);

// Mark receipt as issued
router.put('/:id/issue', adminAuth, ReceiptController.markReceiptIssued);

// Download receipt
router.get('/:id/download', adminAuth, ReceiptController.downloadReceipt);

// Delete receipt
router.delete('/:id', adminAuth, ReceiptController.deleteReceipt);

module.exports = router;