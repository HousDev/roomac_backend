const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const settingsController = require('../controllers/settingsController');
const adminAuth = require('../middleware/adminAuth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/logos');
    // Create directory if it doesn't exist
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch(err => {
      cb(err);
    });
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Apply admin authentication to all settings routes


// GET /api/settings - Get all settings
router.get('/', settingsController.getSettings);

// PUT /api/settings - Update multiple settings
router.put("/", adminAuth, settingsController.updateSettings);

// PUT /api/settings/:key - Update single setting
router.put("/:key", adminAuth, settingsController.updateSetting);

// POST /api/settings/upload - Upload file
router.post(
  "/upload",
  adminAuth,
  upload.single("file"),
  settingsController.uploadFile,
);

// POST /api/settings/initialize - Initialize default settings (for first-time setup)
router.post("/initialize", adminAuth, settingsController.initializeSettings);

module.exports = router;