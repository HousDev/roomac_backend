// routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const ReportController = require("../controllers/reportController");

// Dashboard stats
router.get('/dashboard-stats', ReportController.getDashboardStats);

// Report generation endpoints
router.get('/revenue', ReportController.generateRevenueReport);
router.get('/payments', ReportController.generatePaymentsReport);
router.get('/tenants', ReportController.generateTenantsReport);
router.get('/occupancy', ReportController.generateOccupancyReport);

// Export endpoint
router.post('/export/:reportType', ReportController.exportReport);

// Filter options
router.get('/filters', ReportController.getReportFilters);

module.exports = router;