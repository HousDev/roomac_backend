// propertyRoutes.js में
const express = require("express");
const router = express.Router();
// const upload = require("../middleware/upload");
const PropertyController = require("../controllers/propertyController");
const { upload, compressImages } = require("../middleware/upload");


// Routes
router.get('/bulk-tags-info', PropertyController.getBulkTagsInfo);
router.get("/", PropertyController.list);
router.get("/:id", PropertyController.getById);
router.get("/:id/debug", PropertyController.debug); 


// router.post(
//   "/",
//   upload.array("photos", 10),
//   PropertyController.create
// );
router.post(
  "/",
  upload.array("photos", 10),   // multer upload
  compressImages,              // 👈 compress here
  PropertyController.create   // controller
);

// router.put(
//   "/:id",
//   upload.array("photos", 10),
//   PropertyController.update
// );

router.put(
  "/:id",
  upload.array("photos", 10),   // multer upload
  compressImages,              // 👈 compress new images
  PropertyController.update
);

router.delete("/:id", PropertyController.remove);
router.post("/bulk-delete", PropertyController.bulkDelete);
router.post("/bulk-status", PropertyController.bulkStatus);
router.post("/bulk-tags", PropertyController.bulkUpdateTags); 

module.exports = router;