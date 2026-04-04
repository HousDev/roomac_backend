const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const ctrl = require("../controllers/adminTemplateController");
 
// ── GET all templates (with filters: ?channel=sms&category=otp&status=pending&search=)
router.get("/", adminAuth, ctrl.getTemplates);
 
// ── GET category variables
router.get("/variables/:category", adminAuth, ctrl.getCategoryVariables);
 
// ── GET AI prompt config for frontend to call Anthropic
router.post("/ai-generate", adminAuth, ctrl.aiGenerateTemplate);
 
// ── GET single template
router.get("/:id", adminAuth, ctrl.getTemplateById);
 
// ── CREATE template
router.post("/", adminAuth, ctrl.createTemplate);
 
// ── UPDATE template
router.put("/:id", adminAuth, ctrl.updateTemplate);
 
// ── APPROVE template
router.post("/:id/approve", adminAuth, ctrl.approveTemplate);
 
// ── REJECT template
router.post("/:id/reject", adminAuth, ctrl.rejectTemplate);
 
// ── DUPLICATE template
router.post("/:id/duplicate", adminAuth, ctrl.duplicateTemplate);
 
// ── INCREMENT usage count (call when template is sent)
router.post("/:id/use", adminAuth, ctrl.incrementUsage);
 
// ── BULK DELETE
router.post("/bulk-delete", adminAuth, ctrl.bulkDeleteTemplates);
 
// ── SOFT DELETE single
router.delete("/:id", adminAuth, ctrl.deleteTemplate);
 
module.exports = router;