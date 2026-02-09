// controllers/masterController.js
const service = require("../models/masterModel");

/* ===== MASTER TYPES ===== */

exports.getMasterTypes = async (req, res) => {
  try {
    const data = await service.getMasterTypes();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error in getMasterTypes:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMasterTypeByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const type = await service.getMasterTypeByCode(code);
    
    if (!type) {
      return res.status(404).json({ 
        success: false, 
        error: "Master type not found" 
      });
    }
    
    res.json({ success: true, data: type });
  } catch (error) {
    console.error("Error in getMasterTypeByCode:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createMasterType = async (req, res) => {
  try {
    const { code, name, tab = "General", is_active = true, description } = req.body;
    
    if (!code || !code.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Type code is required" 
      });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Type name is required" 
      });
    }
    
    const result = await service.createMasterType({
      code: code.trim(),
      name: name.trim(),
      tab: tab.trim(),
      is_active,
      description: description ? description.trim() : null
    });
    
    res.json({ 
      success: true, 
      message: "Master type created successfully", 
      data: result 
    });
  } catch (error) {
    console.error("Error in createMasterType:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateMasterType = async (req, res) => {
  try {
    const { name, tab = "General", is_active, description } = req.body;
    const { id } = req.params;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Type name is required" 
      });
    }
    
    await service.updateMasterType(id, {
      name: name.trim(),
      tab: tab.trim(),
      is_active,
      description: description ? description.trim() : null
    });
    
    res.json({ 
      success: true, 
      message: "Master type updated successfully" 
    });
  } catch (error) {
    console.error("Error in updateMasterType:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteMasterType = async (req, res) => {
  try {
    await service.deleteMasterType(req.params.id);
    res.json({ 
      success: true, 
      message: "Master type deleted successfully" 
    });
  } catch (error) {
    console.error("Error in deleteMasterType:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.toggleMasterTypeStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    await service.toggleMasterTypeStatus(req.params.id, is_active);
    res.json({ 
      success: true, 
      message: "Status updated successfully" 
    });
  } catch (error) {
    console.error("Error in toggleMasterTypeStatus:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMasterTypeById = async (req, res) => {
  try {
    const type = await service.getMasterTypeById(req.params.id);
    if (!type) {
      return res.status(404).json({ 
        success: false, 
        error: "Master type not found" 
      });
    }
    res.json({ success: true, data: type });
  } catch (error) {
    console.error("Error in getMasterTypeById:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ===== TABS ===== */

exports.getTabs = async (req, res) => {
  try {
    const tabs = await service.getTabs();
    res.json({ success: true, data: tabs });
  } catch (error) {
    console.error("Error in getTabs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// NEW: Create a tab
exports.createTab = async (req, res) => {
  try {
    const { name, description, is_active = true } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Tab name is required" 
      });
    }
    
    const result = await service.createTab({
      name: name.trim(),
      description: description ? description.trim() : null,
      is_active
    });
    
    res.json({ 
      success: true, 
      message: "Tab created successfully", 
      data: result 
    });
  } catch (error) {
    console.error("Error in createTab:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// NEW: Update a tab (rename it)
exports.updateTab = async (req, res) => {
  try {
    const { tabName } = req.params;
    const { name, description, is_active } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "New tab name is required" 
      });
    }
    
    const result = await service.updateTab(tabName, {
      name: name.trim(),
      description: description ? description.trim() : null,
      is_active
    });
    
    res.json({ 
      success: true, 
      message: "Tab updated successfully", 
      data: result 
    });
  } catch (error) {
    console.error("Error in updateTab:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// NEW: Delete a tab
exports.deleteTab = async (req, res) => {
  try {
    const { tabName } = req.params;
    
    if (!tabName || tabName === 'General') {
      return res.status(400).json({ 
        success: false, 
        error: "Cannot delete General tab" 
      });
    }
    
    const result = await service.deleteTab(tabName);
    
    res.json({ 
      success: true, 
      message: "Tab deleted successfully", 
      data: result 
    });
  } catch (error) {
    console.error("Error in deleteTab:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMasterTypesByTab = async (req, res) => {
  try {
    const { tab } = req.params;
    const data = await service.getMasterTypesByTab(tab);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error in getMasterTypesByTab:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllMasterTypeCodes = async (req, res) => {
  try {
    const types = await service.getAllMasterTypeCodes();
    res.json({ success: true, data: types });
  } catch (error) {
    console.error("Error in getAllMasterTypeCodes:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ===== MASTER VALUES ===== */

exports.getValuesByCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Master type code is required"
      });
    }
    
    const values = await service.getValuesByCode(code);
    res.json({
      success: true,
      data: values
    });
    
  } catch (error) {
    console.error("getValuesByCode error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch master values"
    });
  }
};

exports.getActiveValuesByCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Master type code is required"
      });
    }
    
    const values = await service.getActiveValuesByCode(code);
    res.json({
      success: true,
      data: values
    });
    
  } catch (error) {
    console.error("getActiveValuesByCode error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch active values"
    });
  }
};

exports.getMasterValues = async (req, res) => {
  try {
    const data = await service.getMasterValues(req.params.typeId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error in getMasterValues:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createMasterValue = async (req, res) => {
  try {
    const { master_type_id, value, is_active = true } = req.body;
    
    if (!value || !value.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Value is required" 
      });
    }
    
    if (!master_type_id) {
      return res.status(400).json({ 
        success: false, 
        error: "Master type ID is required" 
      });
    }
    
    const result = await service.createMasterValue({
      master_type_id: parseInt(master_type_id),
      value: value.trim(),
      is_active
    });
    
    res.json({ 
      success: true, 
      message: "Value created successfully", 
      data: result 
    });
  } catch (error) {
    console.error("Error in createMasterValue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateMasterValue = async (req, res) => {
  try {
    console.log("📝 UPDATE VALUE REQUEST:");
    console.log("Params:", req.params);
    console.log("Body:", req.body);
    
    const { value, is_active } = req.body;
    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false, 
        error: "Valid ID is required" 
      });
    }
    
    // Validate value
    if (!value || typeof value !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: "Value must be a string" 
      });
    }
    
    const trimmedValue = value.trim();
    
    if (trimmedValue.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Value cannot be empty" 
      });
    }
    
    // Validate is_active
    const isActiveBool = Boolean(is_active);
    
    console.log("Calling service with:", {
      id: parseInt(id),
      value: trimmedValue,
      is_active: isActiveBool
    });
    
    await service.updateMasterValue(parseInt(id), {
      value: trimmedValue,
      is_active: isActiveBool
    });
    
    console.log("✅ Value updated successfully");
    
    res.json({ 
      success: true, 
      message: "Value updated successfully",
      data: {
        id: parseInt(id),
        value: trimmedValue,
        is_active: isActiveBool,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("❌ Error in updateMasterValue controller:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Internal server error",
      // Only include stack in development
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

exports.toggleMasterValueStatus = async (req, res) => {
  try {
    console.log("🔄 TOGGLE STATUS REQUEST:");
    console.log("Params:", req.params);
    console.log("Body:", req.body);
    
    const { is_active } = req.body;
    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false, 
        error: "Valid ID is required" 
      });
    }
    
    // Validate is_active
    if (is_active === undefined || is_active === null) {
      return res.status(400).json({ 
        success: false, 
        error: "is_active is required" 
      });
    }
    
    const isActiveBool = Boolean(is_active);
    
    console.log("Calling service with:", {
      id: parseInt(id),
      status: isActiveBool
    });
    
    await service.toggleMasterValueStatus(parseInt(id), isActiveBool);
    
    console.log("✅ Status updated successfully");
    
    res.json({ 
      success: true, 
      message: "Value status updated successfully",
      data: {
        id: parseInt(id),
        is_active: isActiveBool,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("❌ Error in toggleMasterValueStatus controller:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

exports.deleteMasterValue = async (req, res) => {
  try {
    await service.deleteMasterValue(req.params.id);
    res.json({ 
      success: true, 
      message: "Value deleted successfully" 
    });
  } catch (error) {
    console.error("Error in deleteMasterValue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getValuesByType = async (req, res) => {
  try {
    const { typeName } = req.params;
    
    if (!typeName) {
      return res.status(400).json({
        success: false,
        error: "Master type name is required"
      });
    }
    
    const values = await service.getValuesByType(typeName);
    res.json({
      success: true,
      data: values
    });
    
  } catch (error) {
    console.error("getValuesByType error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch master values"
    });
  }
};

/* ===== BULK OPERATIONS ===== */

exports.createTabWithFirstType = async (req, res) => {
  try {
    const { tabName, typeName } = req.body;
    
    if (!tabName || !tabName.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Tab name is required" 
      });
    }
    
    if (!typeName || !typeName.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Type name is required" 
      });
    }
    
    const result = await service.createTabWithFirstType(
      tabName.trim(), 
      typeName.trim()
    );
    
    res.json({ 
      success: true, 
      message: "Tab created with first type", 
      data: result 
    });
  } catch (error) {
    console.error("Error in createTabWithFirstType:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ===== EXPORT ===== */

exports.exportMasterTypes = async (req, res) => {
  try {
    const data = await service.exportMasterTypes();
    
    const csvRows = [
      ['Type ID', 'Type Code', 'Type Name', 'Tab', 'Status', 'Value Count', 'Created At'],
      ...data.map(item => [
        item.type_id,
        `"${item.type_code}"`,
        `"${item.type_name.replace(/"/g, '""')}"`,
        item.tab,
        item.type_status ? 'Active' : 'Inactive',
        item.value_count,
        new Date(item.created_at).toISOString()
      ])
    ];
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=master-types-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
};

exports.exportMasterValues = async (req, res) => {
  try {
    const { typeId } = req.params;
    const data = await service.exportMasterValues(typeId);
    
    if (data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "No values found for this type" 
      });
    }
    
    const csvRows = [
      ['Value ID', 'Value', 'Status', 'Type Code', 'Type Name', 'Tab', 'Created At'],
      ...data.map(item => [
        item.value_id,
        `"${item.value.replace(/"/g, '""')}"`,
        item.value_status ? 'Active' : 'Inactive',
        `"${item.type_code}"`,
        `"${item.type_name.replace(/"/g, '""')}"`,
        item.tab,
        new Date(item.created_at).toISOString()
      ])
    ];
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=master-values-${data[0].type_code}-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
};

// masterController.js में

// Check and create TAGS master type if not exists
async function ensureTagsMasterType() {
  try {
    // Check if TAGS type exists
    const [existing] = await db.query(
      "SELECT id FROM master_types WHERE code = ?",
      ["TAGS"]
    );

    if (existing.length === 0) {
      // Create TAGS master type
      await db.query(
        `INSERT INTO master_types (code, name, description, tab, is_active, sort_order, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        ["TAGS", "Property Tags", "Tags for categorizing properties", "PROPERTY", 1, 100]
      );
      console.log("✅ Created TAGS master type");
    }
  } catch (error) {
    console.error("Error ensuring TAGS master type:", error);
  }
}
