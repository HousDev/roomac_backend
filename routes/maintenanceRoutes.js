// routes/maintenance.js
const express = require('express');
const router = express.Router();
const MaintenanceController = require('../controllers/maintenanceController');
const adminAuth = require('../middleware/adminAuth');

// Get all maintenance requests
router.get('/', adminAuth, MaintenanceController.getMaintenanceRequests);

// Get maintenance statistics
router.get('/stats', adminAuth, MaintenanceController.getMaintenanceStats);

// Get available maintenance staff
router.get('/staff/available', adminAuth, MaintenanceController.getAvailableMaintenanceStaff);

// Get maintenance request by ID
router.get('/:id', adminAuth, MaintenanceController.getMaintenanceById);

// Update maintenance status
router.put('/:id/status', adminAuth, MaintenanceController.updateMaintenanceStatus);

// Assign maintenance to staff
router.put('/:id/assign', adminAuth, MaintenanceController.assignMaintenance);

// Add maintenance note
router.post('/:id/notes', adminAuth, MaintenanceController.addMaintenanceNote);

// Update estimated cost
router.put('/:id/cost', adminAuth, MaintenanceController.updateEstimatedCost);

// Mark as completed
router.put('/:id/complete', adminAuth, MaintenanceController.markAsCompleted);

module.exports = router;