// controllers.roomController.js
const RoomModel = require('../models/roomModel');
const multer = require("multer");
const XLSX = require('xlsx');
const db = require("../config/db");
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




async createRoom(req, res) {
  try {
    const body = req.body || {};

    console.log("Received body:", body); // Add this to debug
       console.log("Raw beds_config from body:", body.beds_config); // Add this debug line
    const {
      property_id,
      room_number,
      sharing_type,
      room_type, // Make sure this is included in destructuring
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
      is_active = true,
      beds_config = "[]"
    } = body;

    console.log("Destructured room_type:", room_type); // Add this to debug

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
          url: file.path,
          label: photoLabels[index] || "Room View"
        });
      });
    }

    // Video
    let video_url = null;
    if (req.compressedVideo) {
      video_url = req.compressedVideo.path;
    }

     console.log("beds_config extracted:", beds_config);

    // Parse beds_config - with better error handling
    let bedsConfigArray = [];
    if (beds_config) {
      try {
        // If it's already a string, parse it
        if (typeof beds_config === 'string') {
          bedsConfigArray = JSON.parse(beds_config);
        } 
        // If it's already an object, use it directly
        else if (Array.isArray(beds_config)) {
          bedsConfigArray = beds_config;
        }
        console.log("Parsed beds_config array:", bedsConfigArray);
      } catch (e) {
        console.error("Error parsing beds_config:", e);
        bedsConfigArray = [];
      }
    }

    console.log("Creating room with data:", {
      property_id,
      room_number,
      sharing_type,
      room_type, // This should now show 'corner room'
      total_beds,
      floor,
      rent_per_bed,
      room_gender_preference,
       beds_config: bedsConfigArray 
    });

    const roomId = await RoomModel.create({
      property_id: parseInt(property_id),
      room_number,
      sharing_type,
      room_type: room_type || 'standard', // Make sure this is passed correctly
      total_beds: parseInt(total_beds),
      occupied_beds: parseInt(occupied_beds),
      floor: floor.toString(),
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
      is_active: is_active === "true" || is_active === true,
      beds_config: bedsConfigArray 
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
},



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

     // Parse beds_config
    let bedsConfigArray = [];
    if (body.beds_config) {
      try {
        bedsConfigArray = JSON.parse(body.beds_config);
        console.log("Parsed beds_config for update:", bedsConfigArray);
      } catch (e) {
        console.error("Error parsing beds_config for update:", e);
      }
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

      room_type: body.room_type !== undefined 
  ? body.room_type 
  : existingRoom.room_type,

      total_beds: body.total_beds !== undefined 
        ? parseInt(body.total_beds) 
        : existingRoom.total_beds,

      occupied_beds: body.occupied_beds !== undefined 
        ? parseInt(body.occupied_beds) 
        : existingRoom.occupied_beds,

      floor: body.floor !== undefined 
  ? body.floor.toString() 
  : existingRoom.floor?.toString() || '',

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

      video_url,
        beds_config: bedsConfigArray
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
},


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
    const { room_id, bed_number, tenant_id, tenant_gender, tenant_rent, is_couple } = req.body;
    
    console.log('[CONTROLLER] assignBed request - FULL BODY:', req.body);
    console.log('[CONTROLLER] tenant_rent received:', tenant_rent, 'type:', typeof tenant_rent);
    console.log('[CONTROLLER] is_couple received:', is_couple, 'type:', typeof is_couple);
    
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
    
    // Parse tenant_rent - handle different formats
    let customRent = null;
    if (tenant_rent !== undefined && tenant_rent !== null && tenant_rent !== '') {
      customRent = parseFloat(tenant_rent);
      if (isNaN(customRent)) {
        customRent = null;
      }
    }
    
    // Parse is_couple - handle different formats
    let coupleStatus = false;
    if (is_couple !== undefined && is_couple !== null) {
      if (typeof is_couple === 'boolean') {
        coupleStatus = is_couple;
      } else if (typeof is_couple === 'string') {
        coupleStatus = is_couple === 'true' || is_couple === '1';
      } else if (typeof is_couple === 'number') {
        coupleStatus = is_couple === 1;
      }
    }
    
    console.log('[CONTROLLER] Processed values:', {
      roomId,
      bedNumber,
      tenantId,
      tenant_gender,
      customRent,
      coupleStatus
    });
    
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
    
    // Call model function with new parameters
    const result = await RoomModel.assignBed(roomId, bedNumber, tenantId, tenant_gender, customRent, coupleStatus);
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
    
  } catch (err) {
    console.error("[CONTROLLER] assignBed error:", err.message);
    console.error("[CONTROLLER] Full error:", err);
    
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



// controllers/roomController.js - Fix the updateBedAssignment method

async updateBedAssignment(req, res) {
  try {
    const { id } = req.params; // bed assignment ID
    const { tenant_id, tenant_gender, is_available, vacate_reason, tenant_rent, is_couple } = req.body;
    
    console.log('[CONTROLLER] updateBedAssignment FULL BODY:', req.body);
    console.log('[CONTROLLER] tenant_rent received:', tenant_rent, 'type:', typeof tenant_rent);
    console.log('[CONTROLLER] is_couple received:', is_couple, 'type:', typeof is_couple);
    
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
      if (is_available === 'true' || is_available === true || is_available === 1 || is_available === '1') {
        processedData.is_available = true;
      } else if (is_available === 'false' || is_available === false || is_available === 0 || is_available === '0') {
        processedData.is_available = false;
      } else {
        processedData.is_available = Boolean(is_available);
      }
    }
    
    if (vacate_reason !== undefined) {
      processedData.vacate_reason = vacate_reason;
    }
    
    // FIX: Add tenant_rent to processedData
    if (tenant_rent !== undefined) {
      // Handle null/empty values
      if (tenant_rent === null || tenant_rent === '' || tenant_rent === 'null') {
        processedData.tenant_rent = null;
      } else {
        // Convert to number
        const rentValue = parseFloat(tenant_rent);
        processedData.tenant_rent = isNaN(rentValue) ? null : rentValue;
      }
      console.log('[CONTROLLER] Processed tenant_rent:', processedData.tenant_rent);
    }
    
    // FIX: Add is_couple to processedData
    if (is_couple !== undefined) {
      // Convert various formats to boolean
      if (is_couple === true || is_couple === 'true' || is_couple === 1 || is_couple === '1') {
        processedData.is_couple = true;
      } else if (is_couple === false || is_couple === 'false' || is_couple === 0 || is_couple === '0') {
        processedData.is_couple = false;
      } else {
        processedData.is_couple = Boolean(is_couple);
      }
      console.log('[CONTROLLER] Processed is_couple:', processedData.is_couple);
    }
    
    console.log('[CONTROLLER] Final processed data:', processedData);
    
    // Call model function
    const result = await RoomModel.updateBedAssignment(id, processedData);
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
    
  } catch (err) {
    console.error("[CONTROLLER] updateBedAssignment error:", err.message);
    console.error("[CONTROLLER] Full error:", err);
    
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
},

 async import(req, res) {
    try {
      console.log("📥 Room import request received");
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      console.log("📁 File received:", req.file.originalname);

      // Read Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`📊 Found ${data.length} rows in Excel`);

      const created = [];
      const errors = [];

      // Get all properties for validation
      const [properties] = await db.query(`SELECT id, name FROM properties WHERE is_active = 1`);

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // +2 for header row

        console.log(`🔍 Processing row ${rowNum}:`, row);

        try {
          // Validate required fields
          const propertyId = row['Property ID'] || row['property_id'] || row['PROPERTY ID'];
          const propertyName = row['Property Name'] || row['property_name'];
          const roomNumber = row['Room Number'] || row['room_number'];
          const sharingType = row['Sharing Type'] || row['sharing_type'];
          const totalBeds = row['Total Beds'] || row['total_beds'];
          const rentPerBed = row['Rent Per Bed'] || row['rent_per_bed'];

          if (!propertyId && !propertyName) {
            errors.push(`Row ${rowNum}: Either Property ID or Property Name is required`);
            continue;
          }

          // Find property ID if only name is provided
          let finalPropertyId = propertyId;
          if (!finalPropertyId && propertyName) {
            const property = properties.find(p => 
              p.name.toLowerCase().includes(propertyName.toLowerCase())
            );
            if (property) {
              finalPropertyId = property.id;
            } else {
              errors.push(`Row ${rowNum}: Property "${propertyName}" not found`);
              continue;
            }
          }

          if (!roomNumber) {
            errors.push(`Row ${rowNum}: Room Number is required`);
            continue;
          }

          if (!sharingType) {
            errors.push(`Row ${rowNum}: Sharing Type is required`);
            continue;
          }

          if (!totalBeds) {
            errors.push(`Row ${rowNum}: Total Beds is required`);
            continue;
          }

          if (!rentPerBed) {
            errors.push(`Row ${rowNum}: Rent Per Bed is required`);
            continue;
          }

          // Parse amenities
          let amenities = [];
          const amenitiesStr = row['Amenities'] || row['amenities'] || '';
          if (amenitiesStr) {
            amenities = amenitiesStr.split(',').map(a => a.trim()).filter(a => a);
          }

          // Parse gender preference
          let genderPreference = [];
          const genderPref = row['Gender Preference'] || row['gender_preference'] || 'any';
          if (genderPref) {
            if (genderPref.includes(',')) {
              genderPreference = genderPref.split(',').map(g => g.trim());
            } else {
              genderPreference = [genderPref.trim()];
            }
          }

          // Parse boolean fields
          const hasAttachedBathroom = (row['Has Attached Bathroom'] || row['has_attached_bathroom'] || 'No').toString().toLowerCase() === 'yes';
          const hasBalcony = (row['Has Balcony'] || row['has_balcony'] || 'No').toString().toLowerCase() === 'yes';
          const hasAC = (row['Has AC'] || row['has_ac'] || 'No').toString().toLowerCase() === 'yes';
          const allowCouples = (row['Allow Couples'] || row['allow_couples'] || 'No').toString().toLowerCase() === 'yes';
          
          // Parse status
          const status = row['Status'] || row['status'] || 'Active';
          const isActive = status.toString().toLowerCase() === 'active';

          // Prepare room data
          const roomData = {
            property_id: parseInt(finalPropertyId),
            room_number: roomNumber.toString().trim(),
            sharing_type: sharingType.toString().toLowerCase().trim(),
            room_type: (row['Room Type'] || row['room_type'] || 'Standard').toString().trim(),
            total_beds: parseInt(totalBeds),
            floor: (row['Floor'] || row['floor'] || '1').toString().trim(),
            rent_per_bed: parseFloat(rentPerBed),
            has_attached_bathroom: hasAttachedBathroom,
            has_balcony: hasBalcony,
            has_ac: hasAC,
            amenities: amenities,
            room_gender_preference: genderPreference,
            allow_couples: allowCouples,
            description: (row['Description'] || row['description'] || '').toString().trim(),
            is_active: isActive,
            occupied_beds: 0,
            photo_urls: [],
            video_url: null
          };

          console.log(`✅ Creating room:`, roomData);

          // Create room
          const roomId = await RoomModel.create(roomData);

          created.push({
            id: roomId,
            room_number: roomData.room_number,
            property_id: roomData.property_id
          });

        } catch (err) {
          console.error(`❌ Error processing row ${rowNum}:`, err);
          errors.push(`Row ${rowNum}: ${err.message}`);
        }
      }

      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
        console.log("✅ Temporary file deleted");
      } catch (err) {
        console.error("Error deleting temp file:", err);
      }

      console.log(`📊 Import complete: ${created.length} created, ${errors.length} errors`);

      return res.json({
        success: true,
        message: `Successfully imported ${created.length} rooms`,
        count: created.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error("❌ Import error:", error);
      
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }

      return res.status(500).json({
        success: false,
        message: "Failed to import rooms",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }


}

module.exports = RoomController;