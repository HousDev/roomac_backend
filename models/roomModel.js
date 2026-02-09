// // models/roomModel.js
// const db = require('../config/db');
// const path = require('path');
// const fs = require('fs');

// const RoomModel = {
//   async findAll() {
//     try {
//       const [rows] = await db.query(`
//         SELECT 
//           r.id,
//           r.property_id,
//           p.name AS property_name,
//           p.address AS property_address,
//           p.city_id AS property_city_id,
//           r.room_number,
//           r.sharing_type,
//           r.room_type,
//           r.total_bed,
//           r.occupied_beds,
//           r.floor,
//           r.rent_per_bed,
//           r.has_attached_bathroom,
//           r.has_balcony,
//           r.has_ac,
//           r.amenities,
//           r.photo_urls,
//           r.video_url,
//           r.room_gender_preference,  
//           r.room_gender_preference,
//           r.current_occupants_gender,
//           r.allow_couples,
//           r.is_active,
//           r.description,
//           -- Bed assignments data
//           (
//             SELECT COUNT(*) 
//             FROM bed_assignments ba 
//             WHERE ba.room_id = r.id AND ba.is_available = FALSE
//           ) as current_occupants_count,
//           (
//             SELECT JSON_ARRAYAGG(ba.tenant_gender)
//             FROM bed_assignments ba 
//             WHERE ba.room_id = r.id AND ba.is_available = FALSE
//           ) as current_genders,
//           (
//             SELECT JSON_ARRAYAGG(
//               JSON_OBJECT(
//                 'id', ba.id,
//                 'bed_number', ba.bed_number,
//                 'tenant_gender', ba.tenant_gender,
//                 'is_available', ba.is_available,
//                 'tenant_id', ba.tenant_id
//               )
//             )
//             FROM bed_assignments ba 
//             WHERE ba.room_id = r.id
//             ORDER BY ba.bed_number
//           ) as bed_assignments_json
//         FROM rooms r
//         JOIN properties p ON p.id = r.property_id
//         ORDER BY r.id DESC
//       `);

//       return rows.map(room => {
//   // Helper function to safely parse JSON or handle already-parsed objects
//   const safeJsonParse = (data) => {
//     if (!data) return [];
//     if (typeof data === 'string') {
//       try {
//         return JSON.parse(data);
//       } catch (e) {
//         console.error("JSON parse error:", e, "Data:", data);
//         return [];
//       }
//     }
//     // If it's already an object/array, return it
//     if (typeof data === 'object') return data;
//     return [];
//   };

//   return {
//     ...room,
//     amenities: safeJsonParse(room.amenities),
//     photo_urls: safeJsonParse(room.photo_urls),
//     current_occupants_gender: safeJsonParse(room.current_occupants_gender),
//     current_genders: safeJsonParse(room.current_genders),
//     room_gender_preference: safeJsonParse(room.room_gender_preference), // Parse as array
//     bed_assignments: room.bed_assignments_json ? safeJsonParse(room.bed_assignments_json) : []
//   };
// });
//     } catch (err) {
//       console.error("RoomModel findAll error", err);
//       throw err;
//     }
//   },

//   async findById(id) {
//     try {
//       const [rows] = await db.query(`
//         SELECT 
//           r.*,
//           p.name AS property_name,
//           p.address AS property_address,
//           p.city_id AS property_city_id,
//           (
//             SELECT JSON_ARRAYAGG(
//               JSON_OBJECT(
//                 'id', ba.id,
//                 'bed_number', ba.bed_number,
//                 'tenant_gender', ba.tenant_gender,
//                 'is_available', ba.is_available,
//                 'tenant_id', ba.tenant_id
//               )
//             )
//             FROM bed_assignments ba 
//             WHERE ba.room_id = r.id
//             ORDER BY ba.bed_number
//           ) as bed_assignments_json
//         FROM rooms r
//         JOIN properties p ON p.id = r.property_id
//         WHERE r.id = ?
//         LIMIT 1
//       `, [id]);
      
//       if (rows.length === 0) return null;
      
//       const room = rows[0];
//       return {
//         ...room,
//         amenities: room.amenities ? JSON.parse(room.amenities) : [],
//         photo_urls: room.photo_urls ? JSON.parse(room.photo_urls) : [],
//         current_occupants_gender: room.current_occupants_gender ? JSON.parse(room.current_occupants_gender) : [],
//         room_gender_preference: safeJsonParse(room.room_gender_preference), // Parse as array
//         bed_assignments: room.bed_assignments_json ? JSON.parse(room.bed_assignments_json) : []
//       };
//     } catch (err) {
//       console.error("RoomModel.findById error:", err);
//       throw err;
//     }
//   },

//   async create(room) {
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
//         amenities = [],
//         photo_urls = [],
//         video_url = null,
//         room_gender_preference = ['any'], // Default to array with 'any'
//         allow_couples = false,
//         description = '',
//         is_active = true
//       } = room;

//       let genderPrefArray;
//       if (Array.isArray(room_gender_preference)) {
//         genderPrefArray = room_gender_preference;
//       } else if (typeof room_gender_preference === 'string') {
//         // Handle comma-separated string or single value
//         if (room_gender_preference.includes(',')) {
//           genderPrefArray = room_gender_preference.split(',').map(item => item.trim());
//         } else {
//           genderPrefArray = [room_gender_preference];
//         }
//       } else {
//         genderPrefArray = ['any'];
//       }

//       const [result] = await db.query(
//         `INSERT INTO rooms (
//           property_id,
//           room_number,
//           sharing_type,
//           room_type,
//           total_bed,
//           occupied_beds,
//           floor,
//           rent_per_bed,
//           has_attached_bathroom,
//           has_balcony,
//           has_ac,
//           amenities,
//           photo_urls,
//           video_url,
//           room_gender_preference,
//           allow_couples,
//           description,
//           is_active
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           property_id,
//           room_number,
//           sharing_type,
//           room_type,
//           total_beds,
//           occupied_beds,
//           floor,
//           rent_per_bed,
//           has_attached_bathroom,
//           has_balcony,
//           has_ac,
//           JSON.stringify(amenities),
//           JSON.stringify(photo_urls),
//           video_url,
//           JSON.stringify(genderPrefArray),  // Store as JSON
//           allow_couples,
//           description,
//           is_active
//         ]
//       );

//       const roomId = result.insertId;
      
//       // Create bed assignments for this room
//       await this.createBedAssignments(roomId, total_beds);

//       return roomId;
//     } catch (err) {
//       console.error("RoomModel.create error:", err);
//       throw err;
//     }
//   },

//   async createBedAssignments(roomId, totalBeds) {
//     try {
//       for (let i = 1; i <= totalBeds; i++) {
//         await db.query(
//           `INSERT INTO bed_assignments (room_id, bed_number, is_available) VALUES (?, ?, TRUE)`,
//           [roomId, i]
//         );
//       }
//     } catch (err) {
//       console.error("RoomModel.createBedAssignments error:", err);
//       throw err;
//     }
//   },

//   async assignBed(roomId, bedNumber, tenantId, tenantGender) {
//     try {
//       const [result] = await db.query(
//         `UPDATE bed_assignments 
//          SET tenant_id = ?, tenant_gender = ?, is_available = FALSE 
//          WHERE room_id = ? AND bed_number = ?`,
//         [tenantId, tenantGender, roomId, bedNumber]
//       );

//       // Update current occupants gender in rooms table
//       await this.updateRoomOccupants(roomId);

//       return result.affectedRows > 0;
//     } catch (err) {
//       console.error("RoomModel.assignBed error:", err);
//       throw err;
//     }
//   },

//   async updateRoomOccupants(roomId) {
//     try {
//       const [genders] = await db.query(
//         `SELECT JSON_ARRAYAGG(tenant_gender) as genders
//          FROM bed_assignments 
//          WHERE room_id = ? AND is_available = FALSE`,
//         [roomId]
//       );

//       const genderArray = genders[0]?.genders || [];
//       const occupiedCount = genderArray.length;

//       await db.query(
//         `UPDATE rooms 
//          SET occupied_beds = ?, 
//              current_occupants_gender = ?
//          WHERE id = ?`,
//         [occupiedCount, JSON.stringify(genderArray), roomId]
//       );
//     } catch (err) {
//       console.error("RoomModel.updateRoomOccupants error:", err);
//       throw err;
//     }
//   },

//    async getAvailableBeds(roomId, tenantGender = null) {
//     try {
//       let query = `
//         SELECT ba.*, r.room_gender_preference, r.allow_couples
//         FROM bed_assignments ba
//         JOIN rooms r ON r.id = ba.room_id
//         WHERE ba.room_id = ? AND ba.is_available = TRUE
//       `;
      
//       const params = [roomId];

