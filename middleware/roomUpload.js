// // middlewares/roomUpload.js
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// const uploadPath = path.join(__dirname, "..", "uploads", "rooms");
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
//         cb(null, "room-" + unique + ext);
//     },
// });

// const fileFilter = (req, file, cb) => {
//     const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
//     if (allowedMimes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error("Only image files (jpeg, jpg, png, webp) are allowed"), false);
//     }
// };

// const upload = multer({
//     storage: storage,
//     fileFilter: fileFilter,
//     limits: { 
//         fileSize: 5 * 1024 * 1024,
//         files: 10
//     }
// });

// module.exports = upload;


// // middlewares/roomUpload.js
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// // Base folders
// const baseUploadPath = path.join(__dirname, "..", "uploads", "rooms");
// const imagePath = baseUploadPath;
// const videoPath = path.join(baseUploadPath, "videos");

// // Create folders if not exist
// fs.mkdirSync(imagePath, { recursive: true });
// fs.mkdirSync(videoPath, { recursive: true });

// // Storage config
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     if (file.fieldname === "video") {
//       cb(null, videoPath);
//     } else if (file.fieldname === "photos") {
//       cb(null, imagePath);
//     } else {
//       cb(new Error("Invalid field name"), false);
//     }
//   },

//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname).toLowerCase();
//     const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);

//     if (file.fieldname === "video") {
//       cb(null, `room-video-${unique}${ext}`);
//     } else {
//       cb(null, `room-${unique}${ext}`);
//     }
//   }
// });

// // File filter
// const fileFilter = (req, file, cb) => {

//   // Video validation
//   if (file.fieldname === "video") {
//     const allowedVideos = [
//       "video/mp4",
//       "video/webm",
//       "video/ogg",
//       "video/quicktime"
//     ];

//     if (allowedVideos.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only mp4, webm, ogg, mov videos allowed"), false);
//     }
//   }

//   // Image validation
//   else if (file.fieldname === "photos") {
//     const allowedImages = [
//       "image/jpeg",
//       "image/jpg",
//       "image/png",
//       "image/webp",
//       "image/gif"
//     ];

//     if (allowedImages.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only jpeg, jpg, png, webp, gif images allowed"), false);
//     }
//   }

//   else {
//     cb(new Error("Invalid file field"), false);
//   }
// };

// // Multer instance
// const roomUpload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 50 * 1024 * 1024, // 50MB
//     files: 11 // 10 images + 1 video
//   }
// }).fields([
//   { name: "photos", maxCount: 10 },
//   { name: "video", maxCount: 1 }
// ]);

// module.exports = roomUpload;



// middlewares/roomUpload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Base folders
const baseUploadPath = path.join(__dirname, "..", "uploads", "rooms");
const imagePath = path.join(baseUploadPath, "images");
const videoPath = path.join(baseUploadPath, "videos");
const tempPath = path.join(baseUploadPath, "temp");

// Create folders if not exist
fs.mkdirSync(imagePath, { recursive: true });
fs.mkdirSync(videoPath, { recursive: true });
fs.mkdirSync(tempPath, { recursive: true });

// ----------------------
// Multer storage
// ----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempPath); // store everything in temp first
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${ext}`);
  },
});

// ----------------------
// File filter
// ----------------------
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "photos") {
    const allowedImages = ["image/jpeg","image/jpg","image/png","image/webp","image/gif"];
    if (allowedImages.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only jpeg, jpg, png, webp, gif images allowed"), false);
  } else if (file.fieldname === "video") {
    const allowedVideos = ["video/mp4","video/webm","video/ogg","video/quicktime"];
    if (allowedVideos.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only mp4, webm, ogg, mov videos allowed"), false);
  } else {
    cb(new Error("Invalid field name"), false);
  }
};

// ----------------------
// Multer instance
// ----------------------
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024, files: 11 }, // max 100MB total
}).fields([
  { name: "photos", maxCount: 10 },
  { name: "video", maxCount: 1 },
]);

// ----------------------
// Compression Middleware
// ----------------------
const compressRoomMedia = async (req, res, next) => {
  try {
    // ----------- IMAGES -----------
    const images = req.files.photos || [];
    const compressedImages = [];

    for (const file of images) {
      const finalName = `room-${Date.now()}-${Math.round(Math.random()*1e9)}.webp`;
      const finalPath = path.join(imagePath, finalName);

      const fileSizeMB = file.size / (1024 * 1024);

      if (fileSizeMB <= 1) {
        // small image, lightly optimize
        await sharp(file.path)
          .toFormat("webp", { quality: 85 })
          .toFile(finalPath);
      } else {
        // larger images, resize and compress
        await sharp(file.path)
          .resize(1600)
          .toFormat("webp", { quality: 70 })
          .toFile(finalPath);
      }

      fs.unlinkSync(file.path); // remove temp file

      compressedImages.push({
        filename: finalName,
        path: `/uploads/rooms/images/${finalName}`,
      });
    }

    req.compressedPhotos = compressedImages;
    console.log("compressedIMage ", compressedImages)

    // ----------- VIDEO -----------
    const videoFile = req.files.video?.[0];
    if (videoFile) {
      const fileSizeMB = videoFile.size / (1024 * 1024);
      let finalVideoName = `room-video-${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(videoFile.originalname)}`;
      const finalVideoPath = path.join(videoPath, finalVideoName);

      if (fileSizeMB <= 10) {
        // Small video, keep original
        fs.renameSync(videoFile.path, finalVideoPath);
      } else {
        // Large video, compress
        // await new Promise((resolve, reject) => {
        //   ffmpeg(videoFile.path)
        //     .outputOptions([
        //       "-vcodec libx264",
        //       "-crf 28", // adjust for quality vs size
        //       "-preset fast"
        //     ])
        //     .on("end", () => {
        //       fs.unlinkSync(videoFile.path); // remove temp
        //       resolve();
        //     })
        //     .on("error", (err) => {
        //       console.error("Video compression error:", err);
        //       reject(err);
        //     })
        //     .save(finalVideoPath);
        // });
        await new Promise((resolve, reject) => {
  ffmpeg(videoFile.path)
    .videoCodec("libx264")
    .size("1280x?")
    .outputOptions([
      "-crf 32",        // more compression
      "-preset ultrafast",
      "-movflags +faststart"
    ])
    .on("end", () => {
      fs.unlinkSync(videoFile.path);
      resolve();
    })
    .on("error", (err) => {
      reject(err);
    })
    .save(finalVideoPath);
});

      }

      req.compressedVideo = {
        filename: finalVideoName,
        path: `/uploads/rooms/videos/${finalVideoName}`
      };
      console.log("compressed video" , req.compressedVideo)
    }

    next();
  } catch (err) {
    console.error("Room media compression error:", err);
    res.status(500).json({ message: "Media processing failed" });
  }
};

module.exports = {
  upload,
  compressRoomMedia
};
