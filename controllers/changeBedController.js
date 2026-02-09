const ChangeBedModel = require('../models/changeBedModel');

class ChangeBedController {
  // 1. Get change reasons
  static async getChangeReasons(req, res) {
    try {
      console.log(`[CONTROLLER] Getting change reasons`);
      const reasons = await ChangeBedModel.getChangeReasons();
      
      res.json({
        success: true,
        data: reasons,
        message: "Change reasons fetched successfully"
      });
    } catch (error) {
      console.error('[CONTROLLER] Error getting change reasons:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch change reasons'
      });
    }
  }

  // 2. Get sharing types
  static async getSharingTypes(req, res) {
    try {
      console.log(`[CONTROLLER] Getting sharing types`);
      const sharingTypes = await ChangeBedModel.getSharingTypes();
      
      res.json({
        success: true,
        data: sharingTypes,
        message: "Sharing types fetched successfully"
      });
    } catch (error) {
      console.error('[CONTROLLER] Error getting sharing types:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch sharing types'
      });
    }
  }

  // 3. Get current assignment
  static async getCurrentAssignment(req, res) {
    try {
      const { tenantId } = req.params;
      console.log(`[CONTROLLER] Getting current assignment for tenant ${tenantId}`);
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: "Tenant ID is required"
        });
      }

      const assignment = await ChangeBedModel.getCurrentAssignment(parseInt(tenantId));
      
      res.json({
        success: true,
        data: assignment,
        message: "Current assignment fetched successfully"
      });
    } catch (error) {
      console.error('[CONTROLLER] Error getting current assignment:', error);
      
      const status = error.message.includes('not assigned') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  // 4. Get compatible rooms
  // static async getCompatibleRooms(req, res) {
  //   try {
  //     const { tenantId, sharingType, propertyId } = req.query;
  //     console.log(`[CONTROLLER] Getting compatible rooms for tenant ${tenantId}, sharing: ${sharingType}, property: ${propertyId}`);
      
  //     if (!tenantId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Tenant ID is required"
  //       });
  //     }

  //     const rooms = await ChangeBedModel.getCompatibleRooms({
  //       tenantId: parseInt(tenantId),
  //       sharingType: sharingType || null,
  //       propertyId: propertyId ? parseInt(propertyId) : null
  //     });

  //     // Also get current assignment for context
  //     let currentAssignment;
  //     try {
  //       currentAssignment = await ChangeBedModel.getCurrentAssignment(parseInt(tenantId));
  //     } catch (error) {
  //       console.log('[CONTROLLER] Could not fetch current assignment:', error.message);
  //       currentAssignment = null;
  //     }
      
  //     res.json({
  //       success: true,
  //       data: {
  //         current_assignment: currentAssignment,
  //         compatible_rooms: rooms,
  //         total_rooms_found: rooms.length
  //       },
  //       message: "Compatible rooms fetched successfully"
  //     });
  //   } catch (error) {
  //     console.error('[CONTROLLER] Error getting compatible rooms:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: error.message || 'Failed to fetch compatible rooms'
  //     });
  //   }
  // }
  // In getCompatibleRooms controller method
// In changeBedController.js, modify getCompatibleRooms method:

static async getCompatibleRooms(req, res) {
  try {
    const { tenantId, sharingType, propertyId } = req.query;
    console.log(`\n🔍 [CONTROLLER] Getting compatible rooms for tenant ${tenantId}`);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const rooms = await ChangeBedModel.getCompatibleRooms({
      tenantId: parseInt(tenantId),
      sharingType: sharingType || null,
      propertyId: propertyId ? parseInt(propertyId) : null
    });

    // EMERGENCY FIX: Ensure occupants_count is never 0 if room has occupants
    const fixedRooms = rooms.map(room => {
      // If DB says room has occupied beds but our calculation says 0, use DB value
      if (room.occupied_beds > 0 && room.occupants_count === 0) {
        console.log(`⚠️ [CONTROLLER FIX] Room ${room.room_number}: DB has ${room.occupied_beds} occupied beds, but calculation shows 0`);
        console.log(`   Using DB value: ${room.occupied_beds}`);
        
        // Update occupants_count to match DB
        room.occupants_count = room.occupied_beds;
        
        // If we have current_occupants data but count is wrong, log it
        if (room.current_occupants && room.current_occupants.length > 0) {
          console.log(`   But current_occupants has ${room.current_occupants.length} entries!`);
          console.log('   Occupants:', room.current_occupants.map(o => ({
            name: o.full_name,
            bed: o.bed_number
          })));
        }
      }
      return room;
    });

    // Get current assignment
    let currentAssignment;
    try {
      currentAssignment = await ChangeBedModel.getCurrentAssignment(parseInt(tenantId));
    } catch (error) {
      console.log('[CONTROLLER] Could not fetch current assignment:', error.message);
      currentAssignment = null;
    }
    
    // Log final results
    console.log(`\n✅ [CONTROLLER FINAL] Returning ${fixedRooms.length} rooms:`);
    fixedRooms.forEach(room => {
      console.log(`   Room ${room.room_number}: ${room.occupants_count} occupants`);
    });
    
    res.json({
      success: true,
      data: {
        current_assignment: currentAssignment,
        compatible_rooms: fixedRooms,
        total_rooms_found: fixedRooms.length
      },
      message: "Compatible rooms fetched successfully"
    });
  } catch (error) {
    console.error('[CONTROLLER] Error getting compatible rooms:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch compatible rooms'
    });
  }
}

  // 5. Get ALL beds in a room (available + occupied with details)
  static async getAvailableBeds(req, res) {
    try {
      const { roomId } = req.query;
      console.log(`[CONTROLLER] Getting all beds for room ${roomId}`);
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: "Room ID is required"
        });
      }

      const result = await ChangeBedModel.getAvailableBedsInRoom(parseInt(roomId));
      
      // Format response for frontend
      const formattedBeds = result.beds.map(bed => ({
        bed_assignment_id: bed.id,
        bed_number: bed.bed_number,
        is_available: bed.is_available,
        room_id: bed.room_id,
        tenant_id: bed.tenant_id,
        tenant_name: bed.tenant_name,
        tenant_gender: bed.tenant_gender || bed.bed_tenant_gender,
        status: bed.is_available ? 'available' : 'occupied'
      }));
      
      res.json({
        success: true,
        data: {
          room_info: result.room_info,
          beds: formattedBeds,
          total_beds: result.total_beds,
          occupied_beds: result.occupied_beds,
          available_beds: result.available_beds
        },
        message: "Beds information fetched successfully"
      });
    } catch (error) {
      console.error('[CONTROLLER] Error getting available beds:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch beds information'
      });
    }
  }

  // 6. Calculate rent difference
  static async calculateRentDifference(req, res) {
    try {
      const { oldRoomId, newRoomId } = req.query;
      console.log(`[CONTROLLER] Calculating rent difference: old=${oldRoomId}, new=${newRoomId}`);
      
      if (!oldRoomId || !newRoomId) {
        return res.status(400).json({
          success: false,
          message: "Both old and new room IDs are required"
        });
      }

      const difference = await ChangeBedModel.calculateRentDifference(
        parseInt(oldRoomId),
        parseInt(newRoomId)
      );
      
      res.json({
        success: true,
        data: difference,
        message: "Rent difference calculated successfully"
      });
    } catch (error) {
      console.error('[CONTROLLER] Error calculating rent difference:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate rent difference'
      });
    }
  }

  // 7. Execute bed change
  static async executeBedChange(req, res) {
    try {
      const {
        tenantId,
        currentAssignmentId,
        newRoomId,
        newBedNumber,
        changeReasonId,
        shiftingDate,
        notes
      } = req.body;
      
      console.log(`[CONTROLLER] Executing bed change:`, {
        tenantId,
        currentAssignmentId,
        newRoomId,
        newBedNumber
      });

      // Validate required fields
      if (!tenantId || !currentAssignmentId || !newRoomId || !newBedNumber) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: tenantId, currentAssignmentId, newRoomId, newBedNumber"
        });
      }

      const result = await ChangeBedModel.executeBedChange({
        tenantId: parseInt(tenantId),
        currentAssignmentId: parseInt(currentAssignmentId),
        newRoomId: parseInt(newRoomId),
        newBedNumber: parseInt(newBedNumber),
        changeReasonId: changeReasonId ? parseInt(changeReasonId) : null,
        shiftingDate: shiftingDate || new Date().toISOString().split('T')[0],
        notes: notes || ''
      });

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('[CONTROLLER] Error executing bed change:', error);
      
      let status = 500;
      let message = error.message || 'Failed to execute bed change';
      
      if (error.message.includes('already occupied')) {
        status = 409; // Conflict
      } else if (error.message.includes('not found')) {
        status = 404;
      }
      
      res.status(status).json({
        success: false,
        message: message
      });
    }
  }
}

module.exports = ChangeBedController;