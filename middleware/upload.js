const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const uploadPath = path.join(__dirname, "..", "uploads", "properties");
const tempPath = path.join(__dirname, "..", "uploads", "temp");

// Create folders if not exist
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

if (!fs.existsSync(tempPath)) {
  fs.mkdirSync(tempPath, { recursive: true });
}

/* =========================
   MULTER CONFIG (TEMP)
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `temp-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

/* =========================
   SAFE DELETE (WINDOWS FIX)
========================= */
const safeDelete = (filePath) => {
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.warn("⚠️ Temp delete failed:", err.message);
      }
    });
  }, 500); // delay avoids EBUSY on Windows
};

/* =========================
   IMAGE COMPRESSION
========================= */
const compressImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  try {
    const compressedFiles = [];

    for (const file of req.files) {
      const finalName =
        "property-" +
        Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        ".webp";

      const finalPath = path.join(uploadPath, finalName);
      const fileSizeMB = file.size / (1024 * 1024);

      if (fileSizeMB <= 1) {
        await sharp(file.path)
          .toFormat("webp", { quality: 85 })
          .toFile(finalPath);
      } else {
        await sharp(file.path)
          .resize(1600)
          .toFormat("webp", { quality: 70 })
          .toFile(finalPath);
      }

      // 🔥 SAFE DELETE (NO EBUSY)
      safeDelete(file.path);

      compressedFiles.push({
        filename: finalName,
        path: `/uploads/properties/${finalName}`,
      });
    }

    req.compressedImages = compressedFiles;
    next();
  } catch (err) {
    console.error("Compression error:", err);
    return res.status(500).json({ message: "Image processing failed" });
  }
};

module.exports = {
  upload,
  compressImages,
};
