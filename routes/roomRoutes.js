const express = require("express");
const router = express.Router();
const RoomController = require("../controllers/roomController");
const tenantAuth = require("../middleware/tenantAuth");
const roomUpload = require("../middleware/roomUpload");


router.get("/", RoomController.getAllRooms);
router.get("/property/:propertyId", RoomController.getRoomsByPropertyId);
router.get("/:id", RoomController.getRoomById);
router.post(
  "/",
  roomUpload.upload,           // multer upload
  roomUpload.compressRoomMedia, // compression middleware
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


router.get('/tenant-assignment/:tenant_id', RoomController.getTenantAssignment);
router.post('/bulk-update', RoomController.bulkUpdateRooms);
router.post('/filter', RoomController.getFilteredRooms);
router.get('/filters/data', RoomController.getRoomFiltersData);



module.exports = router;