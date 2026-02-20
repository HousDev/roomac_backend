// routes/masterRoutes.js
const router = require("express").Router();
const c = require("../controllers/masterController");

// CONSUMPTION API (forms, modules)
router.get("/consume", c.consumeMasters);
/* TABS */
router.get("/tabs", c.getTabs);
router.post("/tabs", c.createTab);
router.put("/tabs/:id", c.updateTab);
router.delete("/tabs/:id", c.deleteTab);

/* ITEMS */
router.get("/items", c.getItems);
router.get("/items/tab/:tab_id", c.getItemsByTab);
router.post("/items", c.createItem);
router.put("/items/:id", c.updateItem);
router.delete("/items/:id", c.deleteItem);

/* VALUES */
router.get("/values/:item_id", c.getValues);
router.post("/values", c.createValue);
router.put("/values/:id", c.updateValue);
router.delete("/values/:id", c.deleteValue);

/* EXPORT */
router.get("/export/items", c.exportMasterItems);
router.get("/export/values/:itemId", c.exportMasterItemValues);

// Get everything (no hardcoding)
router.get("/", c.getAll);

// Get items by tab_id
router.get("/:tab_id", c.getByTabId);
router.get("/values", c.getMasterValues);

module.exports = router;