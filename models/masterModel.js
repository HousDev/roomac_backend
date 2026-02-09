// models/masterModel.js
const db = require("../config/db");

/* ========== TAB OPERATIONS ========== */

exports.getTabs = async () => {
  // Get tabs with count of types in each tab
  const [rows] = await db.query(
    `SELECT 
      COALESCE(NULLIF(tab, ''), 'General') as name,
      COUNT(*) as type_count,
      MAX(created_at) as created_at,
      MIN(is_active) = 1 as is_active
     FROM master_types 
     GROUP BY COALESCE(NULLIF(tab, ''), 'General')
     ORDER BY name`
  );
  return rows;
};

exports.createTab = async ({ name, description, is_active = true }) => {
  const trimmedName = name.trim();
  
  // Check if tab already exists
  const [existing] = await db.query(
    "SELECT tab FROM master_types WHERE tab = ?",
    [trimmedName]
  );
  
  if (existing.length > 0) {
    throw new Error(`Tab "${trimmedName}" already exists`);
  }
  
  // Create a default master type for this tab
  const defaultCode = trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
  const defaultName = `${trimmedName} Types`;
  
  const [result] = await db.query(
    "INSERT INTO master_types (code, name, tab, is_active) VALUES (?, ?, ?, ?)",
    [defaultCode, defaultName, trimmedName, is_active]
  );
  
  return {
    id: result.insertId,
    name: trimmedName,
    type_count: 1,
    is_active,
    created_at: new Date()
  };
};

exports.updateTab = async (oldTabName, { name, description, is_active }) => {
  const newTabName = name.trim();
  
  if (oldTabName === 'General') {
    throw new Error('Cannot rename General tab');
  }
  
  if (newTabName === 'General') {
    throw new Error('Cannot use "General" as a tab name');
  }
  
  // Check if new name already exists
  const [existing] = await db.query(
    "SELECT tab FROM master_types WHERE tab = ?",
    [newTabName]
  );
  
  if (existing.length > 0) {
    throw new Error(`Tab "${newTabName}" already exists`);
  }
  
  // Update all master_types with the old tab name
  await db.query(
    "UPDATE master_types SET tab = ?, updated_at = CURRENT_TIMESTAMP WHERE tab = ?",
    [newTabName, oldTabName]
  );
  
  return {
    old_name: oldTabName,
    new_name: newTabName,
    is_active
  };
};

exports.deleteTab = async (tabName) => {
  if (tabName === 'General') {
    throw new Error('Cannot delete General tab');
  }
  
  // Move all types in this tab to General (null)
  await db.query(
    "UPDATE master_types SET tab = NULL, updated_at = CURRENT_TIMESTAMP WHERE tab = ?",
    [tabName]
  );
  
  return {
    deleted_tab: tabName,
    message: 'Tab deleted, types moved to General'
  };
};

/* ========== MASTER TYPE OPERATIONS ========== */

exports.getMasterTypes = async () => {
  const [rows] = await db.query(
    `SELECT mt.*, 
      COALESCE(NULLIF(mt.tab, ''), 'General') as display_tab,
      COUNT(mv.id) as value_count
     FROM master_types mt
     LEFT JOIN master_values mv ON mt.id = mv.master_type_id
     GROUP BY mt.id, mt.code, mt.name, mt.tab, mt.is_active, mt.created_at
     ORDER BY mt.tab, mt.name`
  );
  return rows;
};

exports.getMasterTypesByTab = async (tab) => {
  let query;
  let params = [];
  
  if (tab === 'General') {
    query = `SELECT mt.*, COUNT(mv.id) as value_count
             FROM master_types mt
             LEFT JOIN master_values mv ON mt.id = mv.master_type_id
             WHERE mt.tab IS NULL OR mt.tab = '' OR mt.tab = 'General'
             GROUP BY mt.id, mt.code, mt.name, mt.tab, mt.is_active, mt.created_at
             ORDER BY mt.name`;
  } else {
    query = `SELECT mt.*, COUNT(mv.id) as value_count
             FROM master_types mt
             LEFT JOIN master_values mv ON mt.id = mv.master_type_id
             WHERE mt.tab = ?
             GROUP BY mt.id, mt.code, mt.name, mt.tab, mt.is_active, mt.created_at
             ORDER BY mt.name`;
    params = [tab];
  }
  
  const [rows] = await db.query(query, params);
  return rows;
};