//       if (tenantGender) {
//         query += ` AND (
//           -- Check if room accepts any gender
//           JSON_CONTAINS(r.room_gender_preference, '"any"')
//           -- Check if room accepts specific gender
//           OR JSON_CONTAINS(r.room_gender_preference, ?)
//           -- Check for couples
//           OR (? = 'Male' AND JSON_CONTAINS(r.room_gender_preference, '"couples"'))
//           OR (? = 'Female' AND JSON_CONTAINS(r.room_gender_preference, '"couples"'))
//         )`;
        
//         const genderParam = JSON.stringify(`"${tenantGender}"`);
//         params.push(genderParam, tenantGender, tenantGender);
//       }

//       const [rows] = await db.query(query, params);
//       return rows;
//     } catch (err) {
//       console.error("RoomModel.getAvailableBeds error:", err);
//       throw err;
//     }
//   },

//    async updateBedAssignment(bedId, data) {
//     try {
//       const { tenant_id, tenant_gender, is_available } = data;
      
//       const [result] = await db.query(
//         `UPDATE bed_assignments 
//          SET tenant_id = ?, tenant_gender = ?, is_available = ?
//          WHERE id = ?`,
//         [tenant_id, tenant_gender, is_available, bedId]
//       );

//       // Update room occupants if bed assignment changed
//       if (tenant_id || tenant_gender || is_available !== undefined) {
//         const [bed] = await db.query('SELECT room_id FROM bed_assignments WHERE id = ?', [bedId]);
//         if (bed.length > 0) {
//           await this.updateRoomOccupants(bed[0].room_id);
//         }
//       }

//       return result.affectedRows > 0;
//     } catch (err) {
//       console.error("RoomModel.updateBedAssignment error:", err);
//       throw err;
//     }
//   },

//   async update(id, room) {
//     try {
//       const existing = await this.findById(id);
//       if (!existing) return false;

//       // ==================== IMPORTANT CHANGE ====================
//       // Handle room_gender_preference - convert to JSON array
//       let genderPrefArray;
//       if (room.room_gender_preference !== undefined) {
//         if (Array.isArray(room.room_gender_preference)) {
//           genderPrefArray = room.room_gender_preference;
//         } else if (typeof room.room_gender_preference === 'string') {
//           if (room.room_gender_preference.includes(',')) {
//             genderPrefArray = room.room_gender_preference.split(',').map(item => item.trim());
//           } else {
//             genderPrefArray = [room.room_gender_preference];
//           }
//         } else {
//           genderPrefArray = existing.room_gender_preference;
//         }
//       } else {
//         genderPrefArray = existing.room_gender_preference;
//       }
//       // =========================================================

//       const updateData = {
//         property_id: room.property_id ?? existing.property_id,
//         room_number: room.room_number ?? existing.room_number,
//         sharing_type: room.sharing_type ?? existing.sharing_type,
//         room_type: room.room_type ?? existing.room_type,
//         total_bed: room.total_beds ?? existing.total_bed,
//         occupied_beds: room.occupied_beds ?? existing.occupied_beds,
//         floor: room.floor ?? existing.floor,
//         rent_per_bed: room.rent_per_bed ?? existing.rent_per_bed,
//         has_attached_bathroom: room.has_attached_bathroom ?? existing.has_attached_bathroom,
//         has_balcony: room.has_balcony ?? existing.has_balcony,
//         has_ac: room.has_ac ?? existing.has_ac,
//         amenities: room.amenities !== undefined ? room.amenities : existing.amenities,
//         photo_urls: room.photo_urls !== undefined ? room.photo_urls : existing.photo_urls,
//         video_url: room.video_url !== undefined ? room.video_url : existing.video_url,
//         video_label: room.video_label !== undefined ? room.video_label : existing.video_label,
//         room_gender_preference: genderPrefArray,  // Use the processed array
//         allow_couples: room.allow_couples ?? existing.allow_couples,
//         description: room.description ?? existing.description,
//         is_active: room.is_active ?? existing.is_active
//       };

//       // Check if bed count changed
//       if (room.total_beds !== undefined && room.total_beds !== existing.total_bed) {
//         await this.syncBedAssignments(id, room.total_beds);
//       }

//       const [result] = await db.query(
//         `UPDATE rooms SET
//           property_id = ?,
//           room_number = ?,
//           sharing_type = ?,
//           room_type = ?,
//           total_bed = ?,
//           occupied_beds = ?,
//           floor = ?,
//           rent_per_bed = ?,
//           has_attached_bathroom = ?,
//           has_balcony = ?,
//           has_ac = ?,
//           amenities = ?,
//           photo_urls = ?,
//           video_url = ?,
//           video_label = ?,
//           room_gender_preference = ?,  // Store as JSON
//           allow_couples = ?,
//           description = ?,
//           is_active = ?
//         WHERE id = ?`,
//         [
//           updateData.property_id,
//           updateData.room_number,
//           updateData.sharing_type,
//           updateData.room_type,
//           updateData.total_bed,
//           updateData.occupied_beds,
//           updateData.floor,
//           updateData.rent_per_bed,
//           updateData.has_attached_bathroom,
//           updateData.has_balcony,
//           updateData.has_ac,
//           JSON.stringify(updateData.amenities),
//           JSON.stringify(updateData.photo_urls),
//           updateData.video_url,
//           updateData.video_label,
//           JSON.stringify(updateData.room_gender_preference),  // Store as JSON
//           updateData.allow_couples,
//           updateData.description,
//           updateData.is_active,
//           id
//         ]
//       );

//       return result.affectedRows > 0;
//     } catch (err) {
//       console.error("RoomModel.update error:", err);
//       throw err;
//     }
//   },


//   async syncBedAssignments(roomId, newTotalBeds) {
//     try {
//       // Get current bed assignments
//       const [currentBeds] = await db.query(
//         'SELECT bed_number FROM bed_assignments WHERE room_id = ? ORDER BY bed_number',
//         [roomId]
//       );

//       const currentBedNumbers = currentBeds.map(bed => bed.bed_number);
//       const newBedNumbers = Array.from({ length: newTotalBeds }, (_, i) => i + 1);

//       // Add new beds if needed
//       const bedsToAdd = newBedNumbers.filter(num => !currentBedNumbers.includes(num));
//       for (const bedNumber of bedsToAdd) {
//         await db.query(
//           'INSERT INTO bed_assignments (room_id, bed_number, is_available) VALUES (?, ?, TRUE)',
//           [roomId, bedNumber]
//         );
//       }

//       // Remove extra beds if needed (only if they're available)
//       const bedsToRemove = currentBedNumbers.filter(num => !newBedNumbers.includes(num));
//       if (bedsToRemove.length > 0) {
//         await db.query(
//           'DELETE FROM bed_assignments WHERE room_id = ? AND bed_number IN (?) AND is_available = TRUE',
//           [roomId, bedsToRemove]
//         );
//       }

//       // Update room occupied beds count
//       const [occupiedCount] = await db.query(
//         'SELECT COUNT(*) as count FROM bed_assignments WHERE room_id = ? AND is_available = FALSE',
//         [roomId]
//       );

//       await db.query(
//         'UPDATE rooms SET occupied_beds = ? WHERE id = ?',
//         [occupiedCount[0].count, roomId]
//       );
//     } catch (err) {
//       console.error("RoomModel.syncBedAssignments error:", err);
//       throw err;
//     }
//   },

//   async delete(id) {
//     try {
//       // Delete bed assignments first (foreign key constraint)
//       await db.query('DELETE FROM bed_assignments WHERE room_id = ?', [id]);
      
//       // Then delete the room
//       const [result] = await db.query('DELETE FROM rooms WHERE id = ?', [id]);
//       return result.affectedRows > 0;
//     } catch (err) {
//       console.error("RoomModel.delete error:", err);
//       throw err;
//     }
//   },

//   async addPhotos(id, newPhotos) {
//     try {
//       const room = await this.findById(id);
//       if (!room) return false;

//       const updatedPhotos = [...room.photo_urls, ...newPhotos];
      
//       const [result] = await db.query(
//         'UPDATE rooms SET photo_urls = ? WHERE id = ?',
//         [JSON.stringify(updatedPhotos), id]
//       );

//       return result.affectedRows > 0;
//     } catch (err) {
//       console.error("RoomModel.addPhotos error:", err);
//       throw err;
//     }
//   },

//   async removePhotos(id, photosToRemove) {
//     try {
//       const room = await this.findById(id);
//       if (!room) return false;

//       const updatedPhotos = room.photo_urls.filter(photo => 
//         !photosToRemove.includes(photo)
//       );
      
//       const [result] = await db.query(
//         'UPDATE rooms SET photo_urls = ? WHERE id = ?',
//         [JSON.stringify(updatedPhotos), id]
//       );

//       return result.affectedRows > 0;
//     } catch (err) {
//       console.error("RoomModel.removePhotos error:", err);
//       throw err;
//     }
//   }
// };

