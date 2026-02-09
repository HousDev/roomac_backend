// // middleware/uploadStaffDoc.js
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// // Ensure uploads directory exists
// const uploadDir = path.join(__dirname, '../uploads/staff-documents');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     const ext = path.extname(file.originalname);
//     const fieldname = file.fieldname;
    
//     // Map fieldnames to readable filenames
//     let prefix;
//     switch(fieldname) {
//       case 'aadhar_document':
//         prefix = 'aadhar';
//         break;
//       case 'pan_document':
//         prefix = 'pan';
//         break;
//       case 'photo':
//         prefix = 'photo';
//         break;
//       default:
//         prefix = 'document';
//     }
    
//     cb(null, `${prefix}-${uniqueSuffix}${ext}`);
//   }
// });

// const fileFilter = (req, file, cb) => {
//   // Allow images and PDFs
//   const allowedTypes = /jpeg|jpg|png|pdf/;
//   const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
//   const mimetype = allowedTypes.test(file.mimetype);

//   if (mimetype && extname) {
//     return cb(null, true);
//   } else {
//     cb(new Error('Only images and PDF files are allowed'));
//   }
// };

// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024 // 5MB limit
//   },
//   fileFilter: fileFilter
// });

// // Export multiple upload configurations
// module.exports = {
//   uploadFields: upload.fields([
//     { name: 'aadhar_document', maxCount: 1 },
//     { name: 'pan_document', maxCount: 1 },
//     { name: 'photo', maxCount: 1 }
//   ]),
//   singleUpload: upload.single('document')
// };


// middleware/uploadStaffDoc.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');           // for images
const PDFDocument = require('pdf-lib');   // for PDFs (pure npm)

const uploadDir = path.join(__dirname, '../uploads/staff-documents');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ================= STORAGE ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),

  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);

    let prefix = 'document';

    if (file.fieldname === 'aadhar_document') prefix = 'aadhar';
    if (file.fieldname === 'pan_document') prefix = 'pan';
    if (file.fieldname === 'photo') prefix = 'photo';

    cb(null, `${prefix}-${unique}${ext}`);
  }
});

/* ================= FILTER ================= */

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);

  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Only images and PDFs allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

/* ================= COMPRESSION LOGIC ================= */

async function compressFile(file) {

  const ext = path.extname(file.filename).toLowerCase();
  const fullPath = path.join(uploadDir, file.filename);

  // 🖼 IMAGE COMPRESSION
  if (['.jpg', '.jpeg', '.png'].includes(ext)) {

    const compressedPath = fullPath.replace(ext, `-compressed${ext}`);

    await sharp(fullPath)
      .resize({ width: 1200 }) // limit large images
      .jpeg({ quality: 70 })   // 70% quality = big savings
      .png({ quality: 70 })
      .toFile(compressedPath);

    fs.unlinkSync(fullPath); // delete original

    file.filename = path.basename(compressedPath);
  }

  // 📄 PDF COMPRESSION (basic optimize)
  if (ext === '.pdf') {

    const data = fs.readFileSync(fullPath);
    const pdfDoc = await PDFDocument.PDFDocument.load(data);

    const compressedBytes = await pdfDoc.save({
      useObjectStreams: false,
      compress: true
    });

    fs.writeFileSync(fullPath, compressedBytes);
  }
}

/* ================= MIDDLEWARE WRAPPER ================= */

const uploadFields = (req, res, next) => {

  upload.fields([
    { name: 'aadhar_document', maxCount: 1 },
    { name: 'pan_document', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
  ])(req, res, async (err) => {

    if (err) return next(err);

    try {
      if (req.files) {

        for (const field in req.files) {
          for (const file of req.files[field]) {
            await compressFile(file);
          }
        }

      }

      next();

    } catch (e) {
      console.error("Compression error:", e);
      next(e);
    }
  });
};

/* ================= EXPORT ================= */

module.exports = {
  uploadFields
};
