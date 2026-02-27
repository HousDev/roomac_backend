const masterModel = require('../models/masterModel');

// ==================== ITEM CONTROLLERS ====================

exports.getAllItems = async (req, res) => {
  try {
    const items = await masterModel.getItems();
    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching items',
      error: error.message
    });
  }
};

exports.getItemsByTab = async (req, res) => {
  try {
    const { tab_name } = req.params;
    const items = await masterModel.getItemsByTab(tab_name);
    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching items by tab',
      error: error.message
    });
  }
};

exports.createItem = async (req, res) => {
  try {
    const newItem = await masterModel.createItem(req.body);
    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: newItem
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating item',
      error: error.message
    });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    await masterModel.updateItem(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Item updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating item',
      error: error.message
    });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    await masterModel.deleteItem(id);
    res.status(200).json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error deleting item',
      error: error.message
    });
  }
};

// ==================== VALUE CONTROLLERS ====================

exports.getValuesByItemId = async (req, res) => {
  try {
    const { master_item_id } = req.params;
    const values = await masterModel.getValues(master_item_id);
    res.status(200).json({
      success: true,
      data: values
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching values',
      error: error.message
    });
  }
};

exports.createValue = async (req, res) => {
  try {
    const newValue = await masterModel.createValue(req.body);
    res.status(201).json({
      success: true,
      message: 'Value created successfully',
      data: newValue
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating value',
      error: error.message
    });
  }
};

exports.updateValue = async (req, res) => {
  try {
    const { id } = req.params;
    await masterModel.updateValue(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Value updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating value',
      error: error.message
    });
  }
};

exports.deleteValue = async (req, res) => {
  try {
    const { id } = req.params;
    await masterModel.deleteValue(id);
    res.status(200).json({
      success: true,
      message: 'Value deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error deleting value',
      error: error.message
    });
  }
};

// ==================== CONSUME CONTROLLERS ====================

exports.getAllMasters = async (req, res) => {
  try {
    const masters = await masterModel.getAllMasters();
    res.status(200).json({
      success: true,
      data: masters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching masters',
      error: error.message
    });
  }
};

exports.getActiveItemsByTab = async (req, res) => {
  try {
    const { tab_name } = req.params;
    const items = await masterModel.getItemsByTabName(tab_name);
    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active items',
      error: error.message
    });
  }
};

exports.getActiveValuesByItemId = async (req, res) => {
  try {
    const { item_id } = req.params;
    const values = await masterModel.getValuesByItemId(item_id);
    res.status(200).json({
      success: true,
      data: values
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active values',
      error: error.message
    });
  }
};

exports.consumeMasters = async (req, res) => {
  try {
    const { tab, type } = req.query;
    const result = await masterModel.consumeMasters({ tab, type });
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error consuming masters',
      error: error.message
    });
  }
};

// ==================== UTILITY CONTROLLERS ====================

exports.getDistinctTabs = async (req, res) => {
  try {
    const tabs = await masterModel.getDistinctTabs();
    res.status(200).json({
      success: true,
      data: tabs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tabs',
      error: error.message
    });
  }
};

exports.searchItems = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    const results = await masterModel.searchItems(q);
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching items',
      error: error.message
    });
  }
};

// ==================== EXPORT CONTROLLERS ====================

exports.exportAllItems = async (req, res) => {
  try {
    const items = await masterModel.exportMasterItems();
    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting items',
      error: error.message
    });
  }
};

exports.exportItemValues = async (req, res) => {
  try {
    const { itemId } = req.params;
    const values = await masterModel.exportMasterItemValues(itemId);
    res.status(200).json({
      success: true,
      data: values
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting values',
      error: error.message
    });
  }
};

// ==================== BATCH OPERATIONS ====================

exports.bulkCreateItems = async (req, res) => {
  try {
    const { items } = req.body; // Array of items { tab_name, name, isactive }
    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const newItem = await masterModel.createItem(item);
        results.push(newItem);
      } catch (error) {
        errors.push({
          item,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${results.length} items, ${errors.length} failed`,
      data: { created: results, failed: errors }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in bulk create',
      error: error.message
    });
  }
};

exports.bulkCreateValues = async (req, res) => {
  try {
    const { master_item_id, values } = req.body; // values array { name, isactive }
    const results = [];
    const errors = [];

    for (const value of values) {
      try {
        const newValue = await masterModel.createValue({
          master_item_id,
          ...value
        });
        results.push(newValue);
      } catch (error) {
        errors.push({
          value,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${results.length} values, ${errors.length} failed`,
      data: { created: results, failed: errors }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in bulk create values',
      error: error.message
    });
  }
};

// ==================== STATUS MANAGEMENT ====================

exports.toggleItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isactive } = req.body;
    
    await masterModel.updateItem(id, { isactive });
    
    res.status(200).json({
      success: true,
      message: `Item ${isactive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error toggling item status',
      error: error.message
    });
  }
};

exports.toggleValueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isactive } = req.body;
    
    await masterModel.updateValue(id, { isactive });
    
    res.status(200).json({
      success: true,
      message: `Value ${isactive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error toggling value status',
      error: error.message
    });
  }
};