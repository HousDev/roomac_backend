// // middleware/upload.js 
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// const uploadPath = path.join(__dirname, "..", "uploads", "properties");

// // Create uploads directory if it doesn't exist
// if (!fs.existsSync(uploadPath)) {
//     fs.mkdirSync(uploadPath, { recursive: true });
// }

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, uploadPath);
//     },
//     filename: function (req, file, cb) {
//         const ext = path.extname(file.originalname).toLowerCase();
//         const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
//         cb(null, "property-" + unique + ext);
//     },
// });

// const fileFilter = (req, file, cb) => {
//     const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    
//     if (allowedMimes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error("Only image files (jpeg, jpg, png, webp, gif) are allowed"), false);
//     }
// };

// const upload = multer({
//     storage: storage,
//     fileFilter: fileFilter,
//     limits: { 
//         fileSize: 5 * 1024 * 1024, // 5MB
//         files: 10 // Maximum 10 files
//     }
// });

// module.exports = upload;


// middleware/upload.js
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

// Store first in temp folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "temp-" + unique + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // allow bigger before compression
    files: 10,
  },
});

// 👉 Compression Middleware
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

      // ✅ If file is already small (<1MB), just optimize lightly
      if (fileSizeMB <= 1) {
        await sharp(file.path)
          .toFormat("webp", { quality: 85 })
          .toFile(finalPath);
      } 
      // 🔥 Compress big images
      else {
        await sharp(file.path)
          .resize(1600)
          .toFormat("webp", { quality: 70 })
          .toFile(finalPath);
      }

      fs.unlinkSync(file.path);

      compressedFiles.push({
        filename: finalName,
        path: `/uploads/properties/${finalName}`,
      });
    }

    req.compressedImages = compressedFiles;
    next();

  } catch (err) {
    console.error("Compression error:", err);
    res.status(500).json({ message: "Image processing failed" });
  }
};


module.exports = {
  upload,
  compressImages,
};



