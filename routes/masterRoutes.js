const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// ==================== ITEM ROUTES ====================
router.get('/items', masterController.getAllItems);
router.get('/items/tab/:tab_name', masterController.getItemsByTab);
router.post('/items', masterController.createItem);
router.put('/items/:id', masterController.updateItem);
router.delete('/items/:id', masterController.deleteItem);
router.patch('/items/:id/toggle', masterController.toggleItemStatus);
router.post('/items/bulk', masterController.bulkCreateItems);

// ==================== VALUE ROUTES ====================
router.get('/values/:master_item_id', masterController.getValuesByItemId);
router.post('/values', masterController.createValue);
router.put('/values/:id', masterController.updateValue);
router.delete('/values/:id', masterController.deleteValue);
router.patch('/values/:id/toggle', masterController.toggleValueStatus);
router.post('/values/bulk', masterController.bulkCreateValues);

// ==================== CONSUME ROUTES ====================
router.get('/consume/all', masterController.getAllMasters);
router.get('/consume/items/:tab_name', masterController.getActiveItemsByTab);
router.get('/consume/values/:item_id', masterController.getActiveValuesByItemId);
router.get('/consume', masterController.consumeMasters);

// ==================== UTILITY ROUTES ====================
router.get('/tabs', masterController.getDistinctTabs);
router.get('/search', masterController.searchItems);

// ==================== EXPORT ROUTES ====================
router.get('/export/items', masterController.exportAllItems);
router.get('/export/values/:itemId', masterController.exportItemValues);

module.exports = router;