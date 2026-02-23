const db = require("../config/db");

/* ===================== MASTER ITEMS ===================== */

exports.getItems = async () => {
  const [rows] = await db.query(`
    SELECT 
      mi.*,
      COUNT(mv.id) AS value_count
    FROM master_items mi
    LEFT JOIN master_item_values mv ON mv.master_item_id = mi.id
    GROUP BY mi.id
    ORDER BY mi.tab_name, mi.name
  `);
  return rows;
};

exports.getItemsByTab = async (tab_name) => {
  const [rows] = await db.query(
    `SELECT * FROM master_items WHERE tab_name = ? ORDER BY name`,
    [tab_name]
  );
  return rows;
};

exports.createItem = async ({ tab_name, name, isactive = 1 }) => {
  // Check if item already exists in this tab
  const [existing] = await db.query(
    "SELECT id FROM master_items WHERE tab_name = ? AND LOWER(name) = LOWER(?)",
    [tab_name, name]
  );
  if (existing.length) throw new Error("Item already exists in this tab");

  const [res] = await db.query(
    "INSERT INTO master_items (tab_name, name, isactive) VALUES (?,?,?)",
    [tab_name, name, isactive]
  );
  return { id: res.insertId, tab_name, name, isactive };
};

exports.updateItem = async (id, { name, isactive, tab_name }) => {
  // If tab_name is being updated, check for duplicates in the new tab
  if (tab_name) {
    const [existing] = await db.query(
      "SELECT id FROM master_items WHERE tab_name = ? AND LOWER(name) = LOWER(?) AND id != ?",
      [tab_name, name, id]
    );
    if (existing.length) throw new Error("Item already exists in this tab");
  }

  await db.query(
    "UPDATE master_items SET name = ?, isactive = ?, tab_name = ? WHERE id = ?",
    [name, isactive, tab_name, id]
  );
};

exports.deleteItem = async (id) => {
  // Check if item has values
  const [vals] = await db.query(
    "SELECT id FROM master_item_values WHERE master_item_id = ?",
    [id]
  );
  if (vals.length) throw new Error("Delete values first");

  await db.query("DELETE FROM master_items WHERE id = ?", [id]);
};

/* ===================== MASTER VALUES ===================== */

exports.getValues = async (master_item_id) => {
  const [rows] = await db.query(
    "SELECT * FROM master_item_values WHERE master_item_id = ? ORDER BY name",
    [master_item_id]
  );
  return rows;
};

exports.createValue = async ({ master_item_id, name, isactive = 1 }) => {
  // Check if value already exists for this item
  const [existing] = await db.query(
    `SELECT id FROM master_item_values 
     WHERE master_item_id = ? AND LOWER(name) = LOWER(?)`,
    [master_item_id, name]
  );
  if (existing.length) throw new Error("Value already exists");

  const [res] = await db.query(
    "INSERT INTO master_item_values (master_item_id, name, isactive) VALUES (?,?,?)",
    [master_item_id, name, isactive]
  );
  return { id: res.insertId, master_item_id, name, isactive };
};

exports.updateValue = async (id, { name, isactive }) => {
  await db.query(
    "UPDATE master_item_values SET name = ?, isactive = ? WHERE id = ?",
    [name, isactive, id]
  );
};

exports.deleteValue = async (id) => {
  await db.query("DELETE FROM master_item_values WHERE id = ?", [id]);
};

/* ===================== EXPORT FUNCTIONS ===================== */

exports.exportMasterItems = async () => {
  const [rows] = await db.query(`
    SELECT
      mi.id AS item_id,
      mi.name AS item_name,
      mi.tab_name,
      mi.isactive AS item_status,
      COUNT(mv.id) AS value_count,
      mi.created_at
    FROM master_items mi
    LEFT JOIN master_item_values mv ON mv.master_item_id = mi.id
    GROUP BY mi.id
    ORDER BY mi.tab_name, mi.name
  `);
  return rows;
};

