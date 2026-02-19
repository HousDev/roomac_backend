// controllers/adminProfileController.js
const db = require('../config/db'); 
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).single('avatar');

// Get current user's profile
exports.getProfile = async (req, res) => {
  try {
    console.log('🔍 GET /api/profile called');
    const userId = req.user.adminId || req.user.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // First, check if user exists
    const [userRows] = await db.query(
      'SELECT id, email FROM users WHERE id = ?', 
      [userId]
    );
    
    if (userRows.length === 0) {
      console.error('❌ User not found in database');
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    console.log('✅ User found:', userRows[0].email);
    
    // Get profile
    const [profileRows] = await db.query(
      'SELECT * FROM profiles WHERE user_id = ?', 
      [userId]
    );
    
    let profile = profileRows[0];
    console.log('📋 Profile found:', profile ? 'Yes' : 'No');
    
    // Get notification settings
    const [settingsRows] = await db.query(
      'SELECT * FROM notification_settings WHERE user_id = ?', 
      [userId]
    );
    
    let notificationSettings = settingsRows[0];
    console.log('📋 Notification settings found:', notificationSettings ? 'Yes' : 'No');
    
    // If profile doesn't exist, create default one
    if (!profile) {
      console.log('📝 Creating default profile for user:', userId);
      
      // Create profile
      const [insertResult] = await db.query(
        'INSERT INTO profiles (user_id, full_name) VALUES (?, ?)',
        [userId, 'Admin User']
      );
      
      // Get the created profile
      const [newProfileRows] = await db.query(
        'SELECT * FROM profiles WHERE id = ?', 
        [insertResult.insertId]
      );
      
      profile = newProfileRows[0];
      console.log('✅ Created default profile');
    }
    
    // If notification settings don't exist, create default
    if (!notificationSettings) {
      console.log('📝 Creating default notification settings for user:', userId);
      
      await db.query(
        'INSERT INTO notification_settings (user_id) VALUES (?)',
        [userId]
      );
      
      const [newSettingsRows] = await db.query(
        'SELECT * FROM notification_settings WHERE user_id = ?', 
        [userId]
      );
      
      notificationSettings = newSettingsRows[0];
      console.log('✅ Created default notification settings');
    }
    
    console.log('✅ Returning profile data');
    
    res.json({
      success: true,
      profile: profile || {},
      notification_settings: notificationSettings || {}
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('🔍 PUT /api/profile called');
    const userId = req.user.adminId || req.user.id;
    const { full_name, phone, address, bio } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    if (!full_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Full name is required' 
      });
    }
    
    // Check if profile exists
    const [existingRows] = await db.query(
      'SELECT id FROM profiles WHERE user_id = ?', 
      [userId]
    );
    
    if (existingRows.length > 0) {
      // Update existing profile
      await db.query(
        `UPDATE profiles 
         SET full_name = ?, phone = ?, address = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [full_name, phone || '', address || '', bio || '', userId]
      );
    } else {
      // Create new profile
      await db.query(
        'INSERT INTO profiles (user_id, full_name, phone, address, bio) VALUES (?, ?, ?, ?, ?)',
        [userId, full_name, phone || '', address || '', bio || '']
      );
    }
    
    // Get updated profile
    const [updatedRows] = await db.query(
      'SELECT * FROM profiles WHERE user_id = ?', 
      [userId]
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedRows[0]
    });
    
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile',
      error: error.message 
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    console.log('🔍 PUT /api/profile/password called');
    const userId = req.user.adminId || req.user.id;
    const { current_password, new_password } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Validate input
    if (!current_password || !new_password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }
    
    if (new_password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 8 characters' 
      });
    }
    
    // Get user with password
    const [userRows] = await db.query(
      'SELECT id, password FROM users WHERE id = ?', 
      [userId]
    );
    
    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    // Update password
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change password',
      error: error.message 
    });
  }
};

// Update notification settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    console.log('🔍 PUT /api/profile/notifications called');
    const userId = req.user.adminId || req.user.id;
    const settings = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Check if settings exist
    const [existingRows] = await db.query(
      'SELECT id FROM notification_settings WHERE user_id = ?', 
      [userId]
    );
    
    if (existingRows.length > 0) {
      // Update existing settings
      await db.query(
        `UPDATE notification_settings 
         SET email_notifications = ?,
             sms_notifications = ?,
             whatsapp_notifications = ?,
             payment_alerts = ?,
             booking_alerts = ?,
             maintenance_alerts = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [
          settings.email_notifications || false,
          settings.sms_notifications || false,
          settings.whatsapp_notifications || false,
          settings.payment_alerts || false,
          settings.booking_alerts || false,
          settings.maintenance_alerts || false,
          userId
        ]
      );
    } else {
      // Create new settings
      await db.query(
        `INSERT INTO notification_settings 
         (user_id, email_notifications, sms_notifications, whatsapp_notifications, payment_alerts, booking_alerts, maintenance_alerts)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          settings.email_notifications || false,
          settings.sms_notifications || false,
          settings.whatsapp_notifications || false,
          settings.payment_alerts || false,
          settings.booking_alerts || false,
          settings.maintenance_alerts || false
        ]
      );
    }
    
    // Get updated settings
    const [updatedRows] = await db.query(
      'SELECT * FROM notification_settings WHERE user_id = ?', 
      [userId]
    );
    
    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      notification_settings: updatedRows[0]
    });
    
  } catch (error) {
    console.error('❌ Update notification settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update notification settings',
      error: error.message 
    });
  }
};

// Upload avatar
exports.uploadAvatar = (req, res) => {
  console.log('🔍 POST /api/profile/avatar called');
  
  upload(req, res, async (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }
    
    try {
      const userId = req.user.adminId || req.user.id;
      
      if (!userId) {
        console.error('❌ No user ID found in request');
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }
      
      if (!req.file) {
        console.error('❌ No file uploaded');
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }
      
      console.log('📁 File uploaded:', req.file);
      
      // Construct avatar URL
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      
      // Check if profile exists
      const [existingRows] = await db.query(
        'SELECT id FROM profiles WHERE user_id = ?', 
        [userId]
      );
      
      if (existingRows.length > 0) {
        // Update existing profile
        await db.query(
          'UPDATE profiles SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [avatarUrl, userId]
        );
      } else {
        // Create new profile with avatar
        await db.query(
          'INSERT INTO profiles (user_id, full_name, avatar_url) VALUES (?, ?, ?)',
          [userId, 'Admin User', avatarUrl]
        );
      }
      
      // Get updated profile
      const [updatedRows] = await db.query(
        'SELECT * FROM profiles WHERE user_id = ?', 
        [userId]
      );
      
      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatar_url: avatarUrl,
        profile: updatedRows[0]
      });
      
    } catch (error) {
      console.error('❌ Upload avatar error:', error);
      
      // Delete uploaded file if there was an error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to upload avatar',
        error: error.message 
      });
    }
  });
};