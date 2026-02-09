const db = require('../config/db');

class ChangeBedModel {
  // ===================== HELPER METHODS =====================
  
  /**
   * Normalize gender preference values
   */
  static normalizeGenderPreference(pref) {
    if (!pref) return 'any';
    
    const prefLower = String(pref).toLowerCase().trim();
    
    if (prefLower === 'male_only' || prefLower === 'male') return 'male';
    if (prefLower === 'female_only' || prefLower === 'female') return 'female';
    if (prefLower === 'any' || prefLower === 'mixed' || prefLower === 'both') return 'any';
    if (prefLower === 'couples') return 'couples';
    
    return prefLower;
  }

  /**
   * Safe JSON parser with normalization
   */
  static safeParseJson(value, fallback = ['any']) {
    if (!value) return fallback;
    
    // If already an array, normalize each value
    if (Array.isArray(value)) {
      return value.map(p => this.normalizeGenderPreference(p));
    }
    
    try {
      // If it's a string
      if (typeof value === 'string') {
        // Check if it's JSON
        if (value.trim().startsWith('[') || value.trim().startsWith('{')) {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed.map(p => this.normalizeGenderPreference(p));
          }
          return [this.normalizeGenderPreference(parsed)];
        }
        
        // Handle comma-separated values (like "male_only,female_only")
        if (value.includes(',')) {
          return value.split(',').map(p => this.normalizeGenderPreference(p.trim()));
        }
        
        // Single string value
        return [this.normalizeGenderPreference(value)];
      }
      
      // Single value
      return [this.normalizeGenderPreference(value)];
    } catch (error) {
      console.error('Error parsing JSON:', error, 'Value:', value);
      return fallback;
    }
  }

  /**
   * Parse room_gender_preference JSON safely
   */
  static parseGenderPreferences(prefString) {
    return this.safeParseJson(prefString, ['any']);
  }

  /**
   * Check if tenant gender is compatible with room preferences
   */
  static isGenderCompatible(tenantGender, roomPreferences) {
    if (!roomPreferences || roomPreferences.length === 0) return true;
    
    const tenantGenderLower = String(tenantGender).toLowerCase().trim();
    
    for (const pref of roomPreferences) {
      const prefLower = String(pref).toLowerCase().trim();
      
      // Universal accepts
      if (prefLower === 'any' || prefLower === 'mixed' || prefLower === 'both') {
        return true;
      }
      
      // Couples accepts both genders
      if (prefLower === 'couples') {
        return true;
      }
      
      // Gender matches
      if (tenantGenderLower === 'male' && (prefLower === 'male' || prefLower === 'male_only')) {
        return true;
      }
      
      if (tenantGenderLower === 'female' && (prefLower === 'female' || prefLower === 'female_only')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * FIXED: Get ALL room occupants in batch - CORRECTED LOGIC
   */
  static async getRoomOccupantsBatch(roomIds) {
    try {
      if (!roomIds || roomIds.length === 0) return {};
      
      const placeholders = roomIds.map(() => '?').join(',');
      
      // FIXED QUERY: Handle is_available as boolean correctly
      const [occupants] = await db.query(`
        SELECT 
          ba.room_id,
          t.id as tenant_id,
          t.full_name,
          t.gender,
          ba.bed_number,
          ba.id as assignment_id,
          -- FIX: Handle is_available as boolean (0/1 or true/false)
          CASE 
            WHEN ba.is_available IS NULL THEN TRUE
            WHEN ba.is_available = 0 THEN FALSE
            WHEN ba.is_available = FALSE THEN FALSE
            ELSE ba.is_available
          END as is_available,
          -- Also check if bed is actually occupied
          CASE 
            WHEN ba.tenant_id IS NOT NULL AND ba.is_available IN (0, FALSE) THEN FALSE
            WHEN ba.tenant_id IS NULL THEN TRUE
            ELSE TRUE
          END as is_vacant
        FROM bed_assignments ba
        LEFT JOIN tenants t ON t.id = ba.tenant_id
        WHERE ba.room_id IN (${placeholders})
        ORDER BY ba.room_id, ba.bed_number ASC
      `, roomIds);
      
      console.log('\n🔍 [BATCH OCCUPANTS QUERY RESULT]:');
      console.log('Room IDs:', roomIds);
      console.log('Found occupants:', occupants.length);
      
      if (occupants.length > 0) {
        occupants.forEach(occ => {
          console.log(`  Room ${occ.room_id}, Bed ${occ.bed_number}:`, {
            tenant_id: occ.tenant_id,
            tenant_name: occ.full_name,
            is_available: occ.is_available,
            is_vacant: occ.is_vacant,
            gender: occ.gender
          });
        });
      }
      
      // Group by room_id
      const grouped = {};
      occupants.forEach(occ => {
        if (!grouped[occ.room_id]) {
          grouped[occ.room_id] = [];
        }
        grouped[occ.room_id].push(occ);
      });
      
      return grouped;
    } catch (error) {
      console.error('Error fetching room occupants batch:', error);
      return {};
    }
  }

  /**
   * FIXED: Derive occupants gender from actual occupants
   */
  static deriveOccupantsGender(occupants) {
    if (!occupants || occupants.length === 0) {
      return 'empty';
    }
    
    console.log('\n🔍 [DERIVE GENDER] Processing occupants:', occupants.length);
    
    // FIXED LOGIC: A bed is occupied if:
    // 1. Has tenant_id AND 
    // 2. is_available is FALSE (0) OR is_vacant is FALSE
    const occupied = occupants.filter(o => {
      const hasTenant = o.tenant_id !== null && o.tenant_id !== undefined;
      const isNotAvailable = o.is_available === false || o.is_available === 0;
      const isNotVacant = o.is_vacant === false;
      
      const isOccupied = hasTenant && (isNotAvailable || isNotVacant);
      
      console.log(`  Bed ${o.bed_number}:`, {
        tenant_id: o.tenant_id,
        is_available: o.is_available,
        is_vacant: o.is_vacant,
        is_occupied: isOccupied,
        name: o.full_name
      });
      
      return isOccupied;
    });
    
    console.log(`[DERIVE GENDER] Found ${occupied.length} occupied beds`);
    
    if (occupied.length === 0) {
      return 'empty';
    }
    
    // Get unique genders
    const genders = [...new Set(occupied
      .map(o => o.gender ? String(o.gender).toLowerCase().trim() : null)
      .filter(g => g)
    )];
    
    const result = genders.length === 1 ? genders[0] : 'mixed';
    console.log(`[DERIVE GENDER] Result: ${result} (genders: ${genders.join(', ')})`);
    
    return result;
  }

  /**
   * FIXED: Calculate occupants count correctly
   */
  static calculateOccupantsCount(occupants) {
    if (!occupants || occupants.length === 0) {
      console.log('[CALC COUNT] No occupants array');
      return 0;
    }
    
    console.log('\n🔍 [CALCULATE OCCUPANTS COUNT]:');
    console.log('Total beds found:', occupants.length);
    
    // FIXED LOGIC: Count occupied beds
    const occupiedCount = occupants.filter(o => {
      const hasTenant = o.tenant_id !== null && o.tenant_id !== undefined;
      const isNotAvailable = o.is_available === false || o.is_available === 0;
      const isNotVacant = o.is_vacant === false;
      
      return hasTenant && (isNotAvailable || isNotVacant);
    }).length;
    
    console.log(`[CALC COUNT] Occupied beds: ${occupiedCount}`);
    
    // Log details for debugging
    if (occupiedCount === 0 && occupants.length > 0) {
      console.log('[CALC COUNT] DEBUG - Why 0? Checking each bed:');
      occupants.forEach((o, i) => {
        console.log(`  Bed ${i + 1} (${o.bed_number}):`, {
          tenant_id: o.tenant_id,
          tenant_name: o.full_name,
          is_available: o.is_available,
          is_vacant: o.is_vacant,
          gender: o.gender
        });
      });
    }
    
    return occupiedCount;
  }

  // ===================== API METHODS =====================

  /**
   * 1. Get change reasons from master values
   */
  static async getChangeReasons() {
    try {
      const [reasons] = await db.query(`
        SELECT mv.id, mv.value
        FROM master_values mv
        JOIN master_types mt ON mt.id = mv.master_type_id
        WHERE mt.name LIKE '%Change Bed%'
          AND mv.is_active = 1
        ORDER BY mv.value
      `);
      
      return reasons.length > 0 ? reasons : [
        { id: 1, value: 'Personal Preference' },
        { id: 2, value: 'Roommate Issues' },
        { id: 3, value: 'Better Facilities' },
        { id: 4, value: 'Rent Adjustment' },
        { id: 5, value: 'Work/Schedule Change' }
      ];
    } catch (error) {
      console.error('Error fetching change reasons:', error);
      throw error;
    }
  }

  /**
   * 2. Get current tenant assignment with all details
   */
  static async getCurrentAssignment(tenantId) {
    try {
      const [assignments] = await db.query(`
        SELECT 
          ba.id as assignment_id,
          ba.room_id,
          ba.bed_number,
          ba.tenant_id,
          ba.tenant_gender,
          r.room_number,
          r.sharing_type,
          r.total_bed,
          r.occupied_beds,
          r.rent_per_bed,
          r.current_occupants_gender,
          r.room_gender_preference,
          t.full_name as tenant_name,
          t.gender as tenant_gender,
          t.check_in_date, 
          p.name as property_name,
          p.id as property_id
        FROM bed_assignments ba
        JOIN rooms r ON r.id = ba.room_id
        JOIN tenants t ON t.id = ba.tenant_id
        LEFT JOIN properties p ON p.id = r.property_id
        WHERE ba.tenant_id = ? 
          AND ba.is_available = FALSE
        LIMIT 1
      `, [tenantId]);

      if (assignments.length === 0) {
        throw new Error('Tenant is not currently assigned to any bed');
      }

      const assignment = assignments[0];
      
      // Parse JSON fields safely
      assignment.room_gender_preference = this.parseGenderPreferences(
        assignment.room_gender_preference
      );
      
      return assignment;
    } catch (error) {
      console.error('Error fetching current assignment:', error);
      throw error;
    }
  }

  /**
   * 3. Get distinct sharing types from active rooms
   */
  static async getSharingTypes() {
    try {
      const [types] = await db.query(`
        SELECT DISTINCT sharing_type 
        FROM rooms 
        WHERE sharing_type IS NOT NULL 
          AND sharing_type != ''
          AND is_active = 1
        ORDER BY 
          CASE sharing_type
            WHEN 'single' THEN 1
            WHEN 'double' THEN 2
            WHEN 'triple' THEN 3
            ELSE 4
          END
      `);
      
      return types.map(t => t.sharing_type);
    } catch (error) {
      console.error('Error fetching sharing types:', error);
      return ['single', 'double', 'triple'];
    }
  }

  /**
   * 4. FIXED: Get compatible rooms based on tenant gender and sharing type
   */
  static async getCompatibleRooms(data) {
    const { tenantId, sharingType = null, propertyId = null } = data;
    
    try {
      // First get tenant details
      const [tenant] = await db.query(
        `SELECT id, full_name, gender FROM tenants WHERE id = ?`,
        [tenantId]
      );
      
      if (tenant.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const tenantGender = tenant[0].gender;
      console.log(`\n🎯 [COMPATIBLE ROOMS] Tenant ${tenantId} (${tenantGender})`);

      // Get current assignment to exclude current room
      let currentAssignment;
      try {
        currentAssignment = await this.getCurrentAssignment(tenantId);
      } catch (error) {
        throw new Error(`Cannot get current assignment: ${error.message}`);
      }
      
      console.log(`[COMPATIBLE ROOMS] Current room: ${currentAssignment.room_number} (ID: ${currentAssignment.room_id})`);
      
      // Build query to fetch all available rooms
      let query = `
        SELECT 
          r.id,
          r.room_number,
          r.sharing_type,
          r.total_bed,
          r.occupied_beds,
          r.rent_per_bed,
          r.current_occupants_gender,
          r.room_gender_preference,
          r.floor,
          r.is_active,
          p.name as property_name,
          p.id as property_id,
          (r.total_bed - r.occupied_beds) as available_beds
        FROM rooms r
        LEFT JOIN properties p ON p.id = r.property_id
        WHERE r.is_active = 1
          AND (r.total_bed - r.occupied_beds) > 0
          AND r.id != ?
      `;

      const params = [currentAssignment.room_id];

      // Filter by sharing type if provided
      if (sharingType && sharingType !== '') {
        query += ` AND r.sharing_type = ?`;
        params.push(sharingType);
      }

      // Filter by property if provided
      if (propertyId) {
        query += ` AND r.property_id = ?`;
        params.push(propertyId);
      }

      query += ` ORDER BY r.property_id, r.floor, r.room_number ASC`;

      console.log(`[COMPATIBLE ROOMS] Querying available rooms...`);
      const [rooms] = await db.query(query, params);
      console.log(`[COMPATIBLE ROOMS] Found ${rooms.length} available rooms in DB`);

      // Process rooms for gender compatibility
      const compatibleRooms = [];
      const roomsToCheck = [];

      console.log(`\n🔍 [GENDER COMPATIBILITY CHECK]:`);
      for (const room of rooms) {
        const roomPreferences = this.parseGenderPreferences(room.room_gender_preference);
        const isCompatible = this.isGenderCompatible(tenantGender, roomPreferences);
        
        console.log(`  Room ${room.room_number}: ${isCompatible ? '✓' : '✗'}`, {
          raw_prefs: room.room_gender_preference,
          parsed_prefs: roomPreferences,
          compatible: isCompatible
        });
        
        if (isCompatible) {
          roomsToCheck.push({
            ...room,
            normalized_preferences: roomPreferences
          });
        }
      }

      console.log(`\n[COMPATIBLE ROOMS] ${roomsToCheck.length} rooms passed gender check`);

      // Get occupants for all compatible rooms
      const roomIds = roomsToCheck.map(r => r.id);
      const allOccupants = await this.getRoomOccupantsBatch(roomIds);

      // Build final compatible rooms array
      console.log(`\n🏗️ [BUILDING FINAL ROOM OBJECTS]:`);
      for (const room of roomsToCheck) {
        const roomId = room.id;
        const occupants = allOccupants[roomId] || [];
        
        // Calculate values using FIXED methods
        const occupantsCount = this.calculateOccupantsCount(occupants);
        const occupantsGender = this.deriveOccupantsGender(occupants);
        
        // Separate available and occupied beds
        const occupiedBeds = occupants.filter(o => {
          const hasTenant = o.tenant_id !== null && o.tenant_id !== undefined;
          const isNotAvailable = o.is_available === false || o.is_available === 0;
          const isNotVacant = o.is_vacant === false;
          return hasTenant && (isNotAvailable || isNotVacant);
        });
        
        const availableBeds = occupants.filter(o => !occupiedBeds.includes(o));
        
        console.log(`\n  Room ${room.room_number} (ID: ${roomId}):`);
        console.log(`    DB occupied_beds: ${room.occupied_beds}`);
        console.log(`    Calculated count: ${occupantsCount}`);
        console.log(`    Occupied beds found: ${occupiedBeds.length}`);
        console.log(`    Available beds: ${availableBeds.length}`);
        console.log(`    Gender: ${occupantsGender}`);
        
        // If there's a discrepancy, log it
        if (room.occupied_beds > 0 && occupantsCount === 0) {
          console.log(`    ⚠️ WARNING: DB says ${room.occupied_beds} occupied, but calculation shows 0!`);
          console.log(`    Checking data mismatch...`);
          
          // Try alternative calculation
          const altCount = occupants.filter(o => o.tenant_id !== null).length;
          console.log(`    Alternative count (any tenant_id): ${altCount}`);
        }
        
        const roomObj = {
          id: room.id,
          room_number: room.room_number,
          sharing_type: room.sharing_type,
          total_bed: room.total_bed,
          occupied_beds: room.occupied_beds,
          available_beds: room.available_beds,
          rent_per_bed: room.rent_per_bed,
          floor: room.floor,
          property_name: room.property_name,
          property_id: room.property_id,
          room_gender_preference: room.normalized_preferences,
          occupants_gender: occupantsGender,
          occupants_count: occupantsCount > 0 ? occupantsCount : room.occupied_beds, // Fallback to DB value
          current_occupants: occupiedBeds.map(bed => ({
            tenant_id: bed.tenant_id,
            full_name: bed.full_name,
            gender: bed.gender,
            bed_number: bed.bed_number,
            assignment_id: bed.assignment_id
          })),
          available_beds_list: availableBeds.map(b => ({
            bed_number: b.bed_number,
            assignment_id: b.assignment_id
          })),
          is_active: room.is_active
        };
        
        compatibleRooms.push(roomObj);
        
        console.log(`    ✅ Final: ${roomObj.occupants_count} occupants`);
      }

      console.log(`\n✅ [COMPATIBLE ROOMS COMPLETE]`);
      console.log(`Returning ${compatibleRooms.length} rooms`);
      
      return compatibleRooms;
    } catch (error) {
      console.error('[MODEL] Error in getCompatibleRooms:', error);
      throw error;
    }
  }

  /**
   * 5. Get ALL beds in a room with occupancy status
   */
  static async getAvailableBedsInRoom(roomId) {
    try {
      console.log(`[MODEL] Getting all beds for room ${roomId}`);
      
      // Get room details first
      const [room] = await db.query(`
        SELECT 
          r.id,
          r.room_number,
          r.total_bed,
          r.occupied_beds,
          r.rent_per_bed,
          r.sharing_type
        FROM rooms r
        WHERE r.id = ? AND r.is_active = 1
      `, [roomId]);

      if (room.length === 0) {
        throw new Error('Room not found or inactive');
      }

      const roomData = room[0];
      
      // Get ALL beds from bed_assignments with tenant info
      const [beds] = await db.query(`
        SELECT 
          ba.id,
          ba.bed_number,
          ba.is_available,
          ba.room_id,
          t.id as tenant_id,
          t.full_name as tenant_name,
          t.gender as tenant_gender,
          ba.tenant_gender as bed_tenant_gender
        FROM bed_assignments ba
        LEFT JOIN tenants t ON t.id = ba.tenant_id
        WHERE ba.room_id = ?
        ORDER BY ba.bed_number ASC
      `, [roomId]);

      console.log(`[MODEL] Found ${beds.length} bed assignments in room ${roomId}`);

      // If no bed assignments exist but room has capacity
      if (beds.length === 0 && roomData.total_bed > 0) {
        console.log(`[MODEL] Creating virtual beds for room ${roomId}`);
        const virtualBeds = [];
        
        for (let i = 1; i <= roomData.total_bed; i++) {
          virtualBeds.push({
            id: null,
            bed_number: i,
            is_available: true,
            room_id: parseInt(roomId),
            tenant_id: null,
            tenant_name: null,
            tenant_gender: null,
            bed_tenant_gender: null
          });
        }
        
        return {
          room_info: roomData,
          beds: virtualBeds,
          total_beds: roomData.total_bed,
          occupied_beds: 0,
          available_beds: roomData.total_bed
        };
      }

      // Check if we need to create missing beds
      const existingBedNumbers = beds.map(b => b.bed_number);
      const allBeds = [...beds];
      
      for (let i = 1; i <= roomData.total_bed; i++) {
        if (!existingBedNumbers.includes(i)) {
          allBeds.push({
            id: null,
            bed_number: i,
            is_available: true,
            room_id: parseInt(roomId),
            tenant_id: null,
            tenant_name: null,
            tenant_gender: null,
            bed_tenant_gender: null
          });
        }
      }
      
      // Sort by bed number
      allBeds.sort((a, b) => a.bed_number - b.bed_number);
      
      // Count correctly
      const occupiedCount = allBeds.filter(b => 
        b.is_available === false && b.tenant_id
      ).length;
      
      const availableCount = allBeds.filter(b => 
        b.is_available === true
      ).length;

      return {
        room_info: roomData,
        beds: allBeds,
        total_beds: roomData.total_bed,
        occupied_beds: occupiedCount,
        available_beds: availableCount
      };
    } catch (error) {
      console.error('[MODEL] Error in getAvailableBedsInRoom:', error);
      throw error;
    }
  }

  /**
   * 6. Calculate rent difference between old and new room
   */
  static async calculateRentDifference(oldRoomId, newRoomId) {
    try {
      console.log(`[MODEL] Calculating rent difference: old=${oldRoomId}, new=${newRoomId}`);
      
      const [rooms] = await db.query(`
        SELECT 
          r1.id as old_room_id,
          r1.room_number as old_room_number,
          r1.rent_per_bed as old_rent,
          r2.id as new_room_id,
          r2.room_number as new_room_number,
          r2.rent_per_bed as new_rent
        FROM rooms r1, rooms r2
        WHERE r1.id = ? AND r2.id = ?
      `, [oldRoomId, newRoomId]);

      if (rooms.length === 0) {
        throw new Error('One or both rooms not found');
      }

      const result = rooms[0];
      const oldRent = parseFloat(result.old_rent) || 0;
      const newRent = parseFloat(result.new_rent) || 0;
      const difference = newRent - oldRent;

      return {
        old_room_id: result.old_room_id,
        old_room_number: result.old_room_number,
        old_rent: oldRent,
        new_room_id: result.new_room_id,
        new_room_number: result.new_room_number,
        new_rent: newRent,
        difference: parseFloat(difference.toFixed(2)),
        type: difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'same'
      };
    } catch (error) {
      console.error('[MODEL] Error in calculateRentDifference:', error);
      throw error;
    }
  }

  /**
   * 7. Execute bed change with transaction
   */
  static async executeBedChange(data) {
    const {
      tenantId,
      currentAssignmentId,
      newRoomId,
      newBedNumber,
      changeReasonId = null,
      shiftingDate = null,
      notes = ''
    } = data;

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log(`[MODEL] Starting bed change transaction for tenant ${tenantId}`);

      // 1. Get current assignment details
      const [currentAssignment] = await connection.query(`
        SELECT 
          room_id as old_room_id, 
          bed_number as old_bed_number, 
          tenant_gender,
          tenant_id
        FROM bed_assignments 
        WHERE id = ? AND tenant_id = ? AND is_available = FALSE
      `, [currentAssignmentId, tenantId]);

      if (currentAssignment.length === 0) {
        throw new Error('Current bed assignment not found or already vacated');
      }

      const oldRoomId = currentAssignment[0].old_room_id;
      const oldBedNumber = currentAssignment[0].old_bed_number;
      const tenantGender = currentAssignment[0].tenant_gender;

      // 2. Check if new bed is available
      const [newBedCheck] = await connection.query(`
        SELECT id, is_available, tenant_id 
        FROM bed_assignments 
        WHERE room_id = ? AND bed_number = ?
      `, [newRoomId, newBedNumber]);

      let newBedAssignmentId;

      if (newBedCheck.length === 0) {
        // Create new bed assignment
        console.log(`[MODEL] Creating new bed assignment for room ${newRoomId}, bed ${newBedNumber}`);
        
        const [insertResult] = await connection.query(`
          INSERT INTO bed_assignments 
          (room_id, bed_number, tenant_id, tenant_gender, is_available, created_at)
          VALUES (?, ?, ?, ?, FALSE, NOW())
        `, [newRoomId, newBedNumber, tenantId, tenantGender]);
        
        newBedAssignmentId = insertResult.insertId;
      } else {
        const bed = newBedCheck[0];
        if (!bed.is_available) {
          throw new Error(`Bed ${newBedNumber} in room ${newRoomId} is already occupied`);
        }
        
        newBedAssignmentId = bed.id;
        
        // Update existing bed assignment
        await connection.query(`
          UPDATE bed_assignments 
          SET tenant_id = ?, tenant_gender = ?, is_available = FALSE
          WHERE id = ?
        `, [tenantId, tenantGender, newBedAssignmentId]);
      }

      // 3. Vacate old bed
      await connection.query(`
        UPDATE bed_assignments 
        SET tenant_id = NULL, tenant_gender = NULL, is_available = TRUE
        WHERE id = ?
      `, [currentAssignmentId]);

      // 4. Update room occupancy counts
      await this.updateRoomOccupancy(oldRoomId, connection);
      await this.updateRoomOccupancy(newRoomId, connection);

      // 5. Create change log
      try {
        const [logResult] = await connection.query(`
          INSERT INTO bed_change_logs 
          (tenant_id, old_room_id, old_bed_number, new_room_id, new_bed_number, 
           change_reason_id, shifting_date, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          tenantId, oldRoomId, oldBedNumber, newRoomId, newBedNumber,
          changeReasonId, shiftingDate, notes
        ]);
        console.log(`[MODEL] Change log created with ID: ${logResult.insertId}`);
      } catch (logError) {
        console.log('[MODEL] Bed change log creation skipped:', logError.message);
      }

      await connection.commit();
      console.log(`[MODEL] Bed change transaction completed successfully`);

      return {
        success: true,
        message: 'Bed changed successfully',
        data: {
          old_room_id: oldRoomId,
          old_bed_number: oldBedNumber,
          new_room_id: newRoomId,
          new_bed_number: newBedNumber,
          new_assignment_id: newBedAssignmentId,
          shifting_date: shiftingDate || new Date().toISOString().split('T')[0]
        }
      };
    } catch (error) {
      await connection.rollback();
      console.error('[MODEL] Error in executeBedChange:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Helper: Update room occupancy counts and gender list
   */
  static async updateRoomOccupancy(roomId, connection) {
    try {
      // Get current occupants from bed_assignments
      const [occupants] = await connection.query(`
        SELECT DISTINCT t.gender
        FROM bed_assignments ba
        JOIN tenants t ON t.id = ba.tenant_id
        WHERE ba.room_id = ? 
          AND ba.is_available = FALSE
          AND ba.tenant_id IS NOT NULL
      `, [roomId]);

      const genders = occupants.map(occ => occ.gender).filter(g => g);
      
      // Count occupied beds
      const [occupiedCount] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM bed_assignments 
        WHERE room_id = ? AND is_available = FALSE AND tenant_id IS NOT NULL
      `, [roomId]);
      
      const occupiedBeds = occupiedCount[0].count || 0;
      
      // Update room record
      await connection.query(`
        UPDATE rooms 
        SET 
          current_occupants_gender = ?,
          occupied_beds = ?
        WHERE id = ?
      `, [JSON.stringify(genders), occupiedBeds, roomId]);
      
      console.log(`[MODEL] Room ${roomId} updated: ${occupiedBeds} occupied beds, genders:`, genders);
    } catch (error) {
      console.error(`[MODEL] Error updating occupancy for room ${roomId}:`, error);
      throw error;
    }
  }
}

module.exports = ChangeBedModel;