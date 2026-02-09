// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/adminProfileController');
const adminAuth = require('../middleware/adminAuth');

// Apply auth middleware to all routes
router.use(adminAuth);

// GET /api/profile - Get current user's profile
router.get('/', profileController.getProfile);

// PUT /api/profile - Update profile
router.put('/', profileController.updateProfile);

// PUT /api/profile/password - Change password
router.put('/password', profileController.changePassword);

// PUT /api/profile/notifications - Update notification settings
router.put('/notifications', profileController.updateNotificationSettings);

// POST /api/profile/avatar - Upload avatar
router.post('/avatar', profileController.uploadAvatar);

// REMOVE THIS LINE: router.get('/debug', profileController.debugProfile);

module.exports = router;