// module.exports = RoomModel;
const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// Helper function to safely parse JSON
const safeJsonParse = (str, defaultValue = []) => {
  if (str === null || str === undefined) return defaultValue;
  
  // If it's already an array or object, return it
  if (Array.isArray(str)) return str;
  if (typeof str === 'object') return str;
  
  // If it's a video URL (string with video extension), return it directly
  if (typeof str === 'string' && 
      (str.includes('.mp4') || str.includes('.webm') || str.includes('.mov') || str.includes('.avi'))) {
    return str;
  }
  
  // If it's not a string, convert to string
  if (typeof str !== 'string') {
    try {
      str = String(str);
    } catch (e) {
      return defaultValue;
    }
  }
  
  // If it's an empty string, return default
  if (str.trim() === '') return defaultValue;
  
  try {
    const parsed = JSON.parse(str);
    // Ensure we always return an array for these fields
    if (Array.isArray(parsed)) return parsed;
    // If it's a single object, wrap it in array
    if (typeof parsed === 'object' && parsed !== null) return [parsed];
    // If it's a string that looks like JSON array, try to parse it
    if (typeof parsed === 'string' && (parsed.startsWith('[') || parsed.startsWith('{'))) {
      try {
        const reParsed = JSON.parse(parsed);
        return Array.isArray(reParsed) ? reParsed : [reParsed];
      } catch (e) {
        return defaultValue;
      }
    }
    // For single values, wrap in array
    return [parsed];
  } catch (error) {
    console.error('JSON parse error:', error.message, 'String:', str);
    return defaultValue;
  }
};

