// inventoryModel.js - Handles database interactions for inventory/assets
const db = require("../config/db");

const InventoryModel = {
  // Get all inventory items with optional filters
  getAllInventory: async (filters = {}) => {
    try {
      let query = `
       SELECT 
  i.*,
  i.property_name as property_full_name,
  i.category_name
FROM inventory i
WHERE 1=1
      `;
      const params = [];

      if (filters.property_id) {
        query += ` AND i.property_id = ?`;
        params.push(filters.property_id);
      }

      if (filters.category_id) {
        query += ` AND i.category_id = ?`;
        params.push(filters.category_id);
      }

      if (filters.stock_status === "low_stock") {
        query += ` AND i.quantity <= i.min_stock_level AND i.quantity > 0`;
      } else if (filters.stock_status === "out_of_stock") {
        query += ` AND i.quantity = 0`;
      }

      if (filters.search) {
  query += ` AND (i.item_name LIKE ? OR i.category_name LIKE ? OR i.property_name LIKE ?)`;
  const searchTerm = `%${filters.search}%`;
  params.push(searchTerm, searchTerm, searchTerm);
}

      query += ` ORDER BY i.created_at DESC`;

      const [rows] = await db.query(query, params);
      return rows;
    } catch (err) {
      console.error("InventoryModel.getAllInventory Error:", err);
      throw err;
    }
  },

  // Get inventory item by ID
  getInventoryById: async (id) => {
    try {
      const [rows] = await db.query(
        `SELECT 
  i.*,
  i.property_name as property_full_name,
  i.category_name
FROM inventory i
WHERE i.id = ?`,
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error("InventoryModel.getInventoryById Error:", err);
      throw err;
    }
  },

  // Create new inventory item
  createInventory: async (data) => {
    try {
     const {
  item_name, category_id, category_name,
  property_id, property_name,
  quantity, unit_price, min_stock_level, notes,
} = data;

const [result] = await db.query(
  `INSERT INTO inventory 
   (item_name, category_id, category_name, property_id, property_name, quantity, unit_price, min_stock_level, notes) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
[item_name, parseInt(category_id)||0, category_name, parseInt(property_id), property_name, parseInt(quantity)||0, parseFloat(unit_price)||0, parseInt(min_stock_level)||10, notes||null]
);


      return { id: result.insertId, ...data };
    } catch (err) {
      console.error("InventoryModel.createInventory Error:", err);
      throw err;
    }
  },

  // Update inventory item
  updateInventory: async (id, updateData) => {
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (fields.length === 0) return { affectedRows: 0 };

      values.push(id);

      const [result] = await db.query(
        `UPDATE inventory SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
        values
      );

      return result;
    } catch (err) {
      console.error("InventoryModel.updateInventory Error:", err);
      throw err;
    }
  },

  // Delete inventory item
  deleteInventory: async (id) => {
    try {
      const [result] = await db.query("DELETE FROM inventory WHERE id = ?", [id]);
      return result;
    } catch (err) {
      console.error("InventoryModel.deleteInventory Error:", err);
      throw err;
    }
  },

  // Bulk delete
  bulkDelete: async (ids) => {
    try {
      const placeholders = ids.map(() => "?").join(",");
      const [result] = await db.query(
        `DELETE FROM inventory WHERE id IN (${placeholders})`,
        ids
      );
      return result;
    } catch (err) {
      console.error("InventoryModel.bulkDelete Error:", err);
      throw err;
    }
  },

  // Get inventory statistics
  getInventoryStats: async () => {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(quantity) as total_quantity,
          SUM(quantity * unit_price) as total_value,
          SUM(CASE WHEN quantity <= min_stock_level AND quantity > 0 THEN 1 ELSE 0 END) as low_stock_count,
          SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
        FROM inventory
      `);
      return stats[0];
    } catch (err) {
      console.error("InventoryModel.getInventoryStats Error:", err);
      throw err;
    }
  },
};

module.exports = InventoryModel;