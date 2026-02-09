// routes/adminDeletionRequestsRoutes.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const AdminDeletionRequestsController = require('../controllers/adminDeletionRequestsController');

// Get pending deletion requests
router.get('/pending', adminAuth, AdminDeletionRequestsController.getPendingDeletionRequests);

// Get all deletion requests with filters
router.get('/all', adminAuth, AdminDeletionRequestsController.getAllDeletionRequests);

// Approve deletion request
router.post('/approve', adminAuth, AdminDeletionRequestsController.approveDeletionRequest);

// Reject deletion request
router.post('/reject', adminAuth, AdminDeletionRequestsController.rejectDeletionRequest);

// Get deletion statistics
router.get('/stats', adminAuth, AdminDeletionRequestsController.getDeletionStats);

// Test route
router.get('/test', adminAuth, (req, res) => {
  res.json({ success: true, message: 'Deletion requests API is working' });
});

module.exports = router;