const RoomModel = {
  async findAll() {
    try {
      const [rows] = await db.query(`
        SELECT 
          r.id,
          r.property_id,
          p.name AS property_name,
          p.address AS property_address,
          p.city_id AS property_city_id,
          r.room_number,
          r.sharing_type,
          r.room_type,
          r.total_bed,
          r.occupied_beds,
          r.floor,
          r.rent_per_bed,
          r.has_attached_bathroom,
          r.has_balcony,
          r.has_ac,
          r.amenities,
          r.photo_urls,
          r.video_url,
          r.room_gender_preference,
          r.current_occupants_gender,
          r.allow_couples,
          r.is_active,
          r.description,
          
          (
            SELECT COUNT(*) 
            FROM bed_assignments ba 
            WHERE ba.room_id = r.id AND ba.is_available = FALSE
          ) as current_occupants_count,
          (
            SELECT JSON_ARRAYAGG(ba.tenant_gender)
            FROM bed_assignments ba 
            WHERE ba.room_id = r.id AND ba.is_available = FALSE
          ) as current_genders,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', ba.id,
                'bed_number', ba.bed_number,
                'tenant_gender', ba.tenant_gender,
                'is_available', ba.is_available,
                'tenant_id', ba.tenant_id
              )
            )
            FROM bed_assignments ba 
            WHERE ba.room_id = r.id
            ORDER BY ba.bed_number
          ) as bed_assignments_json
        FROM rooms r
        JOIN properties p ON p.id = r.property_id
        ORDER BY r.id DESC
      `);

      return rows.map(room => ({
        ...room,
        amenities: safeJsonParse(room.amenities),
        photo_urls: safeJsonParse(room.photo_urls),
        current_occupants_gender: safeJsonParse(room.current_occupants_gender),
        current_genders: safeJsonParse(room.current_genders),
        room_gender_preference: safeJsonParse(room.room_gender_preference),
        bed_assignments: room.bed_assignments_json ? safeJsonParse(room.bed_assignments_json) : [],
        video_url: room.video_url ? String(room.video_url) : null // Ensure string format
      }));
    } catch (err) {
      console.error("RoomModel findAll error", err);
      throw err;
    }
  },

  async findById(id) {
    try {
      const [rows] = await db.query(`
        SELECT 
          r.*,
          p.name AS property_name,
          p.address AS property_address,
          p.city_id AS property_city_id,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', ba.id,
                'bed_number', ba.bed_number,
                'tenant_gender', ba.tenant_gender,
                'is_available', ba.is_available,
                'tenant_id', ba.tenant_id
              )
            )
            FROM bed_assignments ba 
            WHERE ba.room_id = r.id
            ORDER BY ba.bed_number
          ) as bed_assignments_json
        FROM rooms r
        JOIN properties p ON p.id = r.property_id
        WHERE r.id = ?
        LIMIT 1
      `, [id]);
      
      if (rows.length === 0) return null;
      
      const room = rows[0];
      
      // Parse JSON fields
      const parsedAmenities = safeJsonParse(room.amenities);
      const parsedPhotoUrls = safeJsonParse(room.photo_urls);
      const parsedOccupantsGender = safeJsonParse(room.current_occupants_gender);
      const parsedGenderPref = safeJsonParse(room.room_gender_preference);
      const parsedBedAssignments = room.bed_assignments_json ? safeJsonParse(room.bed_assignments_json) : [];
      
      return {
        ...room,
        amenities: parsedAmenities,
        photo_urls: parsedPhotoUrls,
        current_occupants_gender: parsedOccupantsGender,
        room_gender_preference: parsedGenderPref,
        bed_assignments: parsedBedAssignments,
        video_url: room.video_url ? String(room.video_url) : null
      };
    } catch (err) {
      console.error("RoomModel.findById error:", err);
      throw err;
    }
  },

async findByPropertyId(propertyId) {
  try {
    const [rows] = await db.query(`
      SELECT 
        r.id,
        r.property_id,
        p.name AS property_name,
        p.address AS property_address,
        p.city_id AS property_city_id,
        r.room_number,
        r.sharing_type,
        r.room_type,
        r.total_bed,
        r.occupied_beds,
        r.floor,
        r.rent_per_bed,
        r.has_attached_bathroom,
        r.has_balcony,
        r.has_ac,
        r.amenities,
        r.photo_urls,
        r.video_url,
        r.room_gender_preference,
        r.current_occupants_gender,
        r.allow_couples,
        r.is_active,
        r.description,
        
        (
          SELECT COUNT(*) 
          FROM bed_assignments ba 
          WHERE ba.room_id = r.id AND ba.is_available = FALSE
        ) as current_occupants_count,
        (
          SELECT JSON_ARRAYAGG(ba.tenant_gender)
          FROM bed_assignments ba 
          WHERE ba.room_id = r.id AND ba.is_available = FALSE
        ) as current_genders,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', ba.id,
              'bed_number', ba.bed_number,
              'tenant_gender', ba.tenant_gender,
              'is_available', ba.is_available,
              'tenant_id', ba.tenant_id
            )
          )
          FROM bed_assignments ba 
          WHERE ba.room_id = r.id
          ORDER BY ba.bed_number
        ) as bed_assignments_json
      FROM rooms r
      JOIN properties p ON p.id = r.property_id
      WHERE r.property_id = ?
      ORDER BY r.floor ASC, r.room_number ASC
    `, [propertyId]);

    return rows.map(room => ({
      ...room,
      amenities: safeJsonParse(room.amenities),
      photo_urls: safeJsonParse(room.photo_urls),
      current_occupants_gender: safeJsonParse(room.current_occupants_gender),
      current_genders: safeJsonParse(room.current_genders),
      room_gender_preference: safeJsonParse(room.room_gender_preference),
      bed_assignments: room.bed_assignments_json ? safeJsonParse(room.bed_assignments_json) : [],
      video_url: room.video_url ? String(room.video_url) : null
    }));
  } catch (err) {
    console.error("RoomModel findByPropertyId error", err);
    throw err;
  }
},


async create(room) {
  try {
    const {
      property_id,
      room_number,
      sharing_type,
      room_type = 'pg',
      total_beds,
      occupied_beds = 0,
      floor = 1,
      rent_per_bed,
      has_attached_bathroom = false,
      has_balcony = false,
      has_ac = false,
      amenities = [],
      photo_urls = [],
      video_url = null,
      room_gender_preference = [], // Changed from ['any']
      allow_couples = false,
      description = '',
      is_active = true
    } = room;

    let genderPrefArray;
    if (Array.isArray(room_gender_preference)) {
      genderPrefArray = room_gender_preference.filter(item => item !== '');
    } else if (typeof room_gender_preference === 'string') {
      if (room_gender_preference.includes(',')) {
        genderPrefArray = room_gender_preference.split(',').map(item => item.trim()).filter(item => item !== '');
      } else {
        genderPrefArray = room_gender_preference.trim() !== '' ? [room_gender_preference] : [];
      }
    } else {
      genderPrefArray = [];
    }

    // Debug log
    console.log("Creating room with gender preferences:", genderPrefArray);

    const [result] = await db.query(
      `INSERT INTO rooms (
        property_id,
        room_number,
        sharing_type,
        room_type,
        total_bed,
        occupied_beds,
        floor,
        rent_per_bed,
        has_attached_bathroom,
        has_balcony,
        has_ac,
        amenities,
        photo_urls,
        video_url,
        room_gender_preference,
        allow_couples,
        description,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        property_id,
        room_number,
        sharing_type,
        room_type,
        total_beds,
        occupied_beds,
        floor,
        rent_per_bed,
        has_attached_bathroom,
        has_balcony,
        has_ac,
        JSON.stringify(amenities),
        JSON.stringify(photo_urls),
        video_url,
        JSON.stringify(genderPrefArray),
        allow_couples,
        description,
        is_active
      ]
    );

    const roomId = result.insertId;
    
    await this.createBedAssignments(roomId, total_beds);

    return roomId;
  } catch (err) {
    console.error("RoomModel.create error:", err);
    throw err;
  }
},

async update(id, room) {
    try {
      const existing = await this.findById(id);
      if (!existing) return false;

      let genderPrefArray;
      if (room.room_gender_preference !== undefined) {
        if (Array.isArray(room.room_gender_preference)) {
          genderPrefArray = room.room_gender_preference.filter(item => item !== '');
        } else if (typeof room.room_gender_preference === 'string') {
          if (room.room_gender_preference.includes(',')) {
            genderPrefArray = room.room_gender_preference.split(',').map(item => item.trim()).filter(item => item !== '');
          } else {
            genderPrefArray = room.room_gender_preference.trim() !== '' ? [room.room_gender_preference] : existing.room_gender_preference;
          }
        } else {
          genderPrefArray = existing.room_gender_preference;
        }
      } else {
        genderPrefArray = existing.room_gender_preference;
      }

      const updateData = {
        property_id: room.property_id ?? existing.property_id,
        room_number: room.room_number ?? existing.room_number,
        sharing_type: room.sharing_type ?? existing.sharing_type,
        room_type: room.room_type ?? existing.room_type,
        total_bed: room.total_beds ?? existing.total_bed,
        occupied_beds: room.occupied_beds ?? existing.occupied_beds,
        floor: room.floor ?? existing.floor,
        rent_per_bed: room.rent_per_bed ?? existing.rent_per_bed,
        has_attached_bathroom: room.has_attached_bathroom ?? existing.has_attached_bathroom,
        has_balcony: room.has_balcony ?? existing.has_balcony,
        has_ac: room.has_ac ?? existing.has_ac,
        amenities: room.amenities !== undefined ? room.amenities : existing.amenities,
        photo_urls: room.photo_urls !== undefined ? room.photo_urls : existing.photo_urls,
        video_url: room.video_url !== undefined ? room.video_url : existing.video_url,
        room_gender_preference: genderPrefArray,
        allow_couples: room.allow_couples ?? existing.allow_couples,
        description: room.description ?? existing.description,
        is_active: room.is_active ?? existing.is_active
      };

      if (room.total_beds !== undefined && room.total_beds !== existing.total_bed) {
        await this.syncBedAssignments(id, room.total_beds);
      }

      const [result] = await db.query(
        `UPDATE rooms SET
          property_id = ?,
          room_number = ?,
          sharing_type = ?,
          room_type = ?,
          total_bed = ?,
          occupied_beds = ?,
          floor = ?,
          rent_per_bed = ?,
          has_attached_bathroom = ?,
          has_balcony = ?,
          has_ac = ?,
          amenities = ?,
          photo_urls = ?,
          video_url = ?,
          room_gender_preference = ?,
          allow_couples = ?,
          description = ?,
          is_active = ?
        WHERE id = ?`,
        [
          updateData.property_id,
          updateData.room_number,
          updateData.sharing_type,
          updateData.room_type,
          updateData.total_bed,
          updateData.occupied_beds,
          updateData.floor,
          updateData.rent_per_bed,
          updateData.has_attached_bathroom,
          updateData.has_balcony,
          updateData.has_ac,
          JSON.stringify(updateData.amenities),
          JSON.stringify(updateData.photo_urls),
          updateData.video_url,
          JSON.stringify(updateData.room_gender_preference),
          updateData.allow_couples,
          updateData.description,
          updateData.is_active,
          id
        ]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error("RoomModel.update error:", err);
      throw err;
    }
  },

  async createBedAssignments(roomId, totalBeds) {
    try {
      for (let i = 1; i <= totalBeds; i++) {
        await db.query(
          `INSERT INTO bed_assignments (room_id, bed_number, is_available) VALUES (?, ?, TRUE)`,
          [roomId, i]
        );
      }
    } catch (err) {
      console.error("RoomModel.createBedAssignments error:", err);
      throw err;
    }
  },

// async assignBed(roomId, bedNumber, tenantId, tenantGender) {
//   let connection;
//   try {
//     connection = await db.getConnection();
//     await connection.beginTransaction();
    
//     console.log(`[DEBUG] assignBed: room=${roomId}, bed=${bedNumber}, tenant=${tenantId}`);
    
//     // 1. Check tenant's current status first
//     const [tenantAssignments] = await connection.query(
//       `SELECT 
//         ba.room_id,
//         ba.bed_number,
//         ba.is_available,
//         r.room_number,
//         p.name as property_name
//        FROM bed_assignments ba
//        JOIN rooms r ON r.id = ba.room_id
//        JOIN properties p ON p.id = r.property_id
//        WHERE ba.tenant_id = ?`,
//       [tenantId]
//     );
    
//     console.log(`[DEBUG] Tenant ${tenantId} has ${tenantAssignments.length} assignments:`);
//     tenantAssignments.forEach(a => {
//       console.log(`  - Room ${a.room_id} (${a.property_name}), Bed ${a.bed_number}, Available: ${a.is_available}`);
//     });
    
//     // Check if tenant has any active (non-available) assignments
//     const activeAssignments = tenantAssignments.filter(a => !a.is_available);
    
//     if (activeAssignments.length > 0) {
//       const assignment = activeAssignments[0];
//       throw new Error(`Tenant ${tenantId} is currently assigned to bed ${assignment.bed_number} in room ${assignment.room_number} (${assignment.property_name}). Please vacate that bed first.`);
//     }
    
//     // 2. Get room info
//     const [rooms] = await connection.query(
//       `SELECT id, room_number, total_bed, occupied_beds, room_gender_preference 
//        FROM rooms WHERE id = ? FOR UPDATE`,
//       [roomId]
//     );
    
//     if (rooms.length === 0) {
//       throw new Error(`Room ${roomId} not found`);
//     }
    
//     const room = rooms[0];
    
//     // 3. Validate bed number
//     if (bedNumber > room.total_bed) {
//       throw new Error(`Room ${room.room_number} only has ${room.total_bed} bed(s). Cannot assign bed ${bedNumber}`);
//     }
    
//     // 4. Check if room is full
//     if (room.occupied_beds >= room.total_bed) {
//       throw new Error(`Room ${room.room_number} is full (${room.occupied_beds}/${room.total_bed} beds occupied)`);
//     }
    
//     // 5. Check gender compatibility
//     let genderPreferences = ['any'];
//     try {
//       if (room.room_gender_preference) {
//         genderPreferences = JSON.parse(room.room_gender_preference);
//       }
//     } catch (e) {
//       console.log(`[WARN] Could not parse gender preferences`);
//     }
    
//     const isGenderCompatible = 
//       genderPreferences.includes('any') ||
//       genderPreferences.includes(tenantGender) ||
//       (tenantGender === 'Male' && genderPreferences.includes('couples')) ||
//       (tenantGender === 'Female' && genderPreferences.includes('couples'));
    
//     if (!isGenderCompatible) {
//       throw new Error(`Room ${room.room_number} accepts: ${genderPreferences.join(', ')}. Cannot assign ${tenantGender} tenant`);
//     }
    
//     // 6. Check the specific bed
//     const [beds] = await connection.query(
//       `SELECT id, is_available, tenant_id 
//        FROM bed_assignments 
//        WHERE room_id = ? AND bed_number = ?`,
//       [roomId, bedNumber]
//     );
    
//     let bedId;
    
//     if (beds.length === 0) {
//       // Create bed if it doesn't exist
//       console.log(`[INFO] Creating bed ${bedNumber} for room ${roomId}`);
      
//       const [result] = await connection.query(
//         `INSERT INTO bed_assignments (room_id, bed_number, tenant_id, tenant_gender, is_available) 
//          VALUES (?, ?, ?, ?, FALSE)`,
//         [roomId, bedNumber, tenantId, tenantGender]
//       );
      
//       bedId = result.insertId;
      
//     } else {
//       const bed = beds[0];
//       bedId = bed.id;
      
//       if (!bed.is_available) {
//         // Check who's occupying it
//         const [occupant] = await connection.query(
//           `SELECT t.full_name, t.phone 
//            FROM tenants t 
//            WHERE t.id = ?`,
//           [bed.tenant_id]
//         );
        
//         const occupantName = occupant.length > 0 ? occupant[0].full_name : `ID ${bed.tenant_id}`;
//         throw new Error(`Bed ${bedNumber} is occupied by ${occupantName}`);
//       }
      
//       // Update the bed
//       const [updateResult] = await connection.query(
//         `UPDATE bed_assignments 
//          SET tenant_id = ?, tenant_gender = ?, is_available = FALSE 
//          WHERE id = ?`,
//         [tenantId, tenantGender, bedId]
//       );
      
//       if (updateResult.affectedRows === 0) {
//         throw new Error(`Failed to update bed ${bedNumber}`);
//       }
//     }
    
//     // 7. Update room occupancy
//     await this.updateRoomOccupants(roomId, connection);
    
//     // 8. Get updated info for response
//     const [updatedRoom] = await connection.query(
//       `SELECT room_number, occupied_beds, total_bed 
//        FROM rooms WHERE id = ?`,
//       [roomId]
//     );
    
//     const [tenantInfo] = await connection.query(
//       `SELECT full_name FROM tenants WHERE id = ?`,
//       [tenantId]
//     );
    
//     const tenantName = tenantInfo.length > 0 ? tenantInfo[0].full_name : `ID ${tenantId}`;
    
//     await connection.commit();
//     connection.release();
    
//     const message = `Assigned ${tenantName} to bed ${bedNumber} in room ${updatedRoom[0]?.room_number || roomId}`;
    
//     return {
//       success: true,
//       message: message,
//       data: {
//         bed_assignment_id: bedId,
//         room_number: updatedRoom[0]?.room_number || roomId,
//         bed_number: bedNumber,
//         tenant_name: tenantName,
//         occupancy: `${updatedRoom[0]?.occupied_beds || 0}/${updatedRoom[0]?.total_bed || room.total_bed}`
//       }
//     };
    
//   } catch (error) {
//     if (connection) {
//       try {
//         await connection.rollback();
//       } catch (rollbackErr) {
//         console.error("[ERROR] Rollback failed:", rollbackErr);
//       }
//       connection.release();
//     }
    
//     console.error("[ERROR] assignBed failed:", error.message);
//     throw error;
//   }
// },



// Add this to your RoomModel for debugging
async findTenantAssignment(tenantId) {
  try {
    const [assignments] = await db.query(
      `SELECT 
        ba.id,
        ba.room_id,
        ba.bed_number,
        ba.tenant_gender,
        ba.is_available,
        r.room_number,
        p.name as property_name
       FROM bed_assignments ba
       JOIN rooms r ON r.id = ba.room_id
       JOIN properties p ON p.id = r.property_id
       WHERE ba.tenant_id = ?`,
      [tenantId]
    );
    
    return assignments;
  } catch (err) {
    console.error("findTenantAssignment error:", err);
    throw err;
  }
},

// Add this to RoomModel
async debugRoomBeds(roomId) {
  try {
    const [beds] = await db.query(
      `SELECT 
        ba.id,
        ba.bed_number,
        ba.is_available,
        ba.tenant_id,
        ba.tenant_gender,
        r.total_bed,
        r.occupied_beds
      FROM rooms r
      LEFT JOIN bed_assignments ba ON ba.room_id = r.id
      WHERE r.id = ?
      ORDER BY ba.bed_number`,
      [roomId]
    );
    
    return {
      roomId,
      totalBedsExpected: beds[0]?.total_bed || 0,
      beds: beds,
      bedNumbers: beds.map(b => b.bed_number)
    };
  } catch (err) {
    console.error("debugRoomBeds error:", err);
    throw err;
  }
},

// Add this to fix any inconsistencies
async repairBedAssignments(roomId) {
  try {
    console.log(`Repairing bed assignments for room ${roomId}`);
    
    const [room] = await db.query(
      `SELECT id, total_bed FROM rooms WHERE id = ?`,
      [roomId]
    );
    
    if (room.length === 0) {
      throw new Error('Room not found');
    }
    
    const totalBeds = room[0].total_bed;
    const existingBeds = [];
    
    // Get existing bed assignments
    const [currentBeds] = await db.query(
      `SELECT bed_number FROM bed_assignments WHERE room_id = ? ORDER BY bed_number`,
      [roomId]
    );
    
    currentBeds.forEach(bed => existingBeds.push(bed.bed_number));
    
    console.log(`Room should have ${totalBeds} beds, currently has:`, existingBeds);
    
    // Create missing beds
    for (let i = 1; i <= totalBeds; i++) {
      if (!existingBeds.includes(i)) {
        console.log(`Creating missing bed ${i}`);
        await db.query(
          `INSERT INTO bed_assignments (room_id, bed_number, is_available) 
           VALUES (?, ?, TRUE)`,
          [roomId, i]
        );
      }
    }
    
    // Remove extra beds (only if available)
    const bedsToRemove = existingBeds.filter(num => num > totalBeds);
    if (bedsToRemove.length > 0) {
      await db.query(
        `DELETE FROM bed_assignments 
         WHERE room_id = ? AND bed_number IN (?) AND is_available = TRUE`,
        [roomId, bedsToRemove]
      );
      console.log(`Removed extra beds:`, bedsToRemove);
    }
    
    // Update occupied count
    await this.updateRoomOccupants(roomId);
    
    console.log(`Bed assignments repaired for room ${roomId}`);
    return true;
  } catch (err) {
    console.error("repairBedAssignments error:", err);
    throw err;
  }
},

// async updateRoomOccupants(roomId, connection = null) {
//   const conn = connection || db;
  
//   try {
//     console.log(`[DEBUG] updateRoomOccupants for room ${roomId}`);
    
//     // Get current occupied beds count and genders
//     const [result] = await conn.query(
//       `SELECT 
//         COUNT(*) as occupied_count,
//         CASE 
//           WHEN COUNT(tenant_gender) > 0 
//           THEN JSON_ARRAYAGG(tenant_gender)
//           ELSE JSON_ARRAY()
//         END as genders
//        FROM bed_assignments 
//        WHERE room_id = ? AND is_available = FALSE AND tenant_gender IS NOT NULL`,
//       [roomId]
//     );
    
//     const occupiedCount = result[0]?.occupied_count || 0;
//     let genders = result[0]?.genders;
    
//     console.log(`[DEBUG] Occupied count: ${occupiedCount}, Genders:`, genders);
    
//     // Ensure genders is valid JSON array (not null)
//     if (!genders || genders === 'null') {
//       genders = JSON.stringify([]);
//     }
    
//     // Update room
//     const [updateResult] = await conn.query(
//       `UPDATE rooms 
//        SET occupied_beds = ?, 
//            current_occupants_gender = ?
//        WHERE id = ?`,
//       [occupiedCount, genders, roomId]
//     );
    
//     console.log(`[DEBUG] Updated room ${roomId}: ${updateResult.affectedRows} rows affected`);
    
//     return occupiedCount;
    
//   } catch (err) {
//     console.error("[ERROR] updateRoomOccupants error:", err);
    
//     // More detailed error logging
//     if (err.code === 'ER_INVALID_JSON_TEXT') {
//       console.error("[ERROR] Invalid JSON error details:", {
//         roomId,
//         message: err.message,
//         sqlMessage: err.sqlMessage
//       });
//     }
    
//     throw err;
//   }
// },

// async assignBed(roomId, bedNumber, tenantId, tenantGender) {
//   try {
//     console.log(`[ASSIGN] Room: ${roomId}, Bed: ${bedNumber}, Tenant: ${tenantId}, Gender: ${tenantGender}`);
    
//     // 1. Check if room exists and has capacity
//     const [room] = await db.query(
//       `SELECT total_bed, occupied_beds, room_gender_preference 
//        FROM rooms WHERE id = ?`,
//       [roomId]
//     );
    
//     if (room.length === 0) {
//       throw new Error(`Room ${roomId} not found`);
//     }
    
//     const roomData = room[0];
    
//     // Check capacity
//     if (bedNumber > roomData.total_bed) {
//       throw new Error(`Room only has ${roomData.total_bed} beds`);
//     }
    
//     if (roomData.occupied_beds >= roomData.total_bed) {
//       throw new Error('Room is full');
//     }
    
//     // 2. Check if tenant is already assigned elsewhere
//     const [tenantCheck] = await db.query(
//       `SELECT room_id, bed_number FROM bed_assignments 
//        WHERE tenant_id = ? AND is_available = FALSE`,
//       [tenantId]
//     );
    
//     if (tenantCheck.length > 0) {
//       const assign = tenantCheck[0];
//       throw new Error(`Tenant is already in room ${assign.room_id}, bed ${assign.bed_number}`);
//     }
    
//     // 3. Check bed availability
//     const [bedCheck] = await db.query(
//       `SELECT id, is_available FROM bed_assignments 
//        WHERE room_id = ? AND bed_number = ?`,
//       [roomId, bedNumber]
//     );
    
//     let bedId;
    
//     if (bedCheck.length === 0) {
//       // Create bed if doesn't exist
//       const [result] = await db.query(
//         `INSERT INTO bed_assignments (room_id, bed_number, tenant_id, tenant_gender, is_available) 
//          VALUES (?, ?, ?, ?, FALSE)`,
//         [roomId, bedNumber, tenantId, tenantGender]
//       );
//       bedId = result.insertId;
//     } else {
//       const bed = bedCheck[0];
//       if (!bed.is_available) {
//         throw new Error(`Bed ${bedNumber} is already occupied`);
//       }
      
//       bedId = bed.id;
      
//       // Update bed
//       await db.query(
//         `UPDATE bed_assignments 
//          SET tenant_id = ?, tenant_gender = ?, is_available = FALSE 
//          WHERE id = ?`,
//         [tenantId, tenantGender, bedId]
//       );
//     }
    
//     // 4. Update room occupancy
//     await this.updateRoomOccupants(roomId);
    
//     console.log(`[SUCCESS] Assigned bed ${bedNumber} in room ${roomId} to tenant ${tenantId}`);
    
//     return {
//       success: true,
//       message: `Assigned bed ${bedNumber} to tenant ${tenantId}`,
//       bedId: bedId
//     };
    
//   } catch (error) {
//     console.error("[ERROR] assignBed failed:", error.message);
//     throw error;
//   }
// },
// async updateBedAssignment(bedId, data) {
//   let connection;
//   try {
//     connection = await db.getConnection();
    
//     // Start transaction
//     await connection.beginTransaction();
    
//     console.log('\n=== DEBUG updateBedAssignment START ===');
//     console.log('Bed ID:', bedId);
//     console.log('Data received:', JSON.stringify(data, null, 2));
    
//     // 1. Get current bed info WITH ROOM INFO
//     const [bedInfo] = await connection.query(
//       `SELECT 
//         ba.*,
//         r.room_number,
//         r.occupied_beds,
//         r.current_occupants_gender as room_genders
//        FROM bed_assignments ba
//        JOIN rooms r ON r.id = ba.room_id
//        WHERE ba.id = ? FOR UPDATE`,
//       [bedId]
//     );
    
//     if (bedInfo.length === 0) {
//       throw new Error(`Bed assignment ${bedId} not found`);
//     }
    
//     const bed = bedInfo[0];
//     console.log('\nCurrent bed state:');
//     console.log('- Room ID:', bed.room_id);
//     console.log('- Room Number:', bed.room_number);
//     console.log('- Bed Number:', bed.bed_number);
//     console.log('- Current Tenant ID:', bed.tenant_id);
//     console.log('- Current Tenant Gender:', bed.tenant_gender);
//     console.log('- Currently Available:', bed.is_available);
//     console.log('- Room Occupied Beds:', bed.occupied_beds);
//     console.log('- Room Current Genders:', bed.room_genders);
    
//     const { tenant_id, tenant_gender, is_available } = data;
    
//     // 2. Prepare update
//     const updates = [];
//     const values = [];
    
//     if (tenant_id !== undefined) {
//       updates.push('tenant_id = ?');
//       values.push(tenant_id);
//     }
    
//     if (tenant_gender !== undefined) {
//       updates.push('tenant_gender = ?');
//       values.push(tenant_gender);
//     }
    
//     if (is_available !== undefined) {
//       updates.push('is_available = ?');
//       values.push(is_available);
//     }
    
//     if (updates.length === 0) {
//       throw new Error('No fields to update');
//     }
    
//     // Add updated timestamp
//     updates.push('updated_at = CURRENT_TIMESTAMP');
    
//     values.push(bedId);
    
//     // 3. Execute update
//     const query = `UPDATE bed_assignments SET ${updates.join(', ')} WHERE id = ?`;
//     console.log('\nExecuting query:', query);
//     console.log('With values:', values);
    
//     const [result] = await connection.query(query, values);
//     console.log('Rows affected:', result.affectedRows);
    
//     if (result.affectedRows === 0) {
//       throw new Error('No rows updated - bed may not exist or data is same');
//     }
    
//     // 4. Get updated bed info
//     const [updatedBed] = await connection.query(
//       `SELECT * FROM bed_assignments WHERE id = ?`,
//       [bedId]
//     );
    
//     console.log('\nBed after update:');
//     console.log(updatedBed[0]);
    
//     // 5. Update room occupants (always do this when bed assignment changes)
//     console.log('\nUpdating room occupancy for room:', bed.room_id);
//     await this.updateRoomOccupants(bed.room_id, connection);
    
//     // 6. Commit transaction
//     await connection.commit();
    
//     console.log('\n=== DEBUG updateBedAssignment SUCCESS ===');
    
//     return {
//       success: true,
//       message: 'Bed assignment updated successfully',
//       data: {
//         bed_assignment_id: bedId,
//         room_id: bed.room_id,
//         room_number: bed.room_number,
//         bed_number: bed.bed_number,
//         previous_tenant: bed.tenant_id,
//         new_tenant: tenant_id
//       }
//     };
    
//   } catch (error) {
//     console.error('\n=== DEBUG updateBedAssignment ERROR ===');
//     console.error('Error:', error.message);
//     console.error('Stack:', error.stack);
    
//     if (connection) {
//       try {
//         await connection.rollback();
//         console.log('Transaction rolled back');
//       } catch (rollbackErr) {
//         console.error('Rollback failed:', rollbackErr);
//       }
//       connection.release();
//     }
    
//     throw error;
//   }
// },

// async updateRoomOccupants(roomId) {
//   try {
//     // Get count of occupied beds
//     const [countResult] = await db.query(
//       `SELECT COUNT(*) as count 
//        FROM bed_assignments 
//        WHERE room_id = ? AND is_available = FALSE`,
//       [roomId]
//     );
    
//     const occupied = countResult[0].count;
    
//     // Get genders
//     const [gendersResult] = await db.query(
//       `SELECT tenant_gender 
//        FROM bed_assignments 
//        WHERE room_id = ? AND is_available = FALSE AND tenant_gender IS NOT NULL`,
//       [roomId]
//     );
    
//     const genders = gendersResult.map(row => row.tenant_gender);
//     const gendersJson = JSON.stringify(genders);
    
//     // Update room
//     await db.query(
//       `UPDATE rooms 
//        SET occupied_beds = ?, 
//            current_occupants_gender = ?
//        WHERE id = ?`,
//       [occupied, gendersJson, roomId]
//     );
    
//     return occupied;
    
//   } catch (err) {
//     console.error("updateRoomOccupants error:", err);
//     throw err;
//   }
// },




  async getAvailableBeds(roomId, tenantGender = null) {
    try {
      let query = `
        SELECT ba.*, r.room_gender_preference, r.allow_couples
        FROM bed_assignments ba
        JOIN rooms r ON r.id = ba.room_id
        WHERE ba.room_id = ? AND ba.is_available = TRUE
      `;
      
      const params = [roomId];

      if (tenantGender) {
        query += ` AND (
          JSON_CONTAINS(r.room_gender_preference, '"any"')
          OR JSON_CONTAINS(r.room_gender_preference, ?)
          OR (? = 'Male' AND JSON_CONTAINS(r.room_gender_preference, '"couples"'))
          OR (? = 'Female' AND JSON_CONTAINS(r.room_gender_preference, '"couples"'))
        )`;
        
        const genderParam = JSON.stringify(`"${tenantGender}"`);
        params.push(genderParam, tenantGender, tenantGender);
      }

      const [rows] = await db.query(query, params);
      return rows;
    } catch (err) {
      console.error("RoomModel.getAvailableBeds error:", err);
      throw err;
    }
  },



  // Assign bed to tenant
async assignBed(roomId, bedNumber, tenantId, tenantGender) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    console.log(`[ASSIGN BED] Room: ${roomId}, Bed: ${bedNumber}, Tenant: ${tenantId}, Gender: ${tenantGender}`);
    
    // 1. Check if tenant is already assigned
    const [tenantCheck] = await connection.query(
      `SELECT room_id, bed_number FROM bed_assignments 
       WHERE tenant_id = ? AND is_available = FALSE`,
      [tenantId]
    );
    
    if (tenantCheck.length > 0) {
      await connection.rollback();
      connection.release();
      const assign = tenantCheck[0];
      throw new Error(`Tenant ${tenantId} is already assigned to bed ${assign.bed_number} in room ${assign.room_id}`);
    }
    
    // 2. Check room capacity
    const [room] = await connection.query(
      `SELECT id, total_bed, occupied_beds FROM rooms WHERE id = ?`,
      [roomId]
    );
    
    if (room.length === 0) {
      await connection.rollback();
      connection.release();
      throw new Error(`Room ${roomId} not found`);
    }
    
    const roomData = room[0];
    
    if (bedNumber > roomData.total_bed) {
      await connection.rollback();
      connection.release();
      throw new Error(`Room only has ${roomData.total_bed} beds`);
    }
    
    if (roomData.occupied_beds >= roomData.total_bed) {
      await connection.rollback();
      connection.release();
      throw new Error(`Room ${roomId} is already full (${roomData.occupied_beds}/${roomData.total_bed})`);
    }
    
    // 3. Check bed availability
    const [bedCheck] = await connection.query(
      `SELECT id, is_available, tenant_id FROM bed_assignments 
       WHERE room_id = ? AND bed_number = ?`,
      [roomId, bedNumber]
    );
    
    let bedId;
    
    if (bedCheck.length === 0) {
      // Create bed if it doesn't exist
      const [result] = await connection.query(
        `INSERT INTO bed_assignments (room_id, bed_number, tenant_id, tenant_gender, is_available) 
         VALUES (?, ?, ?, ?, FALSE)`,
        [roomId, bedNumber, tenantId, tenantGender]
      );
      bedId = result.insertId;
      console.log(`[INFO] Created new bed with ID: ${bedId}`);
    } else {
      const bed = bedCheck[0];
      
      if (!bed.is_available) {
        await connection.rollback();
        connection.release();
        throw new Error(`Bed ${bedNumber} is already occupied by tenant ${bed.tenant_id}`);
      }
      
      bedId = bed.id;
      
      // Update existing bed
      const [updateResult] = await connection.query(
        `UPDATE bed_assignments 
         SET tenant_id = ?, tenant_gender = ?, is_available = FALSE 
         WHERE id = ?`,
        [tenantId, tenantGender, bedId]
      );
      
      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        throw new Error(`Failed to assign bed ${bedNumber}`);
      }
    }
    
    // 4. Update room occupancy
    await this.updateRoomOccupants(roomId, connection);
    
    // 5. Get tenant name for response
    const [tenant] = await connection.query(
      `SELECT full_name FROM tenants WHERE id = ?`,
      [tenantId]
    );
    
    const tenantName = tenant.length > 0 ? tenant[0].full_name : `ID ${tenantId}`;
    
    await connection.commit();
    connection.release();
    
    return {
      success: true,
      message: `Assigned bed ${bedNumber} to ${tenantName}`,
      data: {
        id: bedId,
        bed_assignment_id: bedId,
        room_id: roomId,
        bed_number: bedNumber,
        tenant_id: tenantId,
        tenant_name: tenantName
      }
    };
    
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
      connection.release();
    }
    
    console.error("[ERROR] assignBed failed:", error.message);
    throw error;
  }
},

