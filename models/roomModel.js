// models/roomModel.js
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
              'bed_type', ba.bed_type,
              'tenant_gender', ba.tenant_gender,
              'is_available', ba.is_available,
              'tenant_id', ba.tenant_id,
              'tenant_rent', ba.tenant_rent,
              'is_couple', ba.is_couple,
              'bed_type', ba.bed_type    
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
      video_url: room.video_url ? String(room.video_url) : null
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
              'bed_type', ba.bed_type,
              'tenant_gender', ba.tenant_gender,
              'is_available', ba.is_available,
              'tenant_id', ba.tenant_id,
              'tenant_rent', ba.tenant_rent,
              'is_couple', ba.is_couple,
              'bed_type', ba.bed_type    
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
      beds_config: parsedBedAssignments.map(bed => ({
        bed_number: bed.bed_number,
        bed_type: bed.bed_type || '',
        bed_rent: bed.tenant_rent || room.rent_per_bed
      })),
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
              'tenant_id', ba.tenant_id,
              'tenant_rent', ba.tenant_rent,  
              'is_couple', ba.is_couple,       
              'bed_type', ba.bed_type          
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
      room_type = 'standard', // Make sure this is included
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
      room_gender_preference = [],
      allow_couples = false,
      description = '',
      is_active = true,
      beds_config
    } = room;
    console.log(room);

    console.log("RoomModel.create received:", { room_type , beds_config}); // Debug log

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
        room_type, // Make sure this is included
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
    
    await this.createBedAssignments(roomId, total_beds,beds_config);

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
      await this.syncBedAssignments(id, room.total_beds, room.beds_config);
    } else if (room.beds_config !== undefined) {
      // Update bed types and rents for existing beds
      await this.updateBedConfigurations(id, room.beds_config);
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

// Update createBedAssignments to accept bed types
async createBedAssignments(roomId, totalBeds, bedsConfig = []) {
  try {
    for (let i = 1; i <= totalBeds; i++) {
      // Find bed config for this bed number
      const bedConfig = bedsConfig.find(bed => bed.bed_number === i);
      const bedType = bedConfig?.bed_type || null;
      const bedRent = bedConfig?.bed_rent || null;
      
      await db.query(
        `INSERT INTO bed_assignments (room_id, bed_number, bed_type, tenant_rent, is_available) 
         VALUES (?, ?, ?, ?, TRUE)`,
        [roomId, i, bedType, bedRent]
      );
    }
  } catch (err) {
    console.error("RoomModel.createBedAssignments error:", err);
    throw err;
  }
},


// Add new method to update bed configurations
async updateBedConfigurations(roomId, bedsConfig) {
  try {
    for (const bed of bedsConfig) {
      await db.query(
        `UPDATE bed_assignments 
         SET bed_type = ?, tenant_rent = ?
         WHERE room_id = ? AND bed_number = ?`,
        [bed.bed_type, bed.bed_rent, roomId, bed.bed_number]
      );
    }
  } catch (err) {
    console.error("RoomModel.updateBedConfigurations error:", err);
    throw err;
  }
},

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


  async getAvailableBeds(roomId, tenantGender = null) {
    try {
      let query = `
        SELECT ba.*, r.room_gender_preference, r.allow_couples, r.rent_per_bed
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
// async assignBed(roomId, bedNumber, tenantId, tenantGender) {
//   let connection;
//   try {
//     connection = await db.getConnection();
//     await connection.beginTransaction();
    
//     console.log(`[ASSIGN BED] Room: ${roomId}, Bed: ${bedNumber}, Tenant: ${tenantId}, Gender: ${tenantGender}`);
    
//     // 1. Check if tenant is already assigned
//     const [tenantCheck] = await connection.query(
//       `SELECT room_id, bed_number FROM bed_assignments 
//        WHERE tenant_id = ? AND is_available = FALSE`,
//       [tenantId]
//     );
    
//     if (tenantCheck.length > 0) {
//       await connection.rollback();
//       connection.release();
//       const assign = tenantCheck[0];
//       throw new Error(`Tenant ${tenantId} is already assigned to bed ${assign.bed_number} in room ${assign.room_id}`);
//     }
    
//     // 2. Check room capacity
//     const [room] = await connection.query(
//       `SELECT id, total_bed, occupied_beds FROM rooms WHERE id = ?`,
//       [roomId]
//     );
    
//     if (room.length === 0) {
//       await connection.rollback();
//       connection.release();
//       throw new Error(`Room ${roomId} not found`);
//     }
    
//     const roomData = room[0];
    
//     if (bedNumber > roomData.total_bed) {
//       await connection.rollback();
//       connection.release();
//       throw new Error(`Room only has ${roomData.total_bed} beds`);
//     }
    
//     if (roomData.occupied_beds >= roomData.total_bed) {
//       await connection.rollback();
//       connection.release();
//       throw new Error(`Room ${roomId} is already full (${roomData.occupied_beds}/${roomData.total_bed})`);
//     }
    
//     // 3. Check bed availability
//     const [bedCheck] = await connection.query(
//       `SELECT id, is_available, tenant_id FROM bed_assignments 
//        WHERE room_id = ? AND bed_number = ?`,
//       [roomId, bedNumber]
//     );
    
//     let bedId;
    
//     if (bedCheck.length === 0) {
//       // Create bed if it doesn't exist
//       const [result] = await connection.query(
//         `INSERT INTO bed_assignments (room_id, bed_number, tenant_id, tenant_gender, is_available) 
//          VALUES (?, ?, ?, ?, FALSE)`,
//         [roomId, bedNumber, tenantId, tenantGender]
//       );
//       bedId = result.insertId;
//       console.log(`[INFO] Created new bed with ID: ${bedId}`);
//     } else {
//       const bed = bedCheck[0];
      
//       if (!bed.is_available) {
//         await connection.rollback();
//         connection.release();
//         throw new Error(`Bed ${bedNumber} is already occupied by tenant ${bed.tenant_id}`);
//       }
      
//       bedId = bed.id;
      
//       // Update existing bed
//       const [updateResult] = await connection.query(
//         `UPDATE bed_assignments 
//          SET tenant_id = ?, tenant_gender = ?, is_available = FALSE 
//          WHERE id = ?`,
//         [tenantId, tenantGender, bedId]
//       );
      
//       if (updateResult.affectedRows === 0) {
//         await connection.rollback();
//         connection.release();
//         throw new Error(`Failed to assign bed ${bedNumber}`);
//       }
//     }
    
//     // 4. Update room occupancy
//     await this.updateRoomOccupants(roomId, connection);
    
//     // 5. Get tenant name for response
//     const [tenant] = await connection.query(
//       `SELECT full_name FROM tenants WHERE id = ?`,
//       [tenantId]
//     );
    
//     const tenantName = tenant.length > 0 ? tenant[0].full_name : `ID ${tenantId}`;
    
//     await connection.commit();
//     connection.release();
    
//     return {
//       success: true,
//       message: `Assigned bed ${bedNumber} to ${tenantName}`,
//       data: {
//         id: bedId,
//         bed_assignment_id: bedId,
//         room_id: roomId,
//         bed_number: bedNumber,
//         tenant_id: tenantId,
//         tenant_name: tenantName
//       }
//     };
    
//   } catch (error) {
//     if (connection) {
//       try {
//         await connection.rollback();
//       } catch (rollbackErr) {
//         console.error("Rollback failed:", rollbackErr);
//       }
//       connection.release();
//     }
    
//     console.error("[ERROR] assignBed failed:", error.message);
//     throw error;
//   }
// },

// In roomModel.js - Update the assignBed method
// models/roomModel.js - Update assignBed with better logging

// Update assignBed to handle bed_type
async assignBed(roomId, bedNumber, tenantId, tenantGender, tenantRent = null, isCouple = false) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    console.log(`[ASSIGN BED MODEL] Parameters:`, {
      roomId,
      bedNumber,
      tenantId,
      tenantGender,
      tenantRent,
      isCouple,
      tenantRentType: typeof tenantRent,
      isCoupleType: typeof isCouple
    });
    
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
    
    // 2. Check room capacity and get default rent
    const [room] = await connection.query(
      `SELECT id, total_bed, occupied_beds, rent_per_bed FROM rooms WHERE id = ?`,
      [roomId]
    );
    
    if (room.length === 0) {
      await connection.rollback();
      connection.release();
      throw new Error(`Room ${roomId} not found`);
    }
    
    const roomData = room[0];
    console.log(`[ASSIGN BED MODEL] Room data:`, roomData);
    
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
    
    // Use custom rent if provided, otherwise use room's default rent
    let finalRent;
    if (tenantRent !== null && tenantRent !== undefined && tenantRent !== '') {
      finalRent = parseFloat(tenantRent);
      if (isNaN(finalRent)) {
        finalRent = roomData.rent_per_bed;
      }
    } else {
      finalRent = roomData.rent_per_bed;
    }
    
    // Ensure isCouple is a boolean
    const finalIsCouple = isCouple === true || isCouple === 1 || isCouple === '1' || isCouple === 'true';
    
    console.log(`[ASSIGN BED MODEL] Final values:`, {
      finalRent,
      finalIsCouple,
      finalRentType: typeof finalRent,
      finalIsCoupleType: typeof finalIsCouple
    });
    
    // 3. Check bed availability and get bed type
    const [bedCheck] = await connection.query(
      `SELECT id, is_available, tenant_id, bed_type FROM bed_assignments 
       WHERE room_id = ? AND bed_number = ?`,
      [roomId, bedNumber]
    );
    
    let bedId;
    let bedType = null;
    
    if (bedCheck.length === 0) {
      // Create bed if it doesn't exist
      console.log(`[ASSIGN BED MODEL] Creating new bed assignment`);
      const [result] = await connection.query(
        `INSERT INTO bed_assignments 
         (room_id, bed_number, bed_type, tenant_id, tenant_gender, tenant_rent, is_couple, is_available) 
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
        [roomId, bedNumber, bedType, tenantId, tenantGender, finalRent, finalIsCouple]
      );
      bedId = result.insertId;
      console.log(`[ASSIGN BED MODEL] Created new bed with ID: ${bedId}`);
    } else {
      const bed = bedCheck[0];
      
      if (!bed.is_available) {
        await connection.rollback();
        connection.release();
        throw new Error(`Bed ${bedNumber} is already occupied by tenant ${bed.tenant_id}`);
      }
      
      bedId = bed.id;
      bedType = bed.bed_type;
      console.log(`[ASSIGN BED MODEL] Updating existing bed ID: ${bedId} with type: ${bedType}`);
      
      // Update existing bed
      const [updateResult] = await connection.query(
        `UPDATE bed_assignments 
         SET tenant_id = ?, tenant_gender = ?, tenant_rent = ?, is_couple = ?, is_available = FALSE 
         WHERE id = ?`,
        [tenantId, tenantGender, finalRent, finalIsCouple, bedId]
      );
      
      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        throw new Error(`Failed to assign bed ${bedNumber}`);
      }
      
      console.log(`[ASSIGN BED MODEL] Update affected rows:`, updateResult.affectedRows);
    }
    
    // 4. Update room occupancy
    await this.updateRoomOccupants(roomId, connection);
    
    // 5. Get tenant name for response
    const [tenant] = await connection.query(
      `SELECT full_name FROM tenants WHERE id = ?`,
      [tenantId]
    );
    
    const tenantName = tenant.length > 0 ? tenant[0].full_name : `ID ${tenantId}`;
    
    // 6. Verify the data was saved correctly
    const [savedBed] = await connection.query(
      `SELECT id, bed_type, tenant_rent, is_couple FROM bed_assignments WHERE id = ?`,
      [bedId]
    );
    
    console.log(`[ASSIGN BED MODEL] Saved bed data:`, savedBed[0]);
    
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
        bed_type: bedType,
        tenant_id: tenantId,
        tenant_name: tenantName,
        tenant_rent: finalRent,
        is_couple: finalIsCouple
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
    
    console.error("[ASSIGN BED MODEL ERROR]:", error.message);
    console.error("[ASSIGN BED MODEL ERROR] Full error:", error);
    throw error;
  }
},

// In roomModel.js - Update the updateBedAssignment method
// models/roomModel.js - Update updateBedAssignment with better logging

// models/roomModel.js - Update the updateBedAssignment method

async updateBedAssignment(bedId, data) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    console.log(`[UPDATE BED MODEL] Bed ID: ${bedId}, Data:`, data);
    
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
    
    const { tenant_id, tenant_gender, is_available, vacate_reason, tenant_rent, is_couple } = data;
    
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
      values.push(is_available ? 1 : 0);
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
    
    // FIX: Always include tenant_rent in the update if it's in the data
    if (tenant_rent !== undefined) {
      updates.push('tenant_rent = ?');
      // Handle null values
      if (tenant_rent === null) {
        values.push(null);
      } else {
        // Ensure it's a number
        const rentValue = parseFloat(tenant_rent);
        values.push(isNaN(rentValue) ? null : rentValue);
      }
    }
    
    // FIX: Always include is_couple in the update if it's in the data
    if (is_couple !== undefined) {
      updates.push('is_couple = ?');
      // Convert to boolean and then to 0/1 for MySQL
      const coupleValue = is_couple === true || is_couple === 1 || is_couple === '1' || is_couple === 'true' ? 1 : 0;
      values.push(coupleValue);
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
    
    console.log('[UPDATE BED MODEL] Update query:', query);
    console.log('[UPDATE BED MODEL] Update values:', values);
    
    const [result] = await connection.query(query, values);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      throw new Error('Failed to update bed assignment');
    }
    
    console.log(`[UPDATE BED MODEL] Update affected rows:`, result.affectedRows);
    
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
                 tenant_rent = NULL,
                 is_couple = FALSE,
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
    
    // 5. Verify the update
    const [updatedBed] = await connection.query(
      `SELECT id, tenant_rent, is_couple FROM bed_assignments WHERE id = ?`,
      [bedId]
    );
    
    console.log(`[UPDATE BED MODEL] Updated bed data:`, updatedBed[0]);
    
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
        tenant_rent: tenant_rent,
        is_couple: is_couple,
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
    
    console.error("[UPDATE BED MODEL ERROR]:", error.message);
    console.error("[UPDATE BED MODEL ERROR] Full error:", error);
    throw error;
  }
},

// Update bed assignment (for changing tenant or vacating)
// async updateBedAssignment(bedId, data) {
//   let connection;
//   try {
//     connection = await db.getConnection();
//     await connection.beginTransaction();
    
//     console.log(`[UPDATE BED] Bed ID: ${bedId}, Data:`, data);
    
//     // 1. Get current bed info
//     const [bed] = await connection.query(
//       `SELECT id, room_id, bed_number, tenant_id FROM bed_assignments WHERE id = ?`,
//       [bedId]
//     );
    
//     if (bed.length === 0) {
//       await connection.rollback();
//       connection.release();
//       throw new Error(`Bed assignment ${bedId} not found`);
//     }
    
//     const bedInfo = bed[0];
//     const roomId = bedInfo.room_id;
    
//     const { tenant_id, tenant_gender, is_available } = data;
    
//     // 2. Build update query
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
//       await connection.rollback();
//       connection.release();
//       throw new Error('No fields to update');
//     }
    
//     values.push(bedId);
    
//     const query = `UPDATE bed_assignments SET ${updates.join(', ')} WHERE id = ?`;
    
//     const [result] = await connection.query(query, values);
    
//     if (result.affectedRows === 0) {
//       await connection.rollback();
//       connection.release();
//       throw new Error('Failed to update bed assignment');
//     }
    
//     // 3. Update room occupancy
//     await this.updateRoomOccupants(roomId, connection);
    
//     await connection.commit();
//     connection.release();
    
//     return {
//       success: true,
//       message: 'Bed assignment updated successfully',
//       data: {
//         id: bedId,
//         room_id: roomId,
//         bed_number: bedInfo.bed_number,
//         tenant_id: tenant_id
//       }
//     };
    
//   } catch (error) {
//     if (connection) {
//       try {
//         await connection.rollback();
//       } catch (rollbackErr) {
//         console.error("Rollback failed:", rollbackErr);
//       }
//       connection.release();
//     }
    
//     console.error("[ERROR] updateBedAssignment failed:", error.message);
//     throw error;
//   }
// },

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

 // Update bed assignment (for changing tenant or vacating)
  // async updateBedAssignment(bedId, data) {
  //   let connection;
  //   try {
  //     connection = await db.getConnection();
  //     await connection.beginTransaction();
      
  //     console.log(`[UPDATE BED] Bed ID: ${bedId}, Data:`, data);
      
  //     // 1. Get current bed info
  //     const [bed] = await connection.query(
  //       `SELECT id, room_id, bed_number, tenant_id, vacate_reason FROM bed_assignments WHERE id = ?`,
  //       [bedId]
  //     );
      
  //     if (bed.length === 0) {
  //       await connection.rollback();
  //       connection.release();
  //       throw new Error(`Bed assignment ${bedId} not found`);
  //     }
      
  //     const bedInfo = bed[0];
  //     const roomId = bedInfo.room_id;
      
  //     const { tenant_id, tenant_gender, is_available, vacate_reason } = data;
      
  //     // 2. Build update query
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
      
  //     if (vacate_reason !== undefined) {
  //       // Append to existing reason or set new one
  //       const existingReason = bedInfo.vacate_reason || '';
  //       const newReason = existingReason 
  //         ? `${existingReason} | ${vacate_reason}`
  //         : vacate_reason;
        
  //       updates.push('vacate_reason = ?');
  //       values.push(newReason);
  //     }
      
  //     if (updates.length === 0) {
  //       await connection.rollback();
  //       connection.release();
  //       throw new Error('No fields to update');
  //     }
      
  //     // Always update the timestamp
  //     updates.push('updated_at = CURRENT_TIMESTAMP');
      
  //     values.push(bedId);
      
  //     const query = `UPDATE bed_assignments SET ${updates.join(', ')} WHERE id = ?`;
      
  //     console.log('Update query:', query, values);
      
  //     const [result] = await connection.query(query, values);
      
  //     if (result.affectedRows === 0) {
  //       await connection.rollback();
  //       connection.release();
  //       throw new Error('Failed to update bed assignment');
  //     }
      
  //     // 3. Check if tenant is already assigned elsewhere (if new tenant is being assigned)
  //     if (tenant_id && tenant_id !== null && tenant_id !== 'null' && !is_available) {
  //       const tenantId = parseInt(tenant_id);
        
  //       // Find if tenant has other active assignments
  //       const [existingAssignments] = await connection.query(
  //         `SELECT id, room_id, bed_number, vacate_reason
  //          FROM bed_assignments 
  //          WHERE tenant_id = ? 
  //          AND is_available = FALSE 
  //          AND id != ?`,
  //         [tenantId, bedId]
  //       );
        
  //       // If tenant is already assigned elsewhere, vacate that bed first
  //       if (existingAssignments.length > 0) {
  //         for (const assignment of existingAssignments) {
  //           console.log(`[INFO] Vacating existing assignment for tenant ${tenantId} in bed ${assignment.bed_number}`);
            
  //           const existingReason = assignment.vacate_reason || '';
  //           const transferReason = `Transferred to Bed ${bedInfo.bed_number} in Room ${roomId}`;
  //           const newReason = existingReason 
  //             ? `${existingReason} | ${transferReason}`
  //             : transferReason;
            
  //           // Update the existing assignment with vacate reason
  //           await connection.query(
  //             `UPDATE bed_assignments 
  //              SET tenant_id = NULL, 
  //                  tenant_gender = NULL, 
  //                  is_available = TRUE,
  //                  vacate_reason = ?,
  //                  updated_at = CURRENT_TIMESTAMP
  //              WHERE id = ?`,
  //             [newReason, assignment.id]
  //           );
            
  //           // Update room occupancy for the room being vacated
  //           await this.updateRoomOccupants(assignment.room_id, connection);
  //         }
  //       }
  //     }
      
  //     // 4. Update room occupancy for current room
  //     await this.updateRoomOccupants(roomId, connection);
      
  //     await connection.commit();
  //     connection.release();
      
  //     return {
  //       success: true,
  //       message: 'Bed assignment updated successfully',
  //       data: {
  //         id: bedId,
  //         room_id: roomId,
  //         bed_number: bedInfo.bed_number,
  //         tenant_id: tenant_id,
  //         vacate_reason: vacate_reason
  //       }
  //     };
      
  //   } catch (error) {
  //     if (connection) {
  //       try {
  //         await connection.rollback();
  //       } catch (rollbackErr) {
  //         console.error("Rollback failed:", rollbackErr);
  //       }
  //       connection.release();
  //     }
      
  //     console.error("[ERROR] updateBedAssignment failed:", error.message);
  //     throw error;
  //   }
  // },

  // Vacate bed
  // async vacateBed(bedId, reason = null) {
  //   let connection;
  //   try {
  //     connection = await db.getConnection();
  //     await connection.beginTransaction();
      
  //     console.log(`[DEBUG] vacateBed called for bedId=${bedId}, reason=${reason}`);
      
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
      
  //     // 2. Update the bed to be available with reason
  //     const [result] = await connection.query(
  //       `UPDATE bed_assignments 
  //        SET tenant_id = NULL, 
  //            tenant_gender = NULL, 
  //            is_available = TRUE,
  //            vacate_reason = ?,
  //            updated_at = CURRENT_TIMESTAMP
  //        WHERE id = ?`,
  //       [reason, bedId]
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
  //         previous_tenant: bedInfo.tenant_id,
  //         vacate_reason: reason
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

// In roomModel.js - Update the vacateBed method
async vacateBed(bedId, reason = null) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    console.log(`[DEBUG] vacateBed called for bedId=${bedId}, reason=${reason}`);
    
    // 1. Get bed info
    const [bed] = await connection.query(
      `SELECT id, room_id, bed_number, tenant_id, tenant_rent, is_couple
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
           tenant_rent = NULL,
           is_couple = FALSE,
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
        previous_rent: bedInfo.tenant_rent,
        was_couple: bedInfo.is_couple,
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

async syncBedAssignments(roomId, newTotalBeds, bedsConfig = []) {
  try {
    const [currentBeds] = await db.query(
      'SELECT bed_number FROM bed_assignments WHERE room_id = ? ORDER BY bed_number',
      [roomId]
    );

    const currentBedNumbers = currentBeds.map(bed => bed.bed_number);
    const newBedNumbers = Array.from({ length: newTotalBeds }, (_, i) => i + 1);

    // Add new beds
    const bedsToAdd = newBedNumbers.filter(num => !currentBedNumbers.includes(num));
    for (const bedNumber of bedsToAdd) {
      const bedConfig = bedsConfig.find(bed => bed.bed_number === bedNumber);
      const bedType = bedConfig?.bed_type || null;
      const bedRent = bedConfig?.bed_rent || null;
      
      await db.query(
        'INSERT INTO bed_assignments (room_id, bed_number, bed_type, tenant_rent, is_available) VALUES (?, ?, ?, ?, TRUE)',
        [roomId, bedNumber, bedType, bedRent]
      );
    }

    // Remove extra beds (only if available)
    const bedsToRemove = currentBedNumbers.filter(num => !newBedNumbers.includes(num));
    if (bedsToRemove.length > 0) {
      // First check if any of these beds are occupied
      const [occupiedBeds] = await db.query(
        'SELECT bed_number FROM bed_assignments WHERE room_id = ? AND bed_number IN (?) AND is_available = FALSE',
        [roomId, bedsToRemove]
      );
      
      if (occupiedBeds.length > 0) {
        throw new Error(`Cannot remove beds that are currently occupied: ${occupiedBeds.map(b => b.bed_number).join(', ')}`);
      }
      
      await db.query(
        'DELETE FROM bed_assignments WHERE room_id = ? AND bed_number IN (?) AND is_available = TRUE',
        [roomId, bedsToRemove]
      );
    }

    // Update existing beds with new configs
    for (const bed of bedsConfig) {
      if (newBedNumbers.includes(bed.bed_number)) {
        await db.query(
          'UPDATE bed_assignments SET bed_type = ?, tenant_rent = ? WHERE room_id = ? AND bed_number = ?',
          [bed.bed_type, bed.bed_rent, roomId, bed.bed_number]
        );
      }
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
  },

// Add these methods to your RoomModel (around line 1400-1500)

async bulkUpdate(roomIds, action) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    let query;
    let message;
    
    switch (action) {
      case 'activate':
        query = 'UPDATE rooms SET is_active = TRUE WHERE id IN (?)';
        message = `${roomIds.length} room(s) activated successfully`;
        break;
      
      case 'inactivate':
        query = 'UPDATE rooms SET is_active = FALSE WHERE id IN (?)';
        message = `${roomIds.length} room(s) inactivated successfully`;
        break;
      
      case 'delete':
        // First, check if rooms have assigned tenants
        const [occupiedCheck] = await connection.query(
          `SELECT DISTINCT room_id 
           FROM bed_assignments 
           WHERE room_id IN (?) AND is_available = FALSE`,
          [roomIds]
        );
        
        if (occupiedCheck.length > 0) {
          throw new Error(`Cannot delete rooms that have tenants assigned. Please vacate all tenants first.`);
        }
        
        // Delete bed assignments first
        await connection.query('DELETE FROM bed_assignments WHERE room_id IN (?)', [roomIds]);
        // Then delete rooms
        query = 'DELETE FROM rooms WHERE id IN (?)';
        message = `${roomIds.length} room(s) deleted successfully`;
        break;
      
      default:
        throw new Error('Invalid action');
    }
    
    const [result] = await connection.query(query, [roomIds]);
    
    await connection.commit();
    connection.release();
    
    // Get updated rooms for response
    const updatedRooms = await this.findAll();
    
    return {
      success: true,
      message: message,
      affectedRows: result.affectedRows,
      updatedRooms: updatedRooms
    };
    
  } catch (err) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("RoomModel.bulkUpdate error:", err);
    throw err;
  }
},

async getFilteredRooms(filters) {
  try {
    const {
      search = '',
      property_ids = [],
      room_types = [],
      gender_preferences = [],
      amenities = [],
      has_attached_bathroom,
      has_balcony,
      has_ac,
      allow_couples,
      min_rent,
      max_rent,
      min_capacity,
      max_capacity,
      is_active = true,
      page = 1,
      limit = 12
    } = filters;

    // Base WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Active status filter
    if (is_active !== undefined) {
      whereClause += ` AND r.is_active = ?`;
      params.push(is_active ? 1 : 0);
    }

    // Search filter
    if (search && search.trim() !== '') {
      whereClause += ` AND (
        r.room_number LIKE ? OR 
        p.name LIKE ? OR 
        p.address LIKE ? OR 
        r.sharing_type LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Property filter
    if (property_ids && property_ids.length > 0) {
      whereClause += ` AND r.property_id IN (?)`;
      params.push(property_ids);
    }

    // Room type filter
    if (room_types && room_types.length > 0) {
      whereClause += ` AND r.sharing_type IN (?)`;
      params.push(room_types);
    }

    // Gender preference filter
    if (gender_preferences && gender_preferences.length > 0) {
      whereClause += ` AND JSON_OVERLAPS(r.room_gender_preference, ?)`;
      params.push(JSON.stringify(gender_preferences));
    }

    // Amenities filter
    if (amenities && amenities.length > 0) {
      whereClause += ` AND (`;
      amenities.forEach((amenity, index) => {
        if (index > 0) whereClause += ` AND `;
        whereClause += `JSON_CONTAINS(r.amenities, ?)`;
        params.push(JSON.stringify(amenity));
      });
      whereClause += `)`;
    }

    // Boolean filters
    if (has_attached_bathroom !== undefined && has_attached_bathroom !== null) {
      whereClause += ` AND r.has_attached_bathroom = ?`;
      params.push(has_attached_bathroom ? 1 : 0);
    }

    if (has_balcony !== undefined && has_balcony !== null) {
      whereClause += ` AND r.has_balcony = ?`;
      params.push(has_balcony ? 1 : 0);
    }

    if (has_ac !== undefined && has_ac !== null) {
      whereClause += ` AND r.has_ac = ?`;
      params.push(has_ac ? 1 : 0);
    }

    if (allow_couples !== undefined && allow_couples !== null) {
      whereClause += ` AND r.allow_couples = ?`;
      params.push(allow_couples ? 1 : 0);
    }

    // Rent range filter
    if (min_rent !== undefined && min_rent !== null && min_rent !== '') {
      const minRentValue = parseFloat(min_rent);
      if (!isNaN(minRentValue)) {
        whereClause += ` AND r.rent_per_bed >= ?`;
        params.push(minRentValue);
      }
    }

    if (max_rent !== undefined && max_rent !== null && max_rent !== '') {
      const maxRentValue = parseFloat(max_rent);
      if (!isNaN(maxRentValue) && maxRentValue < 100000) {
        whereClause += ` AND r.rent_per_bed <= ?`;
        params.push(maxRentValue);
      }
    }

    // Capacity filter
    if (min_capacity !== undefined && min_capacity !== null && min_capacity !== '') {
      const minCapacityValue = parseInt(min_capacity);
      if (!isNaN(minCapacityValue)) {
        whereClause += ` AND r.total_bed >= ?`;
        params.push(minCapacityValue);
      }
    }

    if (max_capacity !== undefined && max_capacity !== null && max_capacity !== '') {
      const maxCapacityValue = parseInt(max_capacity);
      if (!isNaN(maxCapacityValue) && maxCapacityValue < 10) {
        whereClause += ` AND r.total_bed <= ?`;
        params.push(maxCapacityValue);
      }
    }

    // COUNT QUERY - FIXED: Use SELECT COUNT(*) instead of SELECT *
    const countQuery = `
      SELECT COUNT(*) as total
      FROM rooms r
      JOIN properties p ON p.id = r.property_id
      ${whereClause}
    `;

    console.log('Count Query:', countQuery);
    console.log('Count Params:', params);
    
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // MAIN QUERY - Get paginated results
    const mainQuery = `
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
      ${whereClause}
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
    `;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const mainParams = [...params, parseInt(limit), offset];

    console.log('Main Query:', mainQuery);
    console.log('Main Params:', mainParams);
    
    const [rows] = await db.query(mainQuery, mainParams);

    // Parse JSON fields
    const rooms = rows.map(room => ({
      ...room,
      amenities: safeJsonParse(room.amenities),
      photo_urls: safeJsonParse(room.photo_urls),
      room_gender_preference: safeJsonParse(room.room_gender_preference),
      bed_assignments: room.bed_assignments_json ? safeJsonParse(room.bed_assignments_json) : []
    }));

    return {
      rooms,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };

  } catch (err) {
    console.error("RoomModel.getFilteredRooms error:", err);
    console.error("Error details:", {
      message: err.message,
      sql: err.sql,
      sqlMessage: err.sqlMessage
    });
    throw err;
  }
},

async getRoomFiltersData() {
  try {
    // Get all unique room types
    const [roomTypes] = await db.query(`
      SELECT DISTINCT 
        sharing_type as type,
        COUNT(*) as count
      FROM rooms 
      WHERE is_active = TRUE
      GROUP BY sharing_type
      ORDER BY sharing_type
    `);

    // Get all unique gender preferences
    const [genderPrefs] = await db.query(`
      SELECT DISTINCT 
        JSON_UNQUOTE(JSON_EXTRACT(room_gender_preference, '$[0]')) as gender,
        COUNT(*) as count
      FROM rooms 
      WHERE is_active = TRUE 
        AND room_gender_preference IS NOT NULL 
        AND room_gender_preference != '[]'
      GROUP BY gender
      HAVING gender IS NOT NULL
      ORDER BY gender
    `);

    // Get property options
    const [properties] = await db.query(`
      SELECT p.id, p.name, p.address, COUNT(r.id) as room_count
      FROM properties p
      LEFT JOIN rooms r ON p.id = r.property_id AND r.is_active = TRUE
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.name, p.address
      ORDER BY p.name
    `);

    // Get amenity options
    const [amenities] = await db.query(`
      SELECT DISTINCT
        JSON_UNQUOTE(amenity) as amenity,
        COUNT(*) as count
      FROM rooms,
      JSON_TABLE(
        amenities,
        '$[*]' COLUMNS(amenity VARCHAR(255) PATH '$')
      ) AS amenities_parsed
      WHERE is_active = TRUE
      GROUP BY amenity
      ORDER BY amenity
    `);

    return {
      roomTypes: roomTypes.map(type => ({
        value: type.type,
        label: type.type.charAt(0).toUpperCase() + type.type.slice(1),
        count: type.count
      })),
      genderPreferences: genderPrefs.map(gender => ({
        value: gender.gender,
        label: gender.gender === 'male_only' ? 'Male Only' : 
               gender.gender === 'female_only' ? 'Female Only' : 
               gender.gender === 'couples' ? 'Couples' : gender.gender,
        count: gender.count
      })),
      properties: properties.map(prop => ({
        id: prop.id.toString(),
        name: prop.name,
        address: prop.address,
        roomCount: prop.room_count
      })),
      amenities: amenities.map(amenity => ({
        value: amenity.amenity,
        label: amenity.amenity,
        count: amenity.count
      }))
    };
  } catch (err) {
    console.error("RoomModel.getRoomFiltersData error:", err);
    throw err;
  }
}
};

module.exports = RoomModel;