exports.exportMasterItemValues = async (itemId) => {
  const [rows] = await db.query(`
    SELECT  
      mv.id AS value_id,
      mv.name AS value_name,
      mv.isactive AS value_status,
      mv.created_at,
      mi.name AS item_name,
      mi.tab_name
    FROM master_item_values mv
    JOIN master_items mi ON mi.id = mv.master_item_id
    WHERE mv.master_item_id = ?
    ORDER BY mv.name
  `, [itemId]);

  return rows;
};

/* ===================== CONSUME MASTERS API ===================== */

// Get all items grouped by tab_name for consumption
exports.getAllMasters = async () => {
  const sql = `
    SELECT
      mi.id AS item_id,
      mi.name AS item_name,
      mi.tab_name,
      mi.isactive AS item_active,
      miv.id AS value_id,
      miv.name AS value_name,
      miv.isactive AS value_active
    FROM master_items mi
    LEFT JOIN master_item_values miv
      ON miv.master_item_id = mi.id
    WHERE mi.isactive = 1
    ORDER BY mi.tab_name, mi.name, miv.name
  `;

  const [rows] = await db.query(sql);
  
  // Transform data into nested structure
  const result = {};
  
  rows.forEach(row => {
    if (!result[row.tab_name]) {
      result[row.tab_name] = {};
    }
    
    if (!result[row.tab_name][row.item_name] && row.item_id) {
      result[row.tab_name][row.item_name] = [];
    }
    
    if (row.value_id && row.value_name) {
      result[row.tab_name][row.item_name].push({
        id: row.value_id,
        name: row.value_name,
        isactive: row.value_active
      });
    }
  });
  
  return result;
};

// Get active items by tab_name
exports.getItemsByTabName = async (tab_name) => {
  const sql = `
    SELECT id, name
    FROM master_items
    WHERE tab_name = ? AND isactive = 1
    ORDER BY name
  `;
  const [rows] = await db.query(sql, [tab_name]);
  return rows;
};

// Get values for a specific master item
exports.getValuesByItemId = async (item_id) => {
  const sql = `
    SELECT id, name, isactive
    FROM master_item_values
    WHERE master_item_id = ? AND isactive = 1
    ORDER BY name
  `;
  const [rows] = await db.query(sql, [item_id]);
  return rows;
};

// Flexible consume API - returns values based on tab and item name
exports.consumeMasters = async ({ tab, type }) => {
  let sql = `
    SELECT
      mi.tab_name,
      mi.name AS type_name,
      miv.id AS value_id,
      miv.name AS value_name
    FROM master_items mi
    JOIN master_item_values miv
      ON miv.master_item_id = mi.id AND miv.isactive = 1
    WHERE mi.isactive = 1
  `;

  const params = [];

  if (tab) {
    sql += ` AND mi.tab_name = ?`;
    params.push(tab);
  }

  if (type) {
    sql += ` AND mi.name = ?`;
    params.push(type);
  }

  sql += ` ORDER BY mi.name, miv.name`;

  const [rows] = await db.query(sql, params);
  return rows;
};

// Get distinct tab names (useful for frontend to know which tabs exist)
exports.getDistinctTabs = async () => {
  const [rows] = await db.query(`
    SELECT DISTINCT tab_name
    FROM master_items
    WHERE isactive = 1
    ORDER BY tab_name
  `);
  return rows.map(row => row.tab_name);
};

// Search items across all tabs
exports.searchItems = async (searchTerm) => {
  const sql = `
    SELECT DISTINCT
      mi.id,
      mi.name,
      mi.tab_name,
      mi.isactive
    FROM master_items mi
    LEFT JOIN master_item_values miv ON miv.master_item_id = mi.id
    WHERE mi.name LIKE ? OR miv.name LIKE ?
    ORDER BY mi.tab_name, mi.name
  `;
  const searchPattern = `%${searchTerm}%`;
  const [rows] = await db.query(sql, [searchPattern, searchPattern]);
  return rows;
};