// Update bed assignment (for changing tenant or vacating)
async updateBedAssignment(bedId, data) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    console.log(`[UPDATE BED] Bed ID: ${bedId}, Data:`, data);
    
    // 1. Get current bed info
    const [bed] = await connection.query(
      `SELECT id, room_id, bed_number, tenant_id FROM bed_assignments WHERE id = ?`,
      [bedId]
    );
    
    if (bed.length === 0) {
      await connection.rollback();
      connection.release();
      throw new Error(`Bed assignment ${bedId} not found`);
    }
    
    const bedInfo = bed[0];
    const roomId = bedInfo.room_id;
    
    const { tenant_id, tenant_gender, is_available } = data;
    
    // 2. Build update query
    const updates = [];
    const values = [];
    
    if (tenant_id !== undefined) {
      updates.push('tenant_id = ?');
      values.push(tenant_id);
    }
    
    if (tenant_gender !== undefined) {
      updates.push('tenant_gender = ?');
      values.push(tenant_gender);
    }
    
    if (is_available !== undefined) {
      updates.push('is_available = ?');
      values.push(is_available);
    }
    
    if (updates.length === 0) {
      await connection.rollback();
      connection.release();
      throw new Error('No fields to update');
    }
    
    values.push(bedId);
    
    const query = `UPDATE bed_assignments SET ${updates.join(', ')} WHERE id = ?`;
    
    const [result] = await connection.query(query, values);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      throw new Error('Failed to update bed assignment');
    }
    
    // 3. Update room occupancy
    await this.updateRoomOccupants(roomId, connection);
    
    await connection.commit();
    connection.release();
    
    return {
      success: true,
      message: 'Bed assignment updated successfully',
      data: {
        id: bedId,
        room_id: roomId,
        bed_number: bedInfo.bed_number,
        tenant_id: tenant_id
      }
    };
    
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
      connection.release();
    }
    
    console.error("[ERROR] updateBedAssignment failed:", error.message);
    throw error;
  }
},

