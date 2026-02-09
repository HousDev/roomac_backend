// routes/tenantAuthRoutes.js
const express = require('express');
const router = express.Router();
const TenantAuthController = require('../controllers/tenantAuthController');
const tenantAuth = require('../middleware/tenantAuth');

// Public routes
router.post('/login', TenantAuthController.login);
router.post('/send-otp', TenantAuthController.sendOTP);
router.post('/verify-otp', TenantAuthController.verifyOTP);
router.post('/reset-password-request', TenantAuthController.requestPasswordReset);
router.post('/reset-password', TenantAuthController.resetPassword);
router.get('/test', TenantAuthController.test);

// Protected routes (require tenant authentication)
router.get('/profile', tenantAuth, TenantAuthController.getProfile);
router.post('/change-password', tenantAuth, TenantAuthController.changePassword);
router.post('/logout', tenantAuth, TenantAuthController.logout);
router.get('/check', tenantAuth, TenantAuthController.checkAuth);

// Admin routes (add admin auth middleware if needed)
router.get('/admin/all-credentials', TenantAuthController.getAllTenantsCredentials);

module.exports = router;