// models/masterModel.js
const db = require("../config/db");

/* ===================== TABS ===================== */

exports.getTabs = async () => {
  const [rows] = await db.query(`
    SELECT 
      t.id,
      t.tab_name,
      t.isactive,
      COUNT(mi.id) AS item_count,
      t.created_at
    FROM master_tabs t
    LEFT JOIN master_items mi ON mi.tab_id = t.id
    GROUP BY t.id
    ORDER BY t.tab_name
  `);
  return rows;
};

exports.createTab = async ({ tab_name, isactive = 1 }) => {
  const [existing] = await db.query(
    "SELECT id FROM master_tabs WHERE LOWER(tab_name)=LOWER(?)",
    [tab_name]
  );
  if (existing.length) throw new Error("Tab already exists");

  const [res] = await db.query(
    "INSERT INTO master_tabs (tab_name, isactive) VALUES (?,?)",
    [tab_name, isactive]
  );
  return { id: res.insertId, tab_name, isactive };
};

exports.updateTab = async (id, { tab_name, isactive }) => {
  await db.query(
    "UPDATE master_tabs SET tab_name=?, isactive=? WHERE id=?",
    [tab_name, isactive, id]
  );
};

exports.deleteTab = async (id) => {
  const [items] = await db.query(
    "SELECT id FROM master_items WHERE tab_id=?",
    [id]
  );
  if (items.length) throw new Error("Delete items first");

  await db.query("DELETE FROM master_tabs WHERE id=?", [id]);
};

/* ===================== MASTER ITEMS ===================== */

exports.getItems = async () => {
  const [rows] = await db.query(`
    SELECT 
      mi.*, 
      mt.tab_name,
      COUNT(mv.id) AS value_count
    FROM master_items mi
    JOIN master_tabs mt ON mt.id = mi.tab_id
    LEFT JOIN master_item_values mv ON mv.master_item_id = mi.id
    GROUP BY mi.id
    ORDER BY mt.tab_name, mi.name
  `);
  return rows;
};

exports.getItemsByTab = async (tab_id) => {
  const [rows] = await db.query(
    `SELECT * FROM master_items WHERE tab_id=? ORDER BY name`,
    [tab_id]
  );
  return rows;
};

exports.createItem = async ({ tab_id, name, isactive = 1 }) => {
  const [existing] = await db.query(
    "SELECT id FROM master_items WHERE tab_id=? AND LOWER(name)=LOWER(?)",
    [tab_id, name]
  );
  if (existing.length) throw new Error("Item already exists");

  const [res] = await db.query(
    "INSERT INTO master_items (tab_id, name, isactive) VALUES (?,?,?)",
    [tab_id, name, isactive]
  );
  return { id: res.insertId, tab_id, name, isactive };
};

exports.updateItem = async (id, { name, isactive }) => {
  await db.query(
    "UPDATE master_items SET name=?, isactive=? WHERE id=?",
    [name, isactive, id]
  );
};

exports.deleteItem = async (id) => {
  const [vals] = await db.query(
    "SELECT id FROM master_item_values WHERE master_item_id=?",
    [id]
  );
  if (vals.length) throw new Error("Delete values first");

  await db.query("DELETE FROM master_items WHERE id=?", [id]);
};

/* ===================== MASTER VALUES ===================== */

exports.getValues = async (master_item_id) => {
  const [rows] = await db.query(
    "SELECT * FROM master_item_values WHERE master_item_id=? ORDER BY name",
    [master_item_id]
  );
  return rows;
};

exports.createValue = async ({ master_item_id, name, isactive = 1 }) => {
  const [existing] = await db.query(
    `SELECT id FROM master_item_values 
     WHERE master_item_id=? AND LOWER(name)=LOWER(?)`,
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
    "UPDATE master_item_values SET name=?, isactive=? WHERE id=?",
    [name, isactive, id]
  );
};

exports.deleteValue = async (id) => {
  await db.query("DELETE FROM master_item_values WHERE id=?", [id]);
};

exports.exportMasterItems = async () => {
  const [rows] = await db.query(`
    SELECT
      mi.id            AS item_id,
      mi.name          AS item_name,
      mt.tab_name      AS tab_name,
      mi.isactive      AS item_status,
      COUNT(mv.id)     AS value_count,
      mi.created_at
    FROM master_items mi
    JOIN master_tabs mt ON mt.id = mi.tab_id
    LEFT JOIN master_item_values mv ON mv.master_item_id = mi.id
    GROUP BY mi.id
    ORDER BY mt.tab_name, mi.name
  `);
  return rows;
};

exports.exportMasterItemValues = async (itemId) => {
  const [rows] = await db.query(`
    SELECT  
      mv.id        AS value_id,
      mv.name      AS value_name,
      mv.isactive  AS value_status,
      mv.created_at,
      mi.name      AS item_name,
      mt.tab_name  AS tab_name
    FROM master_item_values mv
    JOIN master_items mi ON mi.id = mv.master_item_id
    JOIN master_tabs mt ON mt.id = mi.tab_id
    WHERE mv.master_item_id = ?
    ORDER BY mv.name
  `, [itemId]);

  return rows;
};

// Fetch ALL masters (tabs + items + values)
exports.getAllMasters = async () => {
    const sql = `
      SELECT
        mt.id   AS tab_id,
        mt.tab_name,
        mt.is_active AS tab_active,

        mi.id   AS item_id,
        mi.name AS item_name,
        mi.is_active AS item_active,

        miv.id   AS value_id,
        miv.name AS value_name,
        miv.is_active AS value_active

      FROM master_tabs mt
      LEFT JOIN master_items mi
        ON mi.tab_id = mt.id
      LEFT JOIN master_item_values miv
        ON miv.master_item_id = mi.id
      ORDER BY mt.id, mi.id, miv.id
    `;

    const [rows] = await db.query(sql);
    return rows;
  },

  // Fetch items by tab_id (NO hardcoding)
  exports.getItemsByTabId = async (tab_id) => {
    const sql = `
      SELECT id, name
      FROM master_items
      WHERE tab_id = ? AND is_active = 1
    `;
    const [rows] = await db.query(sql, [tab_id]);
    return rows;
  }

  exports.consumeMasters = async ({ tab, type }) => {
  let sql = `
    SELECT
      mt.tab_name,
      mi.name AS type_name,
      miv.id  AS value_id,
      miv.name AS value_name
    FROM master_tabs mt
    JOIN master_items mi
      ON mi.tab_id = mt.id AND mi.isactive = 1
    JOIN master_item_values miv
      ON miv.master_item_id = mi.id AND miv.isactive = 1
    WHERE mt.isactive = 1
  `;

  const params = [];

  if (tab) {
    sql += ` AND mt.tab_name = ?`;
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