// Update room occupants count (helper function)
async updateRoomOccupants(roomId, connection = null) {
  const conn = connection || db;
  
  try {
    // Get count of occupied beds
    const [countResult] = await conn.query(
      `SELECT COUNT(*) as occupied_count 
       FROM bed_assignments 
       WHERE room_id = ? AND is_available = FALSE`,
      [roomId]
    );
    
    const occupied = countResult[0].occupied_count;
    
    // Get genders
    const [gendersResult] = await conn.query(
      `SELECT tenant_gender 
       FROM bed_assignments 
       WHERE room_id = ? AND is_available = FALSE AND tenant_gender IS NOT NULL`,
      [roomId]
    );
    
    const genders = gendersResult.map(row => row.tenant_gender);
    const gendersJson = JSON.stringify(genders);
    
    // Update room
    await conn.query(
      `UPDATE rooms 
       SET occupied_beds = ?, 
           current_occupants_gender = ?
       WHERE id = ?`,
      [occupied, gendersJson, roomId]
    );
    
    return occupied;
    
  } catch (err) {
    console.error("updateRoomOccupants error:", err);
    throw err;
  }
},


// async vacateBed(bedId) {
//   let connection;
//   try {
//     connection = await db.getConnection();
//     await connection.beginTransaction();
    
