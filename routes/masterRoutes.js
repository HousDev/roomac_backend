// routes/masterRoutes.js
const router = require("express").Router();
const ctrl = require("../controllers/masterController");

/* MASTER TYPES */
router.get("/types", ctrl.getMasterTypes);
router.post("/types", ctrl.createMasterType);
router.put("/types/:id", ctrl.updateMasterType);
router.delete("/types/:id", ctrl.deleteMasterType);
router.patch("/types/:id/status", ctrl.toggleMasterTypeStatus);
router.get("/types/:id", ctrl.getMasterTypeById);
router.get("/types/code/:code", ctrl.getMasterTypeByCode);
router.get("/types-codes", ctrl.getAllMasterTypeCodes);

/* TABS */
router.get("/tabs", ctrl.getTabs);
router.post("/tabs", ctrl.createTab); 
router.put("/tabs/:tabName", ctrl.updateTab); 
router.delete("/tabs/:tabName", ctrl.deleteTab); 
router.post("/tabs/create-with-type", ctrl.createTabWithFirstType);
router.get("/types/tab/:tab", ctrl.getMasterTypesByTab);

/* MASTER VALUES */
router.get("/values/:typeId", ctrl.getMasterValues);
router.post("/values", ctrl.createMasterValue);
router.put("/values/:id", ctrl.updateMasterValue);
router.delete("/values/:id", ctrl.deleteMasterValue);
router.patch("/values/:id/status", ctrl.toggleMasterValueStatus);

/* VALUES BY CODE */
router.get('/values/code/:code', ctrl.getValuesByCode);
router.get('/active-values/code/:code', ctrl.getActiveValuesByCode);

/* EXPORT */
router.get("/export/types", ctrl.exportMasterTypes);
router.get("/export/values/:typeId", ctrl.exportMasterValues);

/* BACKWARD COMPATIBILITY */
router.get('/values-by-type/:typeName', ctrl.getValuesByType);

module.exports = router;