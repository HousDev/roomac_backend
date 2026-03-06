// propertyRoutes.js में
const express = require("express");
const router = express.Router();
const PropertyController = require("../controllers/propertyController");
const { upload, compressImages } = require("../middleware/upload");
const uploadImport = require("../middleware/uploadImport");


// Routes
router.get('/bulk-tags-info', PropertyController.getBulkTagsInfo);
router.get("/", PropertyController.list);
router.get("/:id", PropertyController.getById);
router.get("/:id/debug", PropertyController.debug); 

// Import route - add this BEFORE other POST routes
router.post(
  "/import",
  uploadImport.single("file"),
  PropertyController.import
);


router.post(
  "/",
  upload.array("photos", 10),   
  compressImages,              
  PropertyController.create   
);

router.put(
  "/:id",
  upload.array("photos", 10),   
  compressImages,              
  PropertyController.update
);

router.delete("/:id", PropertyController.remove);
router.post("/bulk-delete", PropertyController.bulkDelete);
router.post("/bulk-status", PropertyController.bulkStatus);
router.post("/bulk-tags", PropertyController.bulkUpdateTags); 
router.get("/:propertyId/occupancy-stats", PropertyController.getPropertyOccupancyStats);


module.exports = router;