// routes/roomRoutes.js
const express = require("express");
const router = express.Router();
const RoomController = require("../controllers/roomController");
const tenantAuth = require("../middleware/tenantAuth");
const roomUpload = require("../middleware/roomUpload");
const uploadImport = require("../middleware/uploadImport"); 


router.get("/", RoomController.getAllRooms);
router.get("/property/:propertyId", RoomController.getRoomsByPropertyId);
router.get("/:id", RoomController.getRoomById);
router.post(
  "/",
  roomUpload.upload,           
  roomUpload.compressRoomMedia, 
  RoomController.createRoom
);
router.put(
  "/:id",
  roomUpload.upload,
  roomUpload.compressRoomMedia,
  RoomController.updateRoom
);

router.delete("/:id", RoomController.deleteRoom);

// Bed assignment routes
router.get("/:id/available-beds", RoomController.getAvailableBeds);
router.post("/assign-bed", RoomController.assignBed);
router.put("/bed-assignments/:id", RoomController.updateBedAssignment);
router.post('/bed-assignments/:id/vacate', RoomController.vacateBed);
// Add this route
router.get('/:roomId/available-beds', tenantAuth, RoomController.getAvailableBedsForRoom);

// routes/roomRoutes.js
router.get("/tenant-bed/:tenantId", RoomController.getTenantBedAssignment);
router.get('/tenant-assignment/:tenant_id', RoomController.getTenantAssignment);
router.post('/bulk-update', RoomController.bulkUpdateRooms);
router.post('/filter', RoomController.getFilteredRooms);
router.get('/filters/data', RoomController.getRoomFiltersData);

router.post(
  "/import",
  uploadImport.single("file"),
  RoomController.import
);

// In your roomRoutes.js or vacateRoutes.js
router.get('/vacate/initial-data/:bedAssignmentId', RoomController.getVacateInitialData);


module.exports = router;