


// middleware/uploadDocument.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");


// ================================
// CREATE UPLOAD DIRECTORIES
// ================================

const createUploadDirs = () => {
  const dirs = [
    "uploads/id_proofs",
    "uploads/address_proofs",
    "uploads/photos",
    "uploads/additional_docs",
    "uploads/temp",
     // Partner document directories   
      "uploads/partner_id_proofs",
    "uploads/partner_address_proofs",
    "uploads/partner_photos"
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();


// ================================
// MULTER STORAGE
// ================================

const storage = multer.diskStorage({

  destination(req, file, cb) {

    let uploadPath = "uploads/temp/";

    if (file.fieldname === "id_proof_url" || file.fieldname === "id_proof_file") {
      uploadPath = "uploads/id_proofs/";
    } 
    else if (file.fieldname === "address_proof_url" || file.fieldname === "address_proof_file") {
      uploadPath = "uploads/address_proofs/";
    } 
    else if (file.fieldname === "photo_url" || file.fieldname === "photo_file") {
      uploadPath = "uploads/photos/";
    } 
     // Partner documents
    else if (file.fieldname === "partner_id_proof_url") {
      uploadPath = "uploads/partner_id_proofs/";
    }
    else if (file.fieldname === "partner_address_proof_url") {
      uploadPath = "uploads/partner_address_proofs/";
    }
    else if (file.fieldname === "partner_photo_url") {
      uploadPath = "uploads/partner_photos/";
    }
    else if (
      file.fieldname.includes("additional") ||
      file.fieldname.startsWith("additional_documents")
    ) {
      uploadPath = "uploads/additional_docs/";
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename(req, file, cb) {

    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();

    cb(null, unique + ext);
  }
});


// ================================
// FILE FILTER
// ================================

const fileFilter = (req, file, cb) => {

  const allowed = /jpeg|jpg|png|pdf|webp|bmp/;

  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error("Only images and PDFs are allowed"));
  }
};


// ================================
// MULTER INSTANCE
// ================================

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 20
  },
  fileFilter
});


// ================================
// HELPER: GET DESTINATION FOLDER
// ================================

const getDestinationFolder = (fieldname) => {
  const folderMap = {
    'id_proof_url': 'id_proofs',
    'id_proof_file': 'id_proofs',
    'address_proof_url': 'address_proofs',
    'address_proof_file': 'address_proofs',
    'photo_url': 'photos',
    'photo_file': 'photos',
    'partner_id_proof_url': 'partner_id_proofs',
    'partner_address_proof_url': 'partner_address_proofs',
    'partner_photo_url': 'partner_photos'
  };
  
  if (fieldname.includes('additional') || fieldname.startsWith('additional_documents')) {
    return 'additional_docs';
  }
  
  return folderMap[fieldname] || 'temp';
};

// ================================
// MAIN UPLOAD + COMPRESSION
// ================================

const tenantDocumentUploadFlexible = (req, res, next) => {

  upload.any()(req, res, async (err) => {

    if (err) return handleUploadError(err, req, res, next);

    if (!req.files || req.files.length === 0) {
      req.files = {};
      return next();
    }


    // ================================
    // COMPRESS FILES HERE
    // ================================

    for (const file of req.files) {

      try {

        const sizeMB = file.size / (1024 * 1024);

        // ---------- PDF COMPRESSION ----------
        if (file.mimetype === "application/pdf" && sizeMB > 1) {

          const originalBytes = fs.readFileSync(file.path);

          const pdfDoc = await PDFDocument.load(originalBytes, {
            ignoreEncryption: true
          });

          const compressedBytes = await pdfDoc.save({
            useObjectStreams: true,
            compress: true
          });

          const newPath = file.path.replace(/\.pdf$/i, "-compressed.pdf");

          fs.writeFileSync(newPath, compressedBytes);
          fs.unlinkSync(file.path);

          file.path = newPath;
          file.filename = path.basename(newPath);
        }

        // ---------- IMAGE COMPRESSION ----------
        if (file.mimetype.startsWith("image/") && sizeMB > 0.5) {

          const ext = path.extname(file.path).toLowerCase();
          const newPath = file.path.replace(ext, "-compressed" + ext);

          await sharp(file.path)
            .resize({ width: 1600, withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .png({ quality: 75 })
            .webp({ quality: 75 })
            .toFile(newPath);

          fs.unlinkSync(file.path);

          file.path = newPath;
          file.filename = path.basename(newPath);
        }

      } catch (compressionErr) {
        console.error("Compression failed:", compressionErr.message);
        // keep original file if compression fails
      }
    }

    // ================================
    // GROUP FILES BY FIELD
    // ================================

    const groupedFiles = {};

    req.files.forEach(file => {
      if (!groupedFiles[file.fieldname]) {
        groupedFiles[file.fieldname] = [];
      }
      groupedFiles[file.fieldname].push(file);
    });

    req.files = groupedFiles;

    next();
  });
};


// ================================
// ERROR HANDLER
// ================================

const handleUploadError = (err, req, res, next) => {

  if (err instanceof multer.MulterError) {

    let message = err.message;

    if (err.code === "LIMIT_FILE_SIZE") message = "File too large (max 10MB)";
    if (err.code === "LIMIT_FILE_COUNT") message = "Too many files uploaded";

    return res.status(400).json({
      success: false,
      message
    });
  }

  return res.status(400).json({
    success: false,
    message: err.message
  });
};


module.exports = {
  tenantDocumentUploadFlexible,
  handleUploadError
};
