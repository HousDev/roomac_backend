// routes/documentTemplateRoutes.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const ctrl    = require("../controllers/documentTemplateController");

// ── multer setup ─────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../public/uploads/template-logos");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) =>
    cb(null, `logo-${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    /\.(jpe?g|png|gif|svg|webp)$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new Error("Images only"));
  },
});

// ── routes ───────────────────────────────────────────────────────────────────
// Specific routes BEFORE /:id
router.post("/bulk-delete",          ctrl.bulkDelete);
router.post("/bulk-status",          ctrl.bulkStatus);

router.get("/",                       ctrl.getAll);
router.post("/",   upload.single("logo"), ctrl.create);

router.get("/:id",                    ctrl.getById);
router.put("/:id", upload.single("logo"), ctrl.update);
router.delete("/:id",                 ctrl.remove);

router.post("/:id/restore/:version",  ctrl.restoreVersion);

// multer error handler
router.use((err, _req, res, _next) => {
  res.status(400).json({ success: false, message: err.message });
});

module.exports = router;