// routes/monthlyRentRoutes.js
const express = require('express');
const router = express.Router();
const monthlyRentController = require('../controllers/monthlyRentController');

// Manual trigger endpoints
router.post('/cron/trigger', monthlyRentController.triggerMonthlyCreation);
router.post('/cron/sync', monthlyRentController.syncMonthlyRent);
router.post('/cron/backfill-all', monthlyRentController.backfillAllTenants);
router.post('/cron/backfill/:tenantId', monthlyRentController.backfillTenant);

// Get tenant monthly history
router.get('/tenant/:tenantId', monthlyRentController.getTenantMonthlyHistory);

module.exports = router;