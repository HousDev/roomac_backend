// propertyRoutes.js में
const express = require("express");
const router = express.Router();
const PropertyController = require("../controllers/propertyController");
const { upload, compressImages } = require("../middleware/upload");


// Routes
router.get('/bulk-tags-info', PropertyController.getBulkTagsInfo);
router.get("/", PropertyController.list);
router.get("/:id", PropertyController.getById);
router.get("/:id/debug", PropertyController.debug); 


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


module.exports = router;