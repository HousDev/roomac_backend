const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const ChangeBedRequestController = require("../controllers/adminChangeBedController");

// All routes are protected with adminAuth
router.get("/", adminAuth, ChangeBedRequestController.getChangeBedRequests);
router.get("/stats/summary", adminAuth, ChangeBedRequestController.getStatistics);
router.get("/:id", adminAuth, ChangeBedRequestController.getChangeBedRequestById);
router.put("/:id/status", adminAuth, ChangeBedRequestController.updateRequestStatus);

module.exports = router;