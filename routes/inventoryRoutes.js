// inventoryRoutes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");

// GET /api/inventory/stats
router.get("/stats", inventoryController.getInventoryStats);

// GET /api/inventory?property_id=1&category_id=2&stock_status=low_stock&search=bed
router.get("/", inventoryController.getInventory);

// GET /api/inventory/:id
router.get("/:id", inventoryController.getInventoryById);

// POST /api/inventory
router.post("/", inventoryController.createInventory);

// PUT /api/inventory/:id
router.put("/:id", inventoryController.updateInventory);

// DELETE /api/inventory/bulk  (must be before /:id)
router.delete("/bulk", inventoryController.bulkDeleteInventory);

// DELETE /api/inventory/:id
router.delete("/:id", inventoryController.deleteInventory);

module.exports = router;