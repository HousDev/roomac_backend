// routes/tenantSettingsRoutes.js
const express = require('express');
const router = express.Router();
const TenantSettingsController = require('../controllers/tenantSettingsController');
const tenantAuth = require('../middleware/tenantAuth');

// Protected routes (require tenant authentication)
router.get('/notifications', tenantAuth, TenantSettingsController.getNotificationPreferences);
router.post('/notifications', tenantAuth, TenantSettingsController.updateNotificationPreferences);
router.post('/change-password', tenantAuth, TenantSettingsController.changePassword);
router.post('/request-deletion', tenantAuth, TenantSettingsController.requestAccountDeletion);
router.post('/cancel-deletion', tenantAuth, TenantSettingsController.cancelDeletionRequest);
router.get('/deletion-status', tenantAuth, TenantSettingsController.getDeletionStatus);
router.post('/logout', tenantAuth, TenantSettingsController.logout);
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Tenant settings API is working' });
});

module.exports = router;