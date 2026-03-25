

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const settingsController = require("../controllers/settingsController");
const adminAuth = require("../middleware/adminAuth");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/logos");
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => {
        cb(null, uploadDir);
      })
      .catch((err) => {
        cb(err);
      });
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// GET settings
router.get("/", settingsController.getSettings);

// Update settings
router.put("/", adminAuth, settingsController.updateSettings);

// Update single setting
router.put("/:key", adminAuth, settingsController.updateSetting);

// Upload logo
router.post(
  "/upload",
  adminAuth,
  upload.single("file"),
  settingsController.uploadFile,
);

// Initialize settings
router.post("/initialize", adminAuth, settingsController.initializeSettings);

// ⭐ SMTP Test Route
router.post("/test-email", adminAuth, settingsController.testEmail);

module.exports = router;