//     console.log(`[DEBUG] vacateBed called for bedId=${bedId}`);
    
//     // 1. Get bed info
//     const [bed] = await connection.query(
//       `SELECT id, room_id, bed_number, tenant_id 
//        FROM bed_assignments 
//        WHERE id = ? FOR UPDATE`,
//       [bedId]
//     );
    
//     if (bed.length === 0) {
//       throw new Error(`Bed assignment ${bedId} not found`);
//     }
    
//     const bedInfo = bed[0];
//     console.log(`[DEBUG] Vacating bed ${bedInfo.bed_number} in room ${bedInfo.room_id}, tenant ${bedInfo.tenant_id}`);
    
//     // 2. Update the bed to be available
//     const [result] = await connection.query(
//       `UPDATE bed_assignments 
//        SET tenant_id = NULL, 
//            tenant_gender = NULL, 
//            is_available = TRUE,
//            updated_at = CURRENT_TIMESTAMP
//        WHERE id = ?`,
//       [bedId]
//     );
    
//     if (result.affectedRows === 0) {
//       throw new Error('Failed to vacate bed');
//     }
    
//     // 3. Update room occupancy
//     await this.updateRoomOccupants(bedInfo.room_id, connection);
    
//     // 4. Get the tenant name for response
//     let tenantName = `ID ${bedInfo.tenant_id}`;
//     if (bedInfo.tenant_id) {
//       const [tenant] = await connection.query(
//         `SELECT full_name FROM tenants WHERE id = ?`,
//         [bedInfo.tenant_id]
//       );
//       if (tenant.length > 0) {
//         tenantName = tenant[0].full_name;
//       }
//     }
    
//     await connection.commit();
//     connection.release();
    
//     return {
//       success: true,
//       message: `Vacated bed ${bedInfo.bed_number} (was occupied by ${tenantName})`,
//       data: {
//         bed_number: bedInfo.bed_number,
//         room_id: bedInfo.room_id,
//         previous_tenant: bedInfo.tenant_id
//       }
//     };
    
//   } catch (error) {
//     if (connection) {
//       try {
//         await connection.rollback();
//       } catch (rollbackErr) {
//         console.error("[ERROR] Rollback failed:", rollbackErr);
//       }
//       connection.release();
//     }
    
