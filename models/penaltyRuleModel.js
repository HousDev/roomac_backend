// models/penaltyRuleModel.js
const db = require("../config/db");

const PenaltyRuleModel = {
  // Get all penalty rules with optional filters
  getAllPenaltyRules: async (filters = {}) => {
    try {
      let query = `
        SELECT 
          id,
          item_category,
          from_condition,
          to_condition,
          penalty_amount,
          description,
          created_at,
          updated_at
        FROM penalty_rules
        WHERE 1=1
      `;
      const params = [];

      if (filters.category) {
        query += ` AND item_category = ?`;
        params.push(filters.category);
      }

      if (filters.from) {
        query += ` AND from_condition = ?`;
        params.push(filters.from);
      }

      if (filters.to) {
        query += ` AND to_condition = ?`;
        params.push(filters.to);
      }

      query += ` ORDER BY item_category, from_condition, to_condition`;

      const [rows] = await db.query(query, params);
      return rows;
    } catch (err) {
      console.error("PenaltyRuleModel.getAllPenaltyRules Error:", err);
      throw err;
    }
  },

  // Get penalty rule by ID
  getPenaltyRuleById: async (id) => {
    try {
      const [rows] = await db.query(
        `SELECT 
          id,
          item_category,
          from_condition,
          to_condition,
          penalty_amount,
          description,
          created_at,
          updated_at
        FROM penalty_rules 
        WHERE id = ?`,
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error("PenaltyRuleModel.getPenaltyRuleById Error:", err);
      throw err;
    }
  },

  // Calculate penalty for a specific condition change
  calculatePenalty: async (category, fromCondition, toCondition) => {
    try {
      const [rows] = await db.query(
        `SELECT penalty_amount 
         FROM penalty_rules 
         WHERE item_category = ? 
           AND from_condition = ? 
           AND to_condition = ?`,
        [category, fromCondition, toCondition]
      );
      
      return rows.length > 0 ? rows[0].penalty_amount : null;
    } catch (err) {
      console.error("PenaltyRuleModel.calculatePenalty Error:", err);
      throw err;
    }
  },

  // Create new penalty rule
  createPenaltyRule: async (data) => {
    try {
      const {
        item_category,
        from_condition,
        to_condition,
        penalty_amount,
        description,
      } = data;

      const [result] = await db.query(
        `INSERT INTO penalty_rules 
         (item_category, from_condition, to_condition, penalty_amount, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          item_category,
          from_condition,
          to_condition,
          parseFloat(penalty_amount) || 0,
          description || null
        ]
      );

      return { id: result.insertId, ...data };
    } catch (err) {
      console.error("PenaltyRuleModel.createPenaltyRule Error:", err);
      throw err;
    }
  },

  // Update penalty rule
  updatePenaltyRule: async (id, updateData) => {
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined && key !== 'id' && key !== 'created_at') {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (fields.length === 0) return { affectedRows: 0 };

      values.push(id);

      const [result] = await db.query(
        `UPDATE penalty_rules 
         SET ${fields.join(", ")}, updated_at = NOW() 
         WHERE id = ?`,
        values
      );

      return result;
    } catch (err) {
      console.error("PenaltyRuleModel.updatePenaltyRule Error:", err);
      throw err;
    }
  },

  // Delete penalty rule
  deletePenaltyRule: async (id) => {
    try {
      const [result] = await db.query(
        "DELETE FROM penalty_rules WHERE id = ?",
        [id]
      );
      return result;
    } catch (err) {
      console.error("PenaltyRuleModel.deletePenaltyRule Error:", err);
      throw err;
    }
  },

  // Bulk delete
  bulkDelete: async (ids) => {
    try {
      const placeholders = ids.map(() => "?").join(",");
      const [result] = await db.query(
        `DELETE FROM penalty_rules WHERE id IN (${placeholders})`,
        ids
      );
      return result;
    } catch (err) {
      console.error("PenaltyRuleModel.bulkDelete Error:", err);
      throw err;
    }
  },

  // Get penalty statistics
  getPenaltyStats: async () => {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_rules,
          MAX(penalty_amount) as max_penalty,
          MIN(penalty_amount) as min_penalty,
          AVG(penalty_amount) as avg_penalty,
          COUNT(DISTINCT item_category) as categories_count
        FROM penalty_rules
      `);
      
      return {
        total_rules: stats[0].total_rules || 0,
        max_penalty: stats[0].max_penalty || 0,
        min_penalty: stats[0].min_penalty || 0,
        avg_penalty: Math.round(stats[0].avg_penalty) || 0,
        categories_count: stats[0].categories_count || 0,
      };
    } catch (err) {
      console.error("PenaltyRuleModel.getPenaltyStats Error:", err);
      throw err;
    }
  },
};

module.exports = PenaltyRuleModel;