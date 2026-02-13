// // controllers/roomController.js
// const RoomModel = require('../models/roomModel');
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// // Create upload directories
// const uploadPath = path.join(__dirname, "..", "uploads", "rooms");
// const videoUploadPath = path.join(uploadPath, "videos");

// // Create directories if they don't exist
// if (!fs.existsSync(uploadPath)) {
//     fs.mkdirSync(uploadPath, { recursive: true });
// }
// if (!fs.existsSync(videoUploadPath)) {
//     fs.mkdirSync(videoUploadPath, { recursive: true });
// }

// // Configure storage for images and videos
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         if (file.fieldname === 'video') {
//             cb(null, videoUploadPath);
//         } else if (file.fieldname === 'photos') {
//             cb(null, uploadPath);
//         } else {
//             cb(new Error('Invalid fieldname'), false);
//         }
//     },
//     filename: function (req, file, cb) {
//         const ext = path.extname(file.originalname).toLowerCase();
//         const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        
//         if (file.fieldname === 'video') {
//             cb(null, "room-video-" + unique + ext);
//         } else {
//             cb(null, "room-" + unique + ext);
//         }
//     },
// });

// const fileFilter = (req, file, cb) => {
//     if (file.fieldname === 'video') {
//         // Accept video files
//         const allowedMimes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
//         if (allowedMimes.includes(file.mimetype)) {
//             cb(null, true);
//         } else {
//             cb(new Error("Only video files (mp4, webm, ogg, mov) are allowed"), false);
//         }
//     } else if (file.fieldname === 'photos') {
//         // Accept image files
//         const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
//         if (allowedMimes.includes(file.mimetype)) {
//             cb(null, true);
//         } else {
//             cb(new Error("Only image files (jpeg, jpg, png, webp, gif) are allowed"), false);
//         }
//     } else {
//         cb(new Error('Invalid fieldname'), false);
//     }
// };

// const upload = multer({
//     storage: storage,
//     fileFilter: fileFilter,
//     limits: { 
//         fileSize: 50 * 1024 * 1024, // 50MB max for videos
//         files: 11 // 10 images + 1 video
//     }
// }).fields([
//     { name: 'photos', maxCount: 10 },
//     { name: 'video', maxCount: 1 }
// ]);

// // Helper function to delete files
// const deleteFiles = (filePaths, isVideo = false) => {
//     if (!filePaths || !Array.isArray(filePaths)) return;
//     const basePath = isVideo ? videoUploadPath : uploadPath;
    
//     filePaths.forEach(filename => {
//         if (filename) {
//             const filePath = path.join(basePath, filename);
//             if (fs.existsSync(filePath)) {
//                 fs.unlink(filePath, (err) => {
//                     if (err) console.error(`Error deleting file ${filename}:`, err);
//                 });
//             }
//         }
//     });
// };

// // Helper to parse photo labels
// const parsePhotoLabels = (req) => {
//     const labels = {};
//     if (req.body.photo_labels) {
//         try {
//             const parsed = JSON.parse(req.body.photo_labels);
//             if (typeof parsed === 'object') {
//                 return parsed;
//             }
//         } catch (e) {
//             // If not JSON, check for individual photo label fields
//             Object.keys(req.body).forEach(key => {
//                 if (key.startsWith('photo_label_')) {
//                     const photoIndex = key.replace('photo_label_', '');
//                     labels[photoIndex] = req.body[key];
//                 }
//             });
//         }
//     }
//     return labels;
// };

// const RoomController = {
//     // Get all rooms - GET /api/rooms
//     async getAllRooms(req, res) {
//         try {
//             const rooms = await RoomModel.findAll();
//             res.status(200).json({
//                 success: true,
//                 data: rooms
//             });
//         } catch (error) {
//             console.error("getAllRooms error:", error);
//             res.status(500).json({
//                 success: false,
//                 message: "Failed to fetch rooms"
//             });
//         }
//     },

//     // Get room by id - GET /api/rooms/:id
//     async getRoomById(req, res) {
//         try {
//             const { id } = req.params;
//             const room = await RoomModel.findById(id);
//             if (!room) {
//                 return res.status(404).json({
//                     success: false,
//                     message: "Room not found"
//                 });
//             }
//             res.status(200).json({
//                 success: true,
//                 data: room
//             });
//         } catch (error) {
//             console.error("getRoomById error:", error);
//             res.status(500).json({
//                 success: false,
//                 message: "Failed to fetch room"
//             });
//         }
//     },

//     // Create room - POST /api/rooms
//     async createRoom(req, res) {
//         upload(req, res, async function(err) {
//             if (err) {
//                 console.error("Upload error:", err);
//                 return res.status(400).json({
//                     success: false,
//                     message: err.message || "File upload failed"
//                 });
//             }

//             try {
//                 const {
//                     property_id,
//                     room_number,
//                     sharing_type,
//                     room_type = 'pg',
//                     total_beds,
//                     occupied_beds = 0,
//                     floor = 1,
//                     rent_per_bed,
//                     has_attached_bathroom = false,
//                     has_balcony = false,
//                     has_ac = false,
//                     amenities = "[]",
//                     room_gender_preference = 'any',
//                     allow_couples = false,
//                     video_label = '',
//                     is_active = true
//                 } = req.body;

//                 // Validate required fields
//                 if (!property_id || !room_number || !sharing_type || !total_beds || !rent_per_bed) {
//                     // Clean up any uploaded files
//                     if (req.files && req.files.photos) {
//                         deleteFiles(req.files.photos.map(file => file.filename), false);
//                     }
//                     if (req.files && req.files.video) {
//                         deleteFiles(req.files.video.map(file => file.filename), true);
//                     }
//                     return res.status(400).json({
//                         success: false,
//                         message: "Required fields are missing"
//                     });
//                 }

//                 // Parse amenities
//                 let amenitiesArray = [];
//                 try {
//                     amenitiesArray = JSON.parse(amenities);
//                 } catch (e) {
//                     amenitiesArray = [];
//                 }

//                 // Get uploaded file names with labels
//                 const photo_labels = parsePhotoLabels(req);
//                 const photo_urls = [];
                
//                 if (req.files && req.files.photos) {
//                     req.files.photos.forEach((file, index) => {
//                         const label = photo_labels[index] || photo_labels[file.originalname] || 'Room View';
//                         photo_urls.push({
//                             url: file.filename,
//                             label: label
//                         });
//                     });
//                 }

//                 // Handle video file
//                 let video_url = null;
//                 if (req.files && req.files.video && req.files.video[0]) {
//                     video_url = req.files.video[0].filename;
//                 }

//                 const roomId = await RoomModel.create({
//                     property_id: parseInt(property_id),
//                     room_number,
//                     sharing_type,
//                     room_type,
//                     total_beds: parseInt(total_beds),
//                     occupied_beds: parseInt(occupied_beds),
//                     floor: parseInt(floor),
//                     rent_per_bed: parseFloat(rent_per_bed),
//                     has_attached_bathroom: has_attached_bathroom === 'true' || has_attached_bathroom === true,
//                     has_balcony: has_balcony === 'true' || has_balcony === true,
//                     has_ac: has_ac === 'true' || has_ac === true,
//                     amenities: amenitiesArray,
//                     photo_urls,
//                     video_url,
//                     video_label,
//                     room_gender_preference,
//                     allow_couples: allow_couples === 'true' || allow_couples === true,
//                     is_active: is_active === 'true' || is_active === true
//                 });

//                 res.status(201).json({
//                     success: true,
//                     message: "Room created successfully",
//                     id: roomId,
//                     photo_urls,
//                     video_url
//                 });
//             } catch (error) {
//                 console.error("createRoom error:", error);
                
//                 // Clean up uploaded files if error occurred
//                 if (req.files) {
//                     if (req.files.photos) {
//                         deleteFiles(req.files.photos.map(file => file.filename), false);
//                     }
//                     if (req.files.video) {
//                         deleteFiles(req.files.video.map(file => file.filename), true);
//                     }
//                 }
                
//                 res.status(500).json({
//                     success: false,
//                     message: "Failed to create room"
//                 });
//             }
//         });
//     },

//     // Update room - PUT /api/rooms/:id
//     async updateRoom(req, res) {
//         upload(req, res, async function(err) {
//             if (err) {
//                 console.error("Upload error:", err);
//                 return res.status(400).json({
//                     success: false,
//                     message: err.message || "File upload failed"
//                 });
//             }

//             try {
//                 const { id } = req.params;
//                 const existingRoom = await RoomModel.findById(id);
                
//                 if (!existingRoom) {
//                     if (req.files) {
//                         if (req.files.photos) {
//                             deleteFiles(req.files.photos.map(file => file.filename), false);
//                         }
//                         if (req.files.video) {
//                             deleteFiles(req.files.video.map(file => file.filename), true);
//                         }
//                     }
//                     return res.status(404).json({
//                         success: false,
//                         message: "Room not found"
//                     });
//                 }

//                 const {
//                     property_id,
//                     room_number,
//                     sharing_type,
//                     room_type,
//                     total_beds,
//                     occupied_beds,
//                     floor,
//                     rent_per_bed,
//                     has_attached_bathroom,
//                     has_balcony,
//                     has_ac,
//                     amenities,
//                     existing_photos = "[]",
//                     remove_photos = "[]",
//                     remove_video = "false",
//                     room_gender_preference,
//                     allow_couples,
//                     video_label,
//                     is_active
//                 } = req.body;

//                 // Handle photos
//                 let existingPhotosArray = existingRoom.photo_urls || [];
//                 try {
//                     existingPhotosArray = existing_photos ? JSON.parse(existing_photos) : existingPhotosArray;
//                 } catch (e) {
//                     // Keep existing photos
//                 }

//                 // Parse photos to remove
//                 let photosToRemove = [];
//                 try {
//                     photosToRemove = remove_photos ? JSON.parse(remove_photos) : [];
//                 } catch (e) {
//                     photosToRemove = [];
//                 }

//                 // Remove selected photos
//                 if (photosToRemove.length > 0) {
//                     const filenamesToRemove = photosToRemove.map(p => typeof p === 'object' ? p.url : p);
//                     deleteFiles(filenamesToRemove, false);
//                     existingPhotosArray = existingPhotosArray.filter(photo => 
//                         !filenamesToRemove.includes(typeof photo === 'object' ? photo.url : photo)
//                     );
//                 }

//                 // Parse photo labels for new photos
//                 const photo_labels = parsePhotoLabels(req);
                
//                 // Add new photos with labels
//                 const newPhotos = [];
//                 if (req.files && req.files.photos) {
//                     req.files.photos.forEach((file, index) => {
//                         const label = photo_labels[index] || photo_labels[file.originalname] || 'Room View';
//                         newPhotos.push({
//                             url: file.filename,
//                             label: label
//                         });
//                     });
//                 }

//                 const allPhotos = [...existingPhotosArray, ...newPhotos];

//                 // Handle video
//                 let video_url = existingRoom.video_url;
//                 let finalVideoLabel = video_label || existingRoom.video_label || '';
                
//                 // Remove existing video if requested
//                 if (remove_video === 'true' && existingRoom.video_url) {
//                     deleteFiles([existingRoom.video_url], true);
//                     video_url = null;
//                     finalVideoLabel = '';
//                 }
                
//                 // Add new video if uploaded
//                 if (req.files && req.files.video && req.files.video[0]) {
//                     // Delete old video if exists
//                     if (existingRoom.video_url) {
//                         deleteFiles([existingRoom.video_url], true);
//                     }
//                     video_url = req.files.video[0].filename;
//                 }

//                 // Parse amenities
//                 let amenitiesArray = existingRoom.amenities || [];
//                 if (amenities !== undefined) {
//                     try {
//                         amenitiesArray = JSON.parse(amenities);
//                     } catch (e) {
//                         // Keep existing amenities
//                     }
//                 }

//                 const updateData = {
//                     property_id: property_id !== undefined ? parseInt(property_id) : existingRoom.property_id,
//                     room_number: room_number || existingRoom.room_number,
//                     sharing_type: sharing_type || existingRoom.sharing_type,
//                     room_type: room_type || existingRoom.room_type,
//                     total_beds: total_beds !== undefined ? parseInt(total_beds) : existingRoom.total_bed,
//                     occupied_beds: occupied_beds !== undefined ? parseInt(occupied_beds) : existingRoom.occupied_beds,
//                     floor: floor !== undefined ? parseInt(floor) : existingRoom.floor,
//                     rent_per_bed: rent_per_bed !== undefined ? parseFloat(rent_per_bed) : existingRoom.rent_per_bed,
//                     has_attached_bathroom: has_attached_bathroom !== undefined ? 
//                         (has_attached_bathroom === 'true' || has_attached_bathroom === true) : 
//                         existingRoom.has_attached_bathroom,
//                     has_balcony: has_balcony !== undefined ? 
//                         (has_balcony === 'true' || has_balcony === true) : 
//                         existingRoom.has_balcony,
//                     has_ac: has_ac !== undefined ? 
//                         (has_ac === 'true' || has_ac === true) : 
//                         existingRoom.has_ac,
//                     amenities: amenitiesArray,
//                     photo_urls: allPhotos,
//                     video_url: video_url,
//                     video_label: finalVideoLabel,
//                     room_gender_preference: room_gender_preference || existingRoom.room_gender_preference || 'any',
//                     allow_couples: allow_couples !== undefined ? 
//                         (allow_couples === 'true' || allow_couples === true) : 
//                         existingRoom.allow_couples,
//                     is_active: is_active !== undefined ? 
//                         (is_active === 'true' || is_active === true) : 
//                         existingRoom.is_active
//                 };

//                 const updated = await RoomModel.update(id, updateData);

//                 if (!updated) {
//                     if (req.files) {
//                         if (req.files.photos) {
//                             deleteFiles(req.files.photos.map(file => file.filename), false);
//                         }
//                         if (req.files.video) {
//                             deleteFiles(req.files.video.map(file => file.filename), true);
//                         }
//                     }
//                     return res.status(500).json({
//                         success: false,
//                         message: "Failed to update room"
//                     });
//                 }

//                 res.json({
//                     success: true,
//                     message: "Room updated successfully",
//                     photo_urls: allPhotos,
//                     video_url
//                 });
//             } catch (error) {
//                 console.error("updateRoom error:", error);
                
//                 if (req.files) {
//                     if (req.files.photos) {
//                         deleteFiles(req.files.photos.map(file => file.filename), false);
//                     }
//                     if (req.files.video) {
//                         deleteFiles(req.files.video.map(file => file.filename), true);
//                     }
//                 }
                
//                 res.status(500).json({
//                     success: false,
//                     message: "Failed to update room"
//                 });
//             }
//         });
//     },

//     // Delete room - DELETE /api/rooms/:id
//     async deleteRoom(req, res) {
//         try {
//             const { id } = req.params;
//             const deleted = await RoomModel.delete(id);

//             if (!deleted) {
//                 return res.status(404).json({
//                     success: false,
//                     message: "Room not found"
//                 });
//             }

//             res.json({
//                 success: true,
//                 message: "Room deleted successfully"
//             });
//         } catch (err) {
//             console.error("deleteRoom error:", err);
//             res.status(500).json({
//                 success: false,
//                 message: "Failed to delete room"
//             });
//         }
//     },

//     // Get available beds for a room - GET /api/rooms/:id/available-beds
//     async getAvailableBeds(req, res) {
//   try {
//     const { id } = req.params;
//     const { gender } = req.query;
    
//     const availableBeds = await RoomModel.getAvailableBeds(id, gender);
    
//     res.json({
//       success: true,
//       data: availableBeds
//     });
//   } catch (err) {
//     console.error("getAvailableBeds error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch available beds"
//     });
//   }
// },


//     // Assign bed to tenant - POST /api/rooms/assign-bed
//     // Assign bed to tenant
// async assignBed(req, res) {
//   try {
//     const { room_id, bed_number, tenant_id, tenant_gender } = req.body;
    
//     if (!room_id || !bed_number || !tenant_id || !tenant_gender) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required"
//       });
//     }
    
//     const assigned = await RoomModel.assignBed(room_id, bed_number, tenant_id, tenant_gender);
    
//     if (!assigned) {
//       return res.status(400).json({
//         success: false,
//         message: "Failed to assign bed"
//       });
//     }
    
//     res.json({
//       success: true,
//       message: "Bed assigned successfully"
//     });
//   } catch (err) {
//     console.error("assignBed error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to assign bed"
//     });
//   }
// },

// // Update bed assignment
// async updateBedAssignment(req, res) {
//   try {
//     const { id } = req.params; // bed assignment ID
//     const { tenant_id, tenant_gender, is_available } = req.body;
    
//     const updated = await RoomModel.updateBedAssignment(id, {
//       tenant_id,
//       tenant_gender,
//       is_available
//     });
    
//     if (!updated) {
//       return res.status(404).json({
//         success: false,
//         message: "Bed assignment not found"
//       });
//     }
    
//     res.json({
//       success: true,
//       message: "Bed assignment updated successfully"
//     });
//   } catch (err) {
//     console.error("updateBedAssignment error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update bed assignment"
//     });
//   }
// }
// };

// module.exports = RoomController;




// controllers.roomController.js
const RoomModel = require('../models/roomModel');
const multer = require("multer");
const path = require("path");
const fs = require("fs");


// Create upload directories
const uploadPath = path.join(__dirname, "..", "uploads", "rooms");
const videoUploadPath = path.join(uploadPath, "videos");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
if (!fs.existsSync(videoUploadPath)) {
  fs.mkdirSync(videoUploadPath, { recursive: true });
}

// // Configure storage for images and videos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'video') {
      cb(null, videoUploadPath);
    } else if (file.fieldname === 'photos') {
      cb(null, uploadPath);
    } else {
      cb(new Error('Invalid fieldname'), false);
    }
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    
    if (file.fieldname === 'video') {
      cb(null, "room-video-" + unique + ext);
    } else {
      cb(null, "room-" + unique + ext);
    }
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    const allowedMimes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files (mp4, webm, ogg, mov) are allowed"), false);
    }
  } else if (file.fieldname === 'photos') {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, webp, gif) are allowed"), false);
    }
  } else {
    cb(new Error('Invalid fieldname'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024,
    files: 11
  }
}).fields([
  { name: 'photos', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]);

// // Helper function to delete files
const deleteFiles = (filePaths, isVideo = false) => {
  if (!filePaths || !Array.isArray(filePaths)) return;
  const basePath = isVideo ? videoUploadPath : uploadPath;
  
  filePaths.forEach(filename => {
    if (filename) {
      const filePath = path.join(basePath, filename);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Error deleting file ${filename}:`, err);
        });
      }
    }
  });
};

// Helper to parse photo labels
const parsePhotoLabels = (req) => {
  const labels = {};
  if (req.body.photo_labels) {
    try {
      const parsed = JSON.parse(req.body.photo_labels);
      if (typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      Object.keys(req.body).forEach(key => {
        if (key.startsWith('photo_label_')) {
          const photoIndex = key.replace('photo_label_', '');
          labels[photoIndex] = req.body[key];
        }
      });
    }
  }
  return labels;
};

const RoomController = {
  // Get all rooms - GET /api/rooms
  async getAllRooms(req, res) {
    try {
      const rooms = await RoomModel.findAll();
      res.status(200).json({
        success: true,
        data: rooms
      });
    } catch (error) {
      console.error("getAllRooms error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch rooms"
      });
    }
  },

  // Get room by id - GET /api/rooms/:id
  async getRoomById(req, res) {
    try {
      const { id } = req.params;
      const room = await RoomModel.findById(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: "Room not found"
        });
      }
      res.status(200).json({
        success: true,
        data: room
      });
    } catch (error) {
      console.error("getRoomById error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch room"
      });
    }
  },

  
async getRoomsByPropertyId(req, res) {
  try {
    const { propertyId } = req.params;
    
    console.log(`Getting rooms for property ID: ${propertyId}`);
    
    // Validate propertyId
    if (!propertyId || isNaN(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "Valid property ID is required"
      });
    }
    
    const rooms = await RoomModel.findByPropertyId(parseInt(propertyId));
    
    console.log(`Found ${rooms.length} rooms for property ${propertyId}`);
    
    // Filter to only show active rooms
    const activeRooms = rooms.filter(room => room.is_active);
    
    res.status(200).json({
      success: true,
      data: activeRooms,
      count: activeRooms.length
    });
    
  } catch (error) {
    console.error("getRoomsByPropertyId error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rooms for this property"
    });
  }
},


  // Create room - POST /api/rooms
// async createRoom(req, res) {
//   upload(req, res, async function(err) {
//     if (err) {
//       console.error("Upload error:", err);
//       return res.status(400).json({
//         success: false,
//         message: err.message || "File upload failed"
//       });
//     }

//     try {
//       const {
//         property_id,
//         room_number,
//         sharing_type,
//         room_type = 'pg',
//         total_beds,
//         occupied_beds = 0,
//         floor = 1,
//         rent_per_bed,
//         has_attached_bathroom = false,
//         has_balcony = false,
//         has_ac = false,
//         amenities = "[]",
//         room_gender_preference = '',
//         allow_couples = false,
//         description = '',
//         is_active = true,
//         video_label = ''
//       } = req.body;

//       // Validate required fields
//       if (!property_id || !room_number || !sharing_type || !total_beds || !rent_per_bed) {
//         if (req.files && req.files.photos) {
//           deleteFiles(req.files.photos.map(file => file.filename), false);
//         }
//         if (req.files && req.files.video) {
//           deleteFiles(req.files.video.map(file => file.filename), true);
//         }
//         return res.status(400).json({
//           success: false,
//           message: "Required fields are missing"
//         });
//       }

//       // Parse amenities
//       let amenitiesArray = [];
//       try {
//         amenitiesArray = JSON.parse(amenities);
//       } catch (e) {
//         amenitiesArray = [];
//       }

//       // Process room_gender_preference - FIXED
//       let processedGenderPref = [];
//       if (room_gender_preference) {
//         try {
//           // Check if it's a JSON array string
//           if (room_gender_preference.startsWith('[')) {
//             processedGenderPref = JSON.parse(room_gender_preference);
//           } 
//           // Check if it's comma-separated
//           else if (room_gender_preference.includes(',')) {
//             processedGenderPref = room_gender_preference.split(',')
//               .map(item => item.trim().toLowerCase())
//               .filter(item => item !== '');
//           }
//           // Single value
//           else if (room_gender_preference.trim() !== '') {
//             processedGenderPref = [room_gender_preference.trim().toLowerCase()];
//           }
//         } catch (e) {
//           console.log("Error parsing gender preference:", e);
//           // Default to empty array if parsing fails
//           processedGenderPref = [];
//         }
//       }
      
//       // Normalize gender preference values
//       processedGenderPref = processedGenderPref.map(pref => {
//         const normalized = pref.toLowerCase().trim();
//         if (normalized === 'male' || normalized === 'male_only') {
//           return 'male_only';
//         } else if (normalized === 'female' || normalized === 'female_only') {
//           return 'female_only';
//         } else if (normalized === 'couple' || normalized === 'couples') {
//           return 'couples';
//         }
//         return normalized;
//       });

//       console.log("Processed gender preferences:", processedGenderPref); // Debug log

//       // Get uploaded file names with labels
//       const photo_labels = parsePhotoLabels(req);
//       const photo_urls = [];
      
//       if (req.files && req.files.photos) {
//         req.files.photos.forEach((file, index) => {
//           const label = photo_labels[index] || photo_labels[file.originalname] || 'Room View';
//           photo_urls.push({
//             url: file.filename,
//             label: label
//           });
//         });
//       }

//       // Handle video file
//       let video_url = null;
//       if (req.files && req.files.video && req.files.video[0]) {
//         video_url = req.files.video[0].filename;
//       }

//       const roomId = await RoomModel.create({
//         property_id: parseInt(property_id),
//         room_number,
//         sharing_type,
//         room_type,
//         total_beds: parseInt(total_beds),
//         occupied_beds: parseInt(occupied_beds),
//         floor: parseInt(floor),
//         rent_per_bed: parseFloat(rent_per_bed),
//         has_attached_bathroom: has_attached_bathroom === 'true' || has_attached_bathroom === true,
//         has_balcony: has_balcony === 'true' || has_balcony === true,
//         has_ac: has_ac === 'true' || has_ac === true,
//         amenities: amenitiesArray,
//         photo_urls,
//         video_url,
//         room_gender_preference: processedGenderPref, // Use processed array
//         allow_couples: allow_couples === 'true' || allow_couples === true,
//         description,
//         is_active: is_active === 'true' || is_active === true
//       });

//       res.status(201).json({
//         success: true,
//         message: "Room created successfully",
//         id: roomId,
//         photo_urls,
//         video_url,
//         video_label
//       });
//     } catch (error) {
//       console.error("createRoom error:", error);
      
//       if (req.files) {
//         if (req.files.photos) {
//           deleteFiles(req.files.photos.map(file => file.filename), false);
//         }
//         if (req.files.video) {
//           deleteFiles(req.files.video.map(file => file.filename), true);
//         }
//       }
      
//       res.status(500).json({
//         success: false,
//         message: "Failed to create room"
//       });
//     }
//   });
// },

async createRoom(req, res) {
  try {

    const body = req.body || {};

    const {
      property_id,
      room_number,
      sharing_type,
      room_type = "pg",
      total_beds,
      occupied_beds = 0,
      floor = 1,
      rent_per_bed,
      has_attached_bathroom = false,
      has_balcony = false,
      has_ac = false,
      amenities = "[]",
      room_gender_preference = "",
      allow_couples = false,
      description = "",
      is_active = true
    } = body;

    if (
  property_id === undefined ||
  room_number === undefined ||
  sharing_type === undefined ||
  total_beds === undefined ||
  rent_per_bed === undefined
) {
  return res.status(400).json({
    success: false,
    message: "Required fields missing"
  });
}


    // Parse amenities safely
    let amenitiesArray = [];
    try {
      amenitiesArray = JSON.parse(amenities);
    } catch {}

    // Photos
    const photos = [];
    let photoLabels = {};

    if (body.photo_labels) {
      try {
        photoLabels = JSON.parse(body.photo_labels);
      } catch {}
    }

    if (req.files?.photos) {
      req.compressedPhotos.forEach((file, index) => {
photos.push({
  url:  file.path,
  label: photoLabels[index] || "Room View"
});
      });
    }
console.log(photos)
    // Video
    let video_url = null;
    // if (req.files?.video?.[0]) {
    //   video_url = req.files.video[0].fieldname;
    // }
    if (req.compressedVideo) {
  video_url = req.compressedVideo.path;
}

    console.log(video_url)

    const roomId = await RoomModel.create({
      property_id: parseInt(property_id),
      room_number,
      sharing_type,
      room_type,
      total_beds: parseInt(total_beds),
      occupied_beds: parseInt(occupied_beds),
      floor: parseInt(floor),
      rent_per_bed: parseFloat(rent_per_bed),
      has_attached_bathroom: has_attached_bathroom === "true" || has_attached_bathroom === true,
      has_balcony: has_balcony === "true" || has_balcony === true,
      has_ac: has_ac === "true" || has_ac === true,
      amenities: amenitiesArray,
      photo_urls: photos,
      video_url,
      room_gender_preference,
      allow_couples: allow_couples === "true" || allow_couples === true,
      description,
      is_active: is_active === "true" || is_active === true
    });

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      id: roomId,
      photos,
      video_url
    });

  } catch (error) {
    console.error("createRoom error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create room"
    });
  }
}



,

// Update room - PUT /api/rooms/:id
// async updateRoom(req, res) {
//   upload(req, res, async function(err) {
//     if (err) {
//       console.error("Upload error:", err);
//       return res.status(400).json({
//         success: false,
//         message: err.message || "File upload failed"
//       });
//     }

//     try {
//       const { id } = req.params;
//       const existingRoom = await RoomModel.findById(id);
      
//       if (!existingRoom) {
//         if (req.files) {
//           if (req.files.photos) {
//             deleteFiles(req.files.photos.map(file => file.filename), false);
//           }
//           if (req.files.video) {
//             deleteFiles(req.files.video.map(file => file.filename), true);
//           }
//         }
//         return res.status(404).json({
//           success: false,
//           message: "Room not found"
//         });
//       }

//       const {
//         property_id,
//         room_number,
//         sharing_type,
//         room_type,
//         total_beds,
//         occupied_beds,
//         floor,
//         rent_per_bed,
//         has_attached_bathroom,
//         has_balcony,
//         has_ac,
//         amenities,
//         existing_photos,
//         remove_photos = "[]",
//         remove_video = "false",
//         room_gender_preference,
//         allow_couples,
//         description,
//         is_active,
//         video_label = ''
//       } = req.body;

//       // Handle photos - START WITH EXISTING PHOTOS FROM DATABASE
//       let existingPhotosArray = existingRoom.photo_urls || [];
      
//       // If existing_photos is provided in request, use it (for frontend updates)
//       if (existing_photos !== undefined && existing_photos !== '') {
//         try {
//           const parsedExisting = JSON.parse(existing_photos);
//           if (Array.isArray(parsedExisting)) {
//             existingPhotosArray = parsedExisting;
//           }
//         } catch (e) {
//           console.log("Could not parse existing_photos, keeping DB photos");
//         }
//       }

//       // Parse photos to remove
//       let photosToRemove = [];
//       try {
//         photosToRemove = remove_photos ? JSON.parse(remove_photos) : [];
//       } catch (e) {
//         photosToRemove = [];
//       }

//       // Remove selected photos
//       if (photosToRemove.length > 0) {
//         const filenamesToRemove = photosToRemove.map(p => {
//           if (typeof p === 'object' && p.url) {
//             return p.url;
//           }
//           return String(p);
//         });
        
//         deleteFiles(filenamesToRemove, false);
//         existingPhotosArray = existingPhotosArray.filter(photo => {
//           const photoUrl = typeof photo === 'object' ? photo.url : photo;
//           return !filenamesToRemove.includes(photoUrl);
//         });
//       }

//       // Parse photo labels for new photos
//       const photo_labels = parsePhotoLabels(req);
      
//       // Add new photos with labels
//       const newPhotos = [];
//       if (req.files && req.files.photos) {
//         req.files.photos.forEach((file, index) => {
//           const label = photo_labels[index] || photo_labels[file.originalname] || 'Room View';
//           newPhotos.push({
//             url: file.filename,
//             label: label
//           });
//         });
//       }

//       const allPhotos = [...existingPhotosArray, ...newPhotos];

//       // Handle video
//       let video_url = existingRoom.video_url;
      
//       // Remove existing video if requested
//       if (remove_video === 'true' && video_url) {
//         deleteFiles([video_url], true);
//         video_url = null;
//       }
      
//       // Add new video if uploaded
//       if (req.files && req.files.video && req.files.video[0]) {
//         if (existingRoom.video_url) {
//           deleteFiles([existingRoom.video_url], true);
//         }
//         video_url = req.files.video[0].filename;
//       }

//       // Parse amenities
//       let amenitiesArray = existingRoom.amenities || [];
//       if (amenities !== undefined && amenities !== '') {
//         try {
//           amenitiesArray = JSON.parse(amenities);
//         } catch (e) {
//           console.log("Could not parse amenities, keeping existing");
//         }
//       }

//       // Process room_gender_preference - FIXED
//       let processedGenderPref = existingRoom.room_gender_preference || [];
//       if (room_gender_preference !== undefined && room_gender_preference !== '') {
//         try {
//           // Check if it's a JSON array string
//           if (room_gender_preference.startsWith('[')) {
//             processedGenderPref = JSON.parse(room_gender_preference);
//           } 
//           // Check if it's comma-separated
//           else if (room_gender_preference.includes(',')) {
//             processedGenderPref = room_gender_preference.split(',')
//               .map(item => item.trim().toLowerCase())
//               .filter(item => item !== '');
//           }
//           // Single value
//           else if (room_gender_preference.trim() !== '') {
//             processedGenderPref = [room_gender_preference.trim().toLowerCase()];
//           }
//         } catch (e) {
//           console.log("Error parsing gender preference:", e);
//           // Keep existing if parsing fails
//           processedGenderPref = existingRoom.room_gender_preference || [];
//         }
//       }
      
//       // Normalize gender preference values
//       processedGenderPref = processedGenderPref.map(pref => {
//         const normalized = typeof pref === 'string' ? pref.toLowerCase().trim() : String(pref).toLowerCase().trim();
//         if (normalized === 'male' || normalized === 'male_only') {
//           return 'male_only';
//         } else if (normalized === 'female' || normalized === 'female_only') {
//           return 'female_only';
//         } else if (normalized === 'couple' || normalized === 'couples') {
//           return 'couples';
//         }
//         return normalized;
//       });

//       console.log("Updated gender preferences:", processedGenderPref); // Debug log

//       const updateData = {
//         property_id: property_id !== undefined ? parseInt(property_id) : existingRoom.property_id,
//         // room_number: room_number || existingRoom.room_number,
//         room_number:
//   room_number !== undefined && room_number !== ""
//     ? room_number
//     : existingRoom.room_number,

//         sharing_type: sharing_type || existingRoom.sharing_type,
//         room_type: room_type || existingRoom.room_type,
//         total_beds: total_beds !== undefined ? parseInt(total_beds) : existingRoom.total_bed,
//         occupied_beds: occupied_beds !== undefined ? parseInt(occupied_beds) : existingRoom.occupied_beds,
//         floor: floor !== undefined ? parseInt(floor) : existingRoom.floor,
//         rent_per_bed: rent_per_bed !== undefined ? parseFloat(rent_per_bed) : existingRoom.rent_per_bed,
//         has_attached_bathroom: has_attached_bathroom !== undefined ? 
//           (has_attached_bathroom === 'true' || has_attached_bathroom === true) : 
//           existingRoom.has_attached_bathroom,
//         has_balcony: has_balcony !== undefined ? 
//           (has_balcony === 'true' || has_balcony === true) : 
//           existingRoom.has_balcony,
//         has_ac: has_ac !== undefined ? 
//           (has_ac === 'true' || has_ac === true) : 
//           existingRoom.has_ac,
//         amenities: amenitiesArray,
//         photo_urls: allPhotos,
//         video_url: video_url,
//         room_gender_preference: processedGenderPref, // Use processed array
//         allow_couples: allow_couples !== undefined ? 
//           (allow_couples === 'true' || allow_couples === true) : 
//           existingRoom.allow_couples,
//         description: description !== undefined ? description : existingRoom.description,
//         is_active: is_active !== undefined ? 
//           (is_active === 'true' || is_active === true) : 
//           existingRoom.is_active
//       };

//       const updated = await RoomModel.update(id, updateData);

//       if (!updated) {
//         if (req.files) {
//           if (req.files.photos) {
//             deleteFiles(req.files.photos.map(file => file.filename), false);
//           }
//           if (req.files.video) {
//             deleteFiles(req.files.video.map(file => file.filename), true);
//           }
//         }
//         return res.status(500).json({
//           success: false,
//           message: "Failed to update room"
//         });
//       }

//       res.json({
//         success: true,
//         message: "Room updated successfully",
//         data: {
//           photo_urls: allPhotos,
//           video_url,
//           video_label
//         }
//       });
//     } catch (error) {
//       console.error("updateRoom error:", error);
      
//       if (req.files) {
//         if (req.files.photos) {
//           deleteFiles(req.files.photos.map(file => file.filename), false);
//         }
//         if (req.files.video) {
//           deleteFiles(req.files.video.map(file => file.filename), true);
//         }
//       }
      
//       res.status(500).json({
//         success: false,
//         message: "Failed to update room"
//       });
//     }
//   });
// },

async updateRoom(req, res) {
  try {

    const body = req.body || {};
    const roomId = req.params.id;
    console.log(req.body)

    // Fetch existing room
    const existingRoom = await RoomModel.findById(roomId);
    console.log("existing room data", existingRoom)

    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // =====================
    // HANDLE PHOTOS
    // =====================

    let currentPhotos = existingRoom.photo_urls || [];

    console.log("current photos", currentPhotos)

    // Remove selected photos
    let photosToRemove = [];
    try {
      console.log("body of remove ",body.remove_photos)
      photosToRemove = JSON.parse(body.remove_photos || "[]");
    } catch {}

    console.log("---- REMOVE CHECK ----");


    // if (photosToRemove.length) {
    //   const removeNames = photosToRemove.map(p => p.url || p);
    //   currentPhotos = currentPhotos.filter(p => !removeNames.includes(p.url || p));
    // }
    console.log("before photos to remove ", photosToRemove.length)
if (photosToRemove.length) {

  const extractPath = (url) => {
    if (!url) return "";

    // If full URL → get pathname
    if (url.startsWith("http")) {
      return new URL(url).pathname;
    }

    // If already path
    return url;
  };

  const removeList = photosToRemove.map(p => {
    const raw = typeof p === "string" ? p : p.url;
    return extractPath(raw);
  });

  console.log("REMOVE LIST CLEAN:", removeList);

  const keptPhotos = [];
  console.log("CURRENT PHOTOS:", currentPhotos);
  console.log("REMOVE PHOTOS:", removeList);

  for (const photo of currentPhotos) {

    const photoPath = extractPath(photo.url);
    
console.log("CHECKING PHOTO:", photoPath);
console.log("REMOVE LIST:", removeList);
    const shouldRemove = removeList.includes(photoPath);

    console.log("CHECK:", photoPath, "REMOVE?", shouldRemove);

    if (shouldRemove) {

      const fullPath = path.join(__dirname, "..", photoPath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log("🗑 Deleted file:", fullPath);
      }

    } else {
      keptPhotos.push(photo);
    }
  }

  currentPhotos = keptPhotos;
}


    // Photo labels
    let labels = {};
    try {
      labels = JSON.parse(body.photo_labels || "{}");
    } catch {}

    // Add new photos
    // if (req.compressedPhotos?.photos) {
    //   req.compressedPhotos.photos.forEach((file, index) => {
    //     currentPhotos.push({
    //       url: file.path,
    //       label: labels[index] || "Room View"
    //     });
    //   });
    // }
if (req.compressedPhotos?.length) {
  req.compressedPhotos.forEach((file, index) => {
    currentPhotos.push({
      url: file.path,
      label: labels[index] || "Room View"
    });
  });
}

console.log("Photos:", req.compressedPhotos);


    // =====================
    // HANDLE VIDEO
    // =====================

    let video_url = existingRoom.video_url;

    // if (body.videoToRemove === "true") {
    //   video_url = null;
    // }
    if (body.videoToRemove === "true" && existingRoom.video_url) {
  const videoPath = path.join(__dirname, "..", existingRoom.video_url);

  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
  }

  video_url = null;
}


    // if (req.compressedVideo?.video?.[0]) {
    //   video_url = req.compressedVideo.video[0].path;
    // }
    if (req.compressedVideo) {
  video_url = req.compressedVideo.path;
}
console.log("Video:", req.compressedVideo);


    // =====================
    // UPDATE FIELDS
    // =====================

    const updatedRoomData = {
      property_id: body.property_id !== undefined 
        ? parseInt(body.property_id) 
        : existingRoom.property_id,

      room_number: body.room_number || existingRoom.room_number,

      sharing_type: body.sharing_type || existingRoom.sharing_type,

      total_beds: body.total_beds !== undefined 
        ? parseInt(body.total_beds) 
        : existingRoom.total_beds,

      occupied_beds: body.occupied_beds !== undefined 
        ? parseInt(body.occupied_beds) 
        : existingRoom.occupied_beds,

      floor: body.floor !== undefined 
        ? parseInt(body.floor) 
        : existingRoom.floor,

      rent_per_bed: body.rent_per_bed !== undefined 
        ? parseFloat(body.rent_per_bed) 
        : existingRoom.rent_per_bed,

      has_attached_bathroom: body.has_attached_bathroom !== undefined
        ? body.has_attached_bathroom === "true" || body.has_attached_bathroom === true
        : existingRoom.has_attached_bathroom,

      has_balcony: body.has_balcony !== undefined
        ? body.has_balcony === "true" || body.has_balcony === true
        : existingRoom.has_balcony,

      has_ac: body.has_ac !== undefined
        ? body.has_ac === "true" || body.has_ac === true
        : existingRoom.has_ac,

      allow_couples: body.allow_couples !== undefined
        ? body.allow_couples === "true" || body.allow_couples === true
        : existingRoom.allow_couples,

      is_active: body.is_active !== undefined
        ? body.is_active === "true" || body.is_active === true
        : existingRoom.is_active,

      amenities: body.amenities 
        ? JSON.parse(body.amenities) 
        : existingRoom.amenities,

      room_gender_preference: body.room_gender_preference || existingRoom.room_gender_preference,

      description: body.description !== undefined 
        ? body.description 
        : existingRoom.description,

      photo_urls: currentPhotos,

      video_url
    };

    // =====================
    // SAVE UPDATE
    // =====================

    await RoomModel.update(roomId, updatedRoomData);

    res.json({
      success: true,
      message: "Room updated successfully",
      data: {
        photos: currentPhotos,
        video_url
      }
    });

  } catch (error) {
    console.error("updateRoom error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update room"
    });
  }
}


,




// RoomController.js में updateRoom function को update करें
// async updateRoom(req, res) {

//   console.log("=== UPDATE REQUEST DEBUG ===");
// console.log("Editing room ID:", id);
// console.log("Existing room number:", existingRoom.room_number);
// console.log("Request body room_number:", req.body.room_number);
// console.log("Form data room_number from frontend:", room_number);
// console.log("is_active values:", {
//   fromDB: existingRoom.is_active,
//   fromRequest: is_active,
//   parsed: is_active !== undefined ? (is_active === 'true' || is_active === true) : existingRoom.is_active
// });
  
//   upload(req, res, async function(err) {
//     if (err) {
//       console.error("Upload error:", err);
//       return res.status(400).json({
//         success: false,
//         message: err.message || "File upload failed"
//       });
//     }
//     console.log("Files:", req.files);
//     console.log("Request body:", req.body);
//     try {
//       // ✅ यहाँ से id लें
//       const { id } = req.params;
//       console.log("=== UPDATE REQUEST DEBUG ===");
//       console.log("Updating room ID from params:", id);
//       // const { id } = req.params;
//       const existingRoom = await RoomModel.findById(id);
//       console.log("Existing room:", existingRoom);
      
//       if (!existingRoom) {
//         console.log("Room not found with ID:", id);
//         // Cleanup uploaded files if room not found
//         if (req.files) {
//           if (req.files.photos) {
//             deleteFiles(req.files.photos.map(file => file.filename), false);
//           }
//           if (req.files.video) {
//             deleteFiles(req.files.video.map(file => file.filename), true);
//           }
//         }
//         return res.status(404).json({
//           success: false,
//           message: "Room not found"
//         });
//       }

//       console.log("Found existing room:", {
//         id: existingRoom.id,
//         room_number: existingRoom.room_number,
//         is_active: existingRoom.is_active
//       });

//       const {
//         property_id,
//         room_number,
//         sharing_type,
//         room_type = existingRoom.room_type,
//         total_beds,
//         occupied_beds,
//         floor,
//         rent_per_bed,
//         has_attached_bathroom,
//         has_balcony,
//         has_ac,
//         amenities,
//         existing_photos,
//         remove_photos = "[]",
//         remove_video = "false",
//         room_gender_preference,
//         allow_couples,
//         description,
//         is_active, // ✅ ये field frontend से आ रहा है
//         video_label = ''
//       } = req.body;

//       console.log("Update request body:", {
//         is_active: is_active,
//         has_ac: has_ac,
//         has_balcony: has_balcony,
//         room_gender_preference: room_gender_preference
//       });

//       // Handle photos
//       let existingPhotosArray = existingRoom.photo_urls || [];
      
//       // If existing_photos is provided, use it
//       if (existing_photos !== undefined && existing_photos !== '') {
//         try {
//           const parsedExisting = JSON.parse(existing_photos);
//           if (Array.isArray(parsedExisting)) {
//             existingPhotosArray = parsedExisting;
//           }
//         } catch (e) {
//           console.log("Could not parse existing_photos, keeping DB photos");
//         }
//       }

//       // Parse photos to remove
//       let photosToRemove = [];
//       try {
//         photosToRemove = remove_photos ? JSON.parse(remove_photos) : [];
//       } catch (e) {
//         photosToRemove = [];
//       }

//       // Remove selected photos
//       if (photosToRemove.length > 0) {
//         const filenamesToRemove = photosToRemove.map(p => {
//           if (typeof p === 'object' && p.url) {
//             const urlParts = p.url.split('/');
//             return urlParts[urlParts.length - 1]; // Extract filename
//           }
//           return String(p);
//         });
        
//         deleteFiles(filenamesToRemove, false);
//         existingPhotosArray = existingPhotosArray.filter(photo => {
//           const photoUrl = typeof photo === 'object' ? photo.url : photo;
//           const urlParts = photoUrl.split('/');
//           const filename = urlParts[urlParts.length - 1];
//           return !filenamesToRemove.includes(filename);
//         });
//       }

//       // Parse photo labels for new photos
//       const photo_labels = parsePhotoLabels(req);
      
//       // Add new photos with labels
//       const newPhotos = [];
//       if (req.files && req.files.photos) {
//         req.files.photos.forEach((file, index) => {
//           const label = photo_labels[index] || photo_labels[file.originalname] || 'Room View';
//           newPhotos.push({
//             url: `/uploads/${file.filename}`, // Full URL
//             label: label
//           });
//         });
//       }

//       const allPhotos = [...existingPhotosArray, ...newPhotos];

//       // Handle video
//       let video_url = existingRoom.video_url;
      
//       // Remove existing video if requested
//       if (remove_video === 'true' && video_url) {
//         const videoFilename = video_url.split('/').pop();
//         deleteFiles([videoFilename], true);
//         video_url = null;
//       }
      
//       // Add new video if uploaded
//       if (req.files && req.files.video && req.files.video[0]) {
//         if (existingRoom.video_url) {
//           const oldVideoFilename = existingRoom.video_url.split('/').pop();
//           deleteFiles([oldVideoFilename], true);
//         }
//         video_url = `/uploads/videos/${req.files.video[0].filename}`;
//       }

//       // Parse amenities
//       let amenitiesArray = existingRoom.amenities || [];
//       if (amenities !== undefined && amenities !== '') {
//         try {
//           amenitiesArray = JSON.parse(amenities);
//         } catch (e) {
//           console.log("Could not parse amenities, keeping existing");
//         }
//       }

//       // Process room_gender_preference
//       let processedGenderPref = existingRoom.room_gender_preference || [];
//       if (room_gender_preference !== undefined && room_gender_preference !== '') {
//         try {
//           if (room_gender_preference.startsWith('[')) {
//             processedGenderPref = JSON.parse(room_gender_preference);
//           } else if (room_gender_preference.includes(',')) {
//             processedGenderPref = room_gender_preference.split(',')
//               .map(item => item.trim().toLowerCase())
//               .filter(item => item !== '');
//           } else if (room_gender_preference.trim() !== '') {
//             processedGenderPref = [room_gender_preference.trim().toLowerCase()];
//           }
//         } catch (e) {
//           console.log("Error parsing gender preference:", e);
//           processedGenderPref = existingRoom.room_gender_preference || [];
//         }
//       }

//       // Create update data - IMPORTANT FIX HERE
//       const updateData = {
//         property_id: property_id !== undefined ? parseInt(property_id) : existingRoom.property_id,
//         room_number: room_number !== undefined ? room_number : existingRoom.room_number,
//         sharing_type: sharing_type !== undefined ? sharing_type : existingRoom.sharing_type,
//         room_type: room_type,
//         total_beds: total_beds !== undefined ? parseInt(total_beds) : existingRoom.total_bed,
//         occupied_beds: occupied_beds !== undefined ? parseInt(occupied_beds) : existingRoom.occupied_beds,
//         floor: floor !== undefined ? parseInt(floor) : existingRoom.floor,
//         rent_per_bed: rent_per_bed !== undefined ? parseFloat(rent_per_bed) : existingRoom.rent_per_bed,
        
//         // BOOLEAN FIELDS - Proper handling
//         has_attached_bathroom: has_attached_bathroom !== undefined ? 
//           (has_attached_bathroom === 'true' || has_attached_bathroom === true) : 
//           existingRoom.has_attached_bathroom,
          
//         has_balcony: has_balcony !== undefined ? 
//           (has_balcony === 'true' || has_balcony === true) : 
//           existingRoom.has_balcony,
          
//         has_ac: has_ac !== undefined ? 
//           (has_ac === 'true' || has_ac === true) : 
//           existingRoom.has_ac,
          
//         allow_couples: allow_couples !== undefined ? 
//           (allow_couples === 'true' || allow_couples === true) : 
//           existingRoom.allow_couples,
          
//         is_active: is_active !== undefined ? 
//           (is_active === 'true' || is_active === true) : 
//           existingRoom.is_active, // ✅ यहाँ fix किया गया है
        
//         amenities: amenitiesArray,
//         photo_urls: allPhotos,
//         video_url: video_url,
//         room_gender_preference: processedGenderPref,
//         description: description !== undefined ? description : existingRoom.description
//       };

//       console.log("Update data to save:", updateData);

//       const updated = await RoomModel.update(id, updateData);

//       if (!updated) {
//         // Cleanup on failure
//         if (req.files) {
//           if (req.files.photos) {
//             deleteFiles(req.files.photos.map(file => file.filename), false);
//           }
//           if (req.files.video) {
//             deleteFiles(req.files.video.map(file => file.filename), true);
//           }
//         }
//         return res.status(500).json({
//           success: false,
//           message: "Failed to update room"
//         });
//       }

//       res.json({
//         success: true,
//         message: "Room updated successfully",
//         data: {
//           photo_urls: allPhotos,
//           video_url,
//           video_label
//         }
//       });
//     } catch (error) {
//       console.error("updateRoom error:", error);
      
//       // Cleanup on error
//       if (req.files) {
//         if (req.files.photos) {
//           deleteFiles(req.files.photos.map(file => file.filename), false);
//         }
//         if (req.files.video) {
//           deleteFiles(req.files.video.map(file => file.filename), true);
//         }
//       }
      
//       res.status(500).json({
//         success: false,
//         message: "Failed to update room"
//       });
//     }
//   });
// },


  // Delete room - DELETE /api/rooms/:id
  async deleteRoom(req, res) {
    try {
      const { id } = req.params;
      const deleted = await RoomModel.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Room not found"
        });
      }

      res.json({
        success: true,
        message: "Room deleted successfully"
      });
    } catch (err) {
      console.error("deleteRoom error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to delete room"
      });
    }
  },


  
  async updateRoomOccupants(roomId, connection = null) {
      const conn = connection || db;
      
      try {
          console.log(`[DEBUG] updateRoomOccupants for room ${roomId}`);
          
          // First, get all occupied beds with gender
          const [occupiedBeds] = await conn.query(
              `SELECT tenant_gender 
              FROM bed_assignments 
              WHERE room_id = ? AND is_available = FALSE AND tenant_gender IS NOT NULL`,
              [roomId]
            );
            
            // Count occupied beds
            const occupiedCount = occupiedBeds.length;
            
            // Extract genders
            const genders = occupiedBeds.map(bed => bed.tenant_gender);
            
            console.log(`[DEBUG] Found ${occupiedCount} occupied beds, genders:`, genders);
            
            // Convert to JSON string safely
            const gendersJson = JSON.stringify(genders);
            
            // Update room
            const [updateResult] = await conn.query(
                `UPDATE rooms 
                SET occupied_beds = ?, 
                current_occupants_gender = ?
                WHERE id = ?`,
                [occupiedCount, gendersJson, roomId]
            );
            
            console.log(`[DEBUG] Updated room ${roomId} to ${occupiedCount} occupied beds`);
            
            return occupiedCount;
            
        } catch (err) {
            console.error("[ERROR] updateRoomOccupants error:", err.message);
            throw err;
        }
    },
    
    // Add this to your roomController.js
    // Add this to roomController.js
    async diagnoseRoomBeds(req, res) {
        try {
            const { id } = req.params; // Changed from room_id to id
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Room ID is required"
                });
            }
            
            const diagnosis = await RoomModel.debugRoomBeds(parseInt(id));
            
            res.json({
                success: true,
                data: diagnosis
            });
            
        } catch (err) {
            console.error("diagnoseRoomBeds error:", err);
            res.status(500).json({
                success: false,
                message: "Failed to diagnose room beds: " + err.message
            });
        }
    },
    
    // In roomController.js
    async getTenantAssignment(req, res) {
        try {
            const { tenant_id } = req.params;
            
            if (!tenant_id) {
                return res.status(400).json({
                    success: false,
                    message: "Tenant ID is required"
                });
            }
            
            const assignments = await RoomModel.findTenantAssignment(parseInt(tenant_id));
            
            res.json({
                success: true,
                data: assignments
            });
            
        } catch (err) {
            console.error("getTenantAssignment error:", err);
            res.status(500).json({
                success: false,
                message: "Failed to get tenant assignment"
            });
        }
    },


 // Assign bed to tenant - POST /api/rooms/assign-bed
async assignBed(req, res) {
  try {
    const { room_id, bed_number, tenant_id, tenant_gender } = req.body;
    
    console.log('[CONTROLLER] assignBed request:', req.body);
    
    // Validate required fields
    if (!room_id || !bed_number || !tenant_id || !tenant_gender) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: room_id, bed_number, tenant_id, tenant_gender"
      });
    }
    
    // Convert to numbers
    const roomId = parseInt(room_id);
    const bedNumber = parseInt(bed_number);
    const tenantId = parseInt(tenant_id);
    
    if (isNaN(roomId) || isNaN(bedNumber) || isNaN(tenantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid numeric values provided"
      });
    }
    
    // Validate gender
    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(tenant_gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender. Must be: Male, Female, or Other"
      });
    }
    
    // Call model function
    const result = await RoomModel.assignBed(roomId, bedNumber, tenantId, tenant_gender);
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
    
  } catch (err) {
    console.error("[CONTROLLER] assignBed error:", err.message);
    
    // Handle specific errors
    let status = 400;
    let message = err.message;
    
    if (err.message.includes('not found')) status = 404;
    if (err.message.includes('already assigned')) status = 409;
    if (err.message.includes('is already full')) status = 400;
    if (err.message.includes('is already occupied')) status = 409;
    
    res.status(status).json({
      success: false,
      message: message
    });
  }
},


// Update bed assignment - PUT /api/rooms/bed-assignments/:id
// async updateBedAssignment(req, res) {
//   try {
//     const { id } = req.params; // bed assignment ID
//     const { tenant_id, tenant_gender, is_available } = req.body;
    
//     console.log('[CONTROLLER] updateBedAssignment:', { id, body: req.body });
    
//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "Bed assignment ID is required"
//       });
//     }
    
//     // Process data - handle null values properly
//     const processedData = {};
    
//     if (tenant_id !== undefined) {
//       processedData.tenant_id = tenant_id === null || tenant_id === 'null' || tenant_id === '' ? null : parseInt(tenant_id);
//     }
    
//     if (tenant_gender !== undefined) {
//       processedData.tenant_gender = tenant_gender === null || tenant_gender === 'null' || tenant_gender === '' ? null : tenant_gender;
//     }
    
//     if (is_available !== undefined) {
//       // Convert string 'true'/'false' to boolean
//       if (is_available === 'true' || is_available === true) {
//         processedData.is_available = true;
//       } else if (is_available === 'false' || is_available === false) {
//         processedData.is_available = false;
//       } else {
//         processedData.is_available = Boolean(is_available);
//       }
//     }
    
//     console.log('Processed data:', processedData);
    
//     // Call model function
//     const result = await RoomModel.updateBedAssignment(id, processedData);
    
//     res.json({
//       success: true,
//       message: result.message,
//       data: result.data
//     });
    
//   } catch (err) {
//     console.error("[CONTROLLER] updateBedAssignment error:", err.message);
    
//     let status = 400;
//     let message = err.message;
    
//     if (err.message.includes('not found')) status = 404;
//     if (err.message.includes('No fields')) status = 400;
    
//     res.status(status).json({
//       success: false,
//       message: message
//     });
//   }
// },
// Update bed assignment - PUT /api/rooms/bed-assignments/:id
async updateBedAssignment(req, res) {
  try {
    const { id } = req.params; // bed assignment ID
    const { tenant_id, tenant_gender, is_available, vacate_reason } = req.body;
    
    console.log('[CONTROLLER] updateBedAssignment:', { id, body: req.body });
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Bed assignment ID is required"
      });
    }
    
    // Process data - handle null values properly
    const processedData = {};
    
    if (tenant_id !== undefined) {
      processedData.tenant_id = tenant_id === null || tenant_id === 'null' || tenant_id === '' ? null : parseInt(tenant_id);
    }
    
    if (tenant_gender !== undefined) {
      processedData.tenant_gender = tenant_gender === null || tenant_gender === 'null' || tenant_gender === '' ? null : tenant_gender;
    }
    
    if (is_available !== undefined) {
      // Convert string 'true'/'false' to boolean
      if (is_available === 'true' || is_available === true) {
        processedData.is_available = true;
      } else if (is_available === 'false' || is_available === false) {
        processedData.is_available = false;
      } else {
        processedData.is_available = Boolean(is_available);
      }
    }
    
    if (vacate_reason !== undefined) {
      processedData.vacate_reason = vacate_reason;
    }
    
    console.log('Processed data:', processedData);
    
    // Call model function - IMPORTANT: Use RoomModel.updateBedAssignment
    const result = await RoomModel.updateBedAssignment(id, processedData);
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
    
  } catch (err) {
    console.error("[CONTROLLER] updateBedAssignment error:", err.message);
    
    let status = 400;
    let message = err.message;
    
    if (err.message.includes('not found')) status = 404;
    if (err.message.includes('No fields')) status = 400;
    
    res.status(status).json({
      success: false,
      message: message
    });
  }
},

// Vacate bed with reason - POST /api/rooms/bed-assignments/:id/vacate
async vacateBed(req, res) {
  try {
    const { id } = req.params; // bed assignment ID
    const { reason } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Bed assignment ID is required"
      });
    }
    
    // Call model function - IMPORTANT: Use RoomModel.vacateBed
    const result = await RoomModel.vacateBed(id, reason);
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
    
  } catch (err) {
    console.error("vacateBed error:", err);
    res.status(500).json({
      success: false,
      message: `Failed to vacate bed: ${err.message}`
    });
  }
},

// Get available beds - GET /api/rooms/:id/available-beds
async getAvailableBeds(req, res) {
  try {
    const { id } = req.params;
    const { gender } = req.query;
    
    console.log(`[CONTROLLER] getAvailableBeds for room ${id}, gender: ${gender}`);
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required"
      });
    }
    
    const availableBeds = await RoomModel.getAvailableBeds(parseInt(id), gender);
    
    res.json({
      success: true,
      data: availableBeds
    });
    
  } catch (err) {
    console.error("[CONTROLLER] getAvailableBeds error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available beds"
    });
  }
},
 
// In your tenantController.js
async getTenantsForBedAssignment(req, res) {
  try {
    const { 
      is_active = true, 
      portal_access_enabled = true,
      gender,
      couple_only 
    } = req.query;
    
    let query = `
      SELECT 
        id, 
        full_name, 
        email, 
        phone, 
        gender, 
        is_active, 
        portal_access_enabled,
        couple_id
      FROM tenants 
      WHERE is_active = ? 
      AND portal_access_enabled = ?
    `;
    
    const params = [is_active, portal_access_enabled];
    
    // Optional filters
    if (gender) {
      query += ` AND gender = ?`;
      params.push(gender);
    }
    
    if (couple_only === 'true') {
      query += ` AND couple_id IS NOT NULL`;
    }
    
    query += ` ORDER BY 
      CASE WHEN couple_id IS NOT NULL THEN 0 ELSE 1 END, 
      full_name ASC`;
    
    const [tenants] = await db.query(query, params);
    
    res.json({
      success: true,
      data: tenants
    });
    
  } catch (err) {
    console.error("getTenantsForBedAssignment error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tenants"
    });
  }
},

// Vacate bed with reason
// async vacateBed(req, res) {
//   try {
//     const { id } = req.params; // bed assignment ID
//     const { reason } = req.body;
    
//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "Bed assignment ID is required"
//       });
//     }
    
//     const result = await RoomModel.vacateBed(id, reason);
    
//     res.json({
//       success: true,
//       message: result.message,
//       data: result.data
//     });
    
//   } catch (err) {
//     console.error("vacateBed error:", err);
//     res.status(500).json({
//       success: false,
//       message: `Failed to vacate bed: ${err.message}`
//     });
//   }
// },

// In your tenant controller
async testTenants(req, res) {
  try {
    const [tenants] = await db.query(
      `SELECT id, full_name, gender, phone, email, is_active 
       FROM tenants 
       WHERE is_active = 1 
       LIMIT 20`
    );
    
    res.json({
      success: true,
      count: tenants.length,
      tenants: tenants
    });
    
  } catch (err) {
    console.error("testTenants error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tenants"
    });
  }
},

 async getAvailableBedsForRoom(req, res) {
        try {
            const tenant_id = req.user?.id;
            const roomId = req.params.roomId;
            
            if (!tenant_id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (!roomId || isNaN(roomId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid room ID is required'
                });
            }

            console.log(`🛏️ Getting available beds for room ID: ${roomId}`);

            // Get all beds for the room
            const [allBeds] = await db.query(
                `SELECT ba.bed_number 
                 FROM bed_assignments ba
                 WHERE ba.room_id = ?`,
                [roomId]
            );

            // Get occupied beds
            const [occupiedBeds] = await db.query(
                `SELECT ba.bed_number 
                 FROM bed_assignments ba
                 WHERE ba.room_id = ? AND ba.is_available = 0`,
                [roomId]
            );

            // Get room total beds count
            const [roomInfo] = await db.query(
                `SELECT total_bed FROM rooms WHERE id = ?`,
                [roomId]
            );

            if (roomInfo.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Room not found'
                });
            }

            const totalBeds = roomInfo[0].total_bed;
            const occupiedBedNumbers = occupiedBeds.map(bed => bed.bed_number);
            
            // Generate all possible bed numbers (1 to total_beds)
            const allPossibleBeds = Array.from({ length: totalBeds }, (_, i) => i + 1);
            
            // Filter out occupied beds
            const availableBeds = allPossibleBeds.filter(
                bedNumber => !occupiedBedNumbers.includes(bedNumber)
            );

            console.log(`✅ Found ${availableBeds.length} available beds out of ${totalBeds} total beds`);

            res.json({
                success: true,
                data: availableBeds,
                roomInfo: {
                    totalBeds: totalBeds,
                    occupiedBeds: occupiedBedNumbers.length,
                    availableBeds: availableBeds.length
                }
            });

        } catch (err) {
            console.error('🔥 Error getting available beds:', err);
            res.status(500).json({
                success: false,
                message: err.message || 'Internal server error'
            });
        }
    },


// In RoomController.js, replace these methods:

// Bulk update rooms - POST /api/rooms/bulk-update
// Bulk update rooms - POST /api/rooms/bulk-update
async bulkUpdateRooms(req, res) {
  try {
    const { room_ids, action } = req.body;

    if (!room_ids || !Array.isArray(room_ids) || room_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one room"
      });
    }

    if (!['activate', 'inactivate', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be: activate, inactivate, or delete"
      });
    }

    // Call model method
    const result = await RoomModel.bulkUpdate(room_ids, action);

    res.json({
      success: true,
      message: result.message,
      affectedRows: result.affectedRows,
      updatedRooms: result.updatedRooms // Send updated rooms back to client
    });

  } catch (err) {
    console.error("bulkUpdateRooms error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to perform bulk action"
    });
  }
},

// Get room filters data - GET /api/rooms/filters/data
async getRoomFiltersData(req, res) {
  try {
    const data = await RoomModel.getRoomFiltersData();
    
    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    console.error("getRoomFiltersData error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch filter data: " + err.message
    });
  }
},

// Get filtered rooms - POST /api/rooms/filter
async getFilteredRooms(req, res) {
  try {
    const filters = req.body;
    
    // Call model method instead of using db directly
    const result = await RoomModel.getFilteredRooms(filters);

    res.json({
      success: true,
      data: result.rooms,
      pagination: result.pagination
    });

  } catch (err) {
    console.error("getFilteredRooms error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch filtered rooms: " + err.message
    });
  }
}

}

module.exports = RoomController;