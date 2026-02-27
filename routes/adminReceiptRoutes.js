// routes/adminReceiptRoutes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const controller = require("../controllers/adminReceiptController");

router.get("/", adminAuth, controller.getReceiptRequests);
router.put("/:id", adminAuth, controller.updateReceiptRequest);
router.post("/:id/generate", adminAuth, controller.generateReceipt);
router.post("/bulk-delete", adminAuth, controller.bulkDeleteReceiptRequests);

module.exports = router;