//     console.error("[ERROR] vacateBed failed:", error);
//     throw error;
//   }
// },

 // Update bed assignment (for changing tenant or vacating)
  async updateBedAssignment(bedId, data) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      
      console.log(`[UPDATE BED] Bed ID: ${bedId}, Data:`, data);
      
      // 1. Get current bed info
      const [bed] = await connection.query(
        `SELECT id, room_id, bed_number, tenant_id, vacate_reason FROM bed_assignments WHERE id = ?`,
        [bedId]
      );
      
      if (bed.length === 0) {
        await connection.rollback();
        connection.release();
        throw new Error(`Bed assignment ${bedId} not found`);
      }
      
      const bedInfo = bed[0];
      const roomId = bedInfo.room_id;
      
      const { tenant_id, tenant_gender, is_available, vacate_reason } = data;
      
      // 2. Build update query
      const updates = [];
      const values = [];
      
      if (tenant_id !== undefined) {
        updates.push('tenant_id = ?');
        values.push(tenant_id);
      }
      
      if (tenant_gender !== undefined) {
        updates.push('tenant_gender = ?');
        values.push(tenant_gender);
      }
      
      if (is_available !== undefined) {
        updates.push('is_available = ?');
        values.push(is_available);
      }
      
      if (vacate_reason !== undefined) {
        // Append to existing reason or set new one
        const existingReason = bedInfo.vacate_reason || '';
        const newReason = existingReason 
          ? `${existingReason} | ${vacate_reason}`
          : vacate_reason;
        
        updates.push('vacate_reason = ?');
        values.push(newReason);
      }
      
      if (updates.length === 0) {
        await connection.rollback();
        connection.release();
        throw new Error('No fields to update');
      }
      
      // Always update the timestamp
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      values.push(bedId);
      
      const query = `UPDATE bed_assignments SET ${updates.join(', ')} WHERE id = ?`;
      
      console.log('Update query:', query, values);
      
      const [result] = await connection.query(query, values);
      
      if (result.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        throw new Error('Failed to update bed assignment');
      }
      
      // 3. Check if tenant is already assigned elsewhere (if new tenant is being assigned)
      if (tenant_id && tenant_id !== null && tenant_id !== 'null' && !is_available) {
        const tenantId = parseInt(tenant_id);
        
        // Find if tenant has other active assignments
        const [existingAssignments] = await connection.query(
          `SELECT id, room_id, bed_number, vacate_reason
           FROM bed_assignments 
           WHERE tenant_id = ? 
           AND is_available = FALSE 
           AND id != ?`,
          [tenantId, bedId]
        );
        
        // If tenant is already assigned elsewhere, vacate that bed first
        if (existingAssignments.length > 0) {
          for (const assignment of existingAssignments) {
            console.log(`[INFO] Vacating existing assignment for tenant ${tenantId} in bed ${assignment.bed_number}`);
            
            const existingReason = assignment.vacate_reason || '';
            const transferReason = `Transferred to Bed ${bedInfo.bed_number} in Room ${roomId}`;
            const newReason = existingReason 
              ? `${existingReason} | ${transferReason}`
              : transferReason;
            
            // Update the existing assignment with vacate reason
            await connection.query(
              `UPDATE bed_assignments 
               SET tenant_id = NULL, 
                   tenant_gender = NULL, 
                   is_available = TRUE,
                   vacate_reason = ?,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [newReason, assignment.id]
            );
            
            // Update room occupancy for the room being vacated
            await this.updateRoomOccupants(assignment.room_id, connection);
          }
        }
      }
      
      // 4. Update room occupancy for current room
      await this.updateRoomOccupants(roomId, connection);
      
      await connection.commit();
      connection.release();
      
      return {
        success: true,
        message: 'Bed assignment updated successfully',
        data: {
          id: bedId,
          room_id: roomId,
          bed_number: bedInfo.bed_number,
          tenant_id: tenant_id,
          vacate_reason: vacate_reason
        }
      };
      
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackErr) {
          console.error("Rollback failed:", rollbackErr);
        }
        connection.release();
      }
      
      console.error("[ERROR] updateBedAssignment failed:", error.message);
      throw error;
    }
  },

  // Vacate bed
  async vacateBed(bedId, reason = null) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      
      console.log(`[DEBUG] vacateBed called for bedId=${bedId}, reason=${reason}`);
      
      // 1. Get bed info
      const [bed] = await connection.query(
        `SELECT id, room_id, bed_number, tenant_id 
         FROM bed_assignments 
         WHERE id = ? FOR UPDATE`,
        [bedId]
      );
      
      if (bed.length === 0) {
        throw new Error(`Bed assignment ${bedId} not found`);
      }
      
      const bedInfo = bed[0];
      console.log(`[DEBUG] Vacating bed ${bedInfo.bed_number} in room ${bedInfo.room_id}, tenant ${bedInfo.tenant_id}`);
      
      // 2. Update the bed to be available with reason
      const [result] = await connection.query(
        `UPDATE bed_assignments 
         SET tenant_id = NULL, 
             tenant_gender = NULL, 
             is_available = TRUE,
             vacate_reason = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [reason, bedId]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Failed to vacate bed');
      }
      
      // 3. Update room occupancy
      await this.updateRoomOccupants(bedInfo.room_id, connection);
      
      // 4. Get the tenant name for response
      let tenantName = `ID ${bedInfo.tenant_id}`;
      if (bedInfo.tenant_id) {
        const [tenant] = await connection.query(
          `SELECT full_name FROM tenants WHERE id = ?`,
          [bedInfo.tenant_id]
        );
        if (tenant.length > 0) {
          tenantName = tenant[0].full_name;
        }
      }
      
      await connection.commit();
      connection.release();
      
      return {
        success: true,
        message: `Vacated bed ${bedInfo.bed_number} (was occupied by ${tenantName})`,
        data: {
          bed_number: bedInfo.bed_number,
          room_id: bedInfo.room_id,
          previous_tenant: bedInfo.tenant_id,
          vacate_reason: reason
        }
      };
      
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackErr) {
          console.error("[ERROR] Rollback failed:", rollbackErr);
        }
        connection.release();
      }
      
      console.error("[ERROR] vacateBed failed:", error);
      throw error;
    }
  },

  // Update room occupants count (helper function)
  async updateRoomOccupants(roomId, connection = null) {
    const conn = connection || db;
    
    try {
      // Get count of occupied beds
      const [countResult] = await conn.query(
        `SELECT COUNT(*) as occupied_count 
         FROM bed_assignments 
         WHERE room_id = ? AND is_available = FALSE`,
        [roomId]
      );
      
      const occupied = countResult[0].occupied_count;
      
      // Get genders
      const [gendersResult] = await conn.query(
        `SELECT tenant_gender 
         FROM bed_assignments 
         WHERE room_id = ? AND is_available = FALSE AND tenant_gender IS NOT NULL`,
        [roomId]
      );
      
      const genders = gendersResult.map(row => row.tenant_gender);
      const gendersJson = JSON.stringify(genders);
      
      // Update room
      await conn.query(
        `UPDATE rooms 
         SET occupied_beds = ?, 
             current_occupants_gender = ?
         WHERE id = ?`,
        [occupied, gendersJson, roomId]
      );
      
      return occupied;
      
    } catch (err) {
      console.error("updateRoomOccupants error:", err);
      throw err;
    }
  },

  // Find tenant's existing assignment
  async findTenantAssignment(tenantId) {
    try {
      const [assignments] = await db.query(
        `SELECT 
          ba.id,
          ba.room_id,
          ba.bed_number,
          ba.tenant_gender,
          ba.is_available,
          ba.vacate_reason,
          r.room_number,
          p.name as property_name
         FROM bed_assignments ba
         JOIN rooms r ON r.id = ba.room_id
         JOIN properties p ON p.id = r.property_id
         WHERE ba.tenant_id = ?`,
        [tenantId]
      );
      
      return assignments;
    } catch (err) {
      console.error("findTenantAssignment error:", err);
      throw err;
    }
  },

  async syncBedAssignments(roomId, newTotalBeds) {
    try {
      const [currentBeds] = await db.query(
        'SELECT bed_number FROM bed_assignments WHERE room_id = ? ORDER BY bed_number',
        [roomId]
      );

      const currentBedNumbers = currentBeds.map(bed => bed.bed_number);
      const newBedNumbers = Array.from({ length: newTotalBeds }, (_, i) => i + 1);

      const bedsToAdd = newBedNumbers.filter(num => !currentBedNumbers.includes(num));
      for (const bedNumber of bedsToAdd) {
        await db.query(
          'INSERT INTO bed_assignments (room_id, bed_number, is_available) VALUES (?, ?, TRUE)',
          [roomId, bedNumber]
        );
      }

      const bedsToRemove = currentBedNumbers.filter(num => !newBedNumbers.includes(num));
      if (bedsToRemove.length > 0) {
        await db.query(
          'DELETE FROM bed_assignments WHERE room_id = ? AND bed_number IN (?) AND is_available = TRUE',
          [roomId, bedsToRemove]
        );
      }

      const [occupiedCount] = await db.query(
        'SELECT COUNT(*) as count FROM bed_assignments WHERE room_id = ? AND is_available = FALSE',
        [roomId]
      );

      await db.query(
        'UPDATE rooms SET occupied_beds = ? WHERE id = ?',
        [occupiedCount[0].count, roomId]
      );
    } catch (err) {
      console.error("RoomModel.syncBedAssignments error:", err);
      throw err;
    }
  },

  async delete(id) {
    try {
      await db.query('DELETE FROM bed_assignments WHERE room_id = ?', [id]);
      
      const [result] = await db.query('DELETE FROM rooms WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error("RoomModel.delete error:", err);
      throw err;
    }
  },

  async addPhotos(id, newPhotos) {
    try {
      const room = await this.findById(id);
      if (!room) return false;

      const updatedPhotos = [...room.photo_urls, ...newPhotos];
      
      const [result] = await db.query(
        'UPDATE rooms SET photo_urls = ? WHERE id = ?',
        [JSON.stringify(updatedPhotos), id]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error("RoomModel.addPhotos error:", err);
      throw err;
    }
  },

  async removePhotos(id, photosToRemove) {
    try {
      const room = await this.findById(id);
      if (!room) return false;

      const updatedPhotos = room.photo_urls.filter(photo => 
        !photosToRemove.includes(photo)
      );
      
      const [result] = await db.query(
        'UPDATE rooms SET photo_urls = ? WHERE id = ?',
        [JSON.stringify(updatedPhotos), id]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error("RoomModel.removePhotos error:", err);
      throw err;
    }
  }
};

module.exports = RoomModel;