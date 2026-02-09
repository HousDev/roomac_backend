// routes/vacateRoutes.js
const express = require('express');
const router = express.Router();
const VacateController = require('../controllers/vacateController')

// Get initial vacate data for a bed
router.get('/init/:bedAssignmentId', VacateController.getInitialVacateData);

// Calculate penalties based on selected reason and dates
router.post('/calculate', VacateController.calculatePenalties);

// Submit vacate request
router.post('/submit', VacateController.submitVacateRequest);

// Get vacate history for a bed/tenant
router.get('/history/:bedAssignmentId', VacateController.getVacateHistory);

module.exports = router;