exports.getMasterTypeByCode = async (code) => {
  const [rows] = await db.query(
    "SELECT * FROM master_types WHERE code = ?",
    [code]
  );
  return rows[0] || null;
};

exports.createMasterType = async ({ code, name, tab = 'General', is_active = true, description }) => {
  const trimmedCode = code.trim().toUpperCase().replace(/\s+/g, '_');
  const trimmedName = name.trim();
  const trimmedTab = (tab === 'General' || !tab) ? null : tab.trim();
  
  // Validate code format
  if (!/^[A-Z0-9_]+$/.test(trimmedCode)) {
    throw new Error('Code can only contain uppercase letters, numbers, and underscores');
  }
  
  // Check if code already exists
  const [existingCode] = await db.query(
    "SELECT id FROM master_types WHERE code = ?",
    [trimmedCode]
  );
  
  if (existingCode.length > 0) {
    throw new Error(`Master type with code "${trimmedCode}" already exists`);
  }
  
  // Check if name already exists in the same tab
  const [existingName] = await db.query(
    "SELECT id FROM master_types WHERE LOWER(name) = LOWER(?) AND (tab = ? OR (tab IS NULL AND ? IS NULL))",
    [trimmedName, trimmedTab, trimmedTab]
  );
  
  if (existingName.length > 0) {
    throw new Error('Master type with this name already exists in this tab');
  }
  
  const [result] = await db.query(
    "INSERT INTO master_types (code, name, tab, is_active) VALUES (?, ?, ?, ?)",
    [trimmedCode, trimmedName, trimmedTab, is_active]
  );
  
  const [newType] = await db.query(
    "SELECT * FROM master_types WHERE id = ?",
    [result.insertId]
  );
  
  return newType[0];
};

exports.updateMasterType = async (id, { name, tab, is_active, description }) => {
  const trimmedName = name.trim();
  const trimmedTab = (tab === 'General' || !tab) ? null : tab.trim();
  
  await db.query(
    "UPDATE master_types SET name = ?, tab = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [trimmedName, trimmedTab, is_active, id]
  );
};

exports.getAllMasterTypeCodes = async () => {
  const [rows] = await db.query(
    "SELECT id, code, name FROM master_types WHERE is_active = 1 ORDER BY name"
  );
  return rows;
};

exports.getMasterTypeById = async (id) => {
  const [rows] = await db.query(
    `SELECT mt.*, COUNT(mv.id) as value_count
     FROM master_types mt
     LEFT JOIN master_values mv ON mt.id = mv.master_type_id
     WHERE mt.id = ?
     GROUP BY mt.id, mt.code, mt.name, mt.tab, mt.is_active, mt.created_at`,
    [id]
  );
  return rows[0] || null;
};

exports.deleteMasterType = async (id) => {
  // Check if there are any values attached
  const [values] = await db.query(
    "SELECT COUNT(*) as count FROM master_values WHERE master_type_id = ?",
    [id]
  );
  
  if (values[0].count > 0) {
    throw new Error('Cannot delete master type that has values. Delete values first.');
  }
  
  await db.query("DELETE FROM master_types WHERE id = ?", [id]);
  return true;
};

exports.toggleMasterTypeStatus = async (id, status) => {
  await db.query(
    "UPDATE master_types SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [status, id]
  );
};

exports.createTabWithFirstType = async (tabName, typeName) => {
  const trimmedTab = tabName.trim();
  const trimmedType = typeName.trim();
  
  // Generate code from type name
  const code = trimmedType.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
  
  const [existingTab] = await db.query(
    "SELECT DISTINCT tab FROM master_types WHERE tab = ?",
    [trimmedTab]
  );
  
  if (existingTab.length > 0) {
    throw new Error('Tab already exists');
  }
  
  const [result] = await db.query(
    "INSERT INTO master_types (code, name, tab, is_active) VALUES (?, ?, ?, true)",
    [code, trimmedType, trimmedTab]
  );
  
  return {
    tab: trimmedTab,
    typeId: result.insertId,
    typeName: trimmedType,
    code: code
  };
};

/* ========== MASTER VALUE OPERATIONS ========== */

exports.getMasterValuesByCode = async (code) => {
  const [rows] = await db.query(
    `SELECT mv.* 
     FROM master_values mv
     JOIN master_types mt ON mv.master_type_id = mt.id
     WHERE mt.code = ? 
     ORDER BY mv.value`,
    [code]
  );
  return rows;
};

exports.getMasterValues = async (masterTypeId) => {
  const [rows] = await db.query(
    "SELECT id, value, is_active, created_at, master_type_id FROM master_values WHERE master_type_id = ? ORDER BY value",
    [masterTypeId]
  );
  return rows;
};

exports.createMasterValue = async ({ master_type_id, value, is_active = true }) => {
  const trimmedValue = value.trim();
  
  const [existing] = await db.query(
    "SELECT id FROM master_values WHERE LOWER(value) = LOWER(?) AND master_type_id = ?",
    [trimmedValue, master_type_id]
  );
  
  if (existing.length > 0) {
    throw new Error('Value already exists in this master type');
  }
  
  const [result] = await db.query(
    "INSERT INTO master_values (master_type_id, value, is_active) VALUES (?, ?, ?)",
    [master_type_id, trimmedValue, is_active]
  );
  
  const [newValue] = await db.query(
    "SELECT * FROM master_values WHERE id = ?",
    [result.insertId]
  );
  
  return newValue[0];
};

exports.updateMasterValue = async (id, { value, is_active }) => {
  const trimmedValue = value.trim();
  await db.query(
    "UPDATE master_values SET value = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [trimmedValue, is_active, id]
  );
};

exports.toggleMasterValueStatus = async (id, status) => {
  await db.query(
    "UPDATE master_values SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [status, id]
  );
};

exports.deleteMasterValue = async (id) => {
  await db.query("DELETE FROM master_values WHERE id = ?", [id]);
  return true;
};


exports.getActiveValuesByCode = async (code) => {
  const [rows] = await db.query(
    `SELECT mv.id, mv.value
     FROM master_values mv
     JOIN master_types mt ON mv.master_type_id = mt.id
     WHERE mt.code = ? 
       AND mt.is_active = 1
       AND mv.is_active = 1
     ORDER BY mv.value`,
    [code]
  );
  return rows;
};

exports.getValuesByType = async (typeName) => {
  const [results] = await db.query(
    `SELECT mv.id, mv.value, mv.is_active
     FROM master_values mv
     JOIN master_types mt ON mv.master_type_id = mt.id
     WHERE mt.name = ? AND mv.is_active = 1
     ORDER BY mv.value`,
    [typeName]
  );
  return results;
};

exports.getValuesByCode = async (code) => {
  const [results] = await db.query(
    `SELECT mv.id, mv.value, mv.is_active
     FROM master_values mv
     JOIN master_types mt ON mv.master_type_id = mt.id
     WHERE mt.code = ? AND mv.is_active = 1
     ORDER BY mv.value`,
    [code]
  );
  return results;
};

/* ========== EXPORT FUNCTIONS ========== */

exports.exportMasterTypes = async () => {
  const [rows] = await db.query(
    `SELECT 
      mt.id as type_id,
      mt.code as type_code,
      mt.name as type_name,
      COALESCE(NULLIF(mt.tab, ''), 'General') as tab,
      mt.is_active as type_status,
      COUNT(mv.id) as value_count,
      mt.created_at
     FROM master_types mt
     LEFT JOIN master_values mv ON mt.id = mv.master_type_id
     GROUP BY mt.id, mt.code, mt.name, mt.tab, mt.is_active, mt.created_at
     ORDER BY mt.tab, mt.name`
  );
  return rows;
};

exports.exportMasterValues = async (typeId) => {
  const [rows] = await db.query(
    `SELECT 
      mv.id as value_id,
      mv.value,
      mv.is_active as value_status,
      mv.created_at,
      mt.code as type_code,
      mt.name as type_name,
      COALESCE(NULLIF(mt.tab, ''), 'General') as tab
     FROM master_values mv
     JOIN master_types mt ON mv.master_type_id = mt.id
     WHERE mv.master_type_id = ?
     ORDER BY mv.value`,
    [typeId]
  );
  return rows;
};