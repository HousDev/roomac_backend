const db = require("../config/db");

const MoveOutInspectionModel = {
  _parseRow: (r) => {
    const safeParseJSON = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch { return []; }
    };
    return {
      ...r,
      id: String(r.id),
      handover_id: String(r.handover_id),
      property_id: r.property_id ? String(r.property_id) : undefined,
      total_penalty: parseFloat(r.total_penalty) || 0,
      penalty_rules: safeParseJSON(r.penalty_rules),
      inspection_items: safeParseJSON(r.inspection_items)
    };
  },

  getAll: async (filters = {}) => {
    try {
      let query = `SELECT * FROM move_out_inspections WHERE 1=1`;
      const params = [];

      if (filters.property_id && filters.property_id !== 'all' && filters.property_id !== 'undefined') {
        query += ` AND property_id = ?`;
        params.push(parseInt(filters.property_id));
      }
      if (filters.status && filters.status !== 'all' && filters.status !== 'undefined') {
        query += ` AND status = ?`;
        params.push(filters.status);
      }
      if (filters.tenant_name) {
        query += ` AND tenant_name LIKE ?`;
        params.push(`%${filters.tenant_name}%`);
      }
      if (filters.search) {
        query += ` AND (tenant_name LIKE ? OR property_name LIKE ? OR room_number LIKE ? OR inspector_name LIKE ?)`;
        const s = `%${filters.search}%`;
        params.push(s, s, s, s);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await db.query(query, params);

      let rows = [];
      if (Array.isArray(result)) {
        rows = result.length > 0 && Array.isArray(result[0]) ? result[0] : result;
      } else if (result && typeof result === 'object') {
        rows = result.rows || result.data || [];
      }

      return rows.map(r => MoveOutInspectionModel._parseRow(r));

    } catch (error) {
      console.error("Error in getAll:", error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const result = await db.query(
        `SELECT * FROM move_out_inspections WHERE id = ?`,
        [id]
      );

      let rows = [];
      if (Array.isArray(result)) {
        rows = result.length > 0 && Array.isArray(result[0]) ? result[0] : result;
      } else if (result && typeof result === 'object') {
        rows = result.rows || result.data || [];
      }

      if (rows.length === 0) return null;
      return MoveOutInspectionModel._parseRow(rows[0]);

    } catch (error) {
      console.error("Error in getById:", error);
      throw error;
    }
  },

  getByHandoverId: async (handoverId) => {
    try {
      const result = await db.query(
        `SELECT * FROM move_out_inspections WHERE handover_id = ? ORDER BY created_at DESC`,
        [handoverId]
      );

      let rows = [];
      if (Array.isArray(result)) {
        rows = result.length > 0 && Array.isArray(result[0]) ? result[0] : result;
      } else if (result && typeof result === 'object') {
        rows = result.rows || result.data || [];
      }

      return rows.map(r => MoveOutInspectionModel._parseRow(r));

    } catch (error) {
      console.error("Error in getByHandoverId:", error);
      throw error;
    }
  },

  create: async (data) => {
    try {
      const {
        handover_id, tenant_name, tenant_phone, tenant_email,
        property_id, property_name, room_number, bed_number,
        move_in_date, inspection_date, inspector_name,
        total_penalty = 0, notes, status = 'Pending',
        penalty_rules = [], inspection_items = []
      } = data;

      let rulesToUse = penalty_rules;
      if (rulesToUse.length === 0) {
        rulesToUse = await MoveOutInspectionModel.getDefaultPenaltyRules();
      }

      const [result] = await db.query(
        `INSERT INTO move_out_inspections (
          handover_id, tenant_name, tenant_phone, tenant_email,
          property_id, property_name, room_number, bed_number,
          move_in_date, inspection_date, inspector_name,
          total_penalty, notes, status, penalty_rules, inspection_items
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(handover_id), tenant_name, tenant_phone, tenant_email || null,
          property_id ? parseInt(property_id) : null, property_name, room_number,
          bed_number || null, move_in_date || null, inspection_date, inspector_name,
          parseFloat(total_penalty) || 0, notes || null, status,
          JSON.stringify(rulesToUse), JSON.stringify(inspection_items)
        ]
      );

      try {
        await db.query(
          `UPDATE tenant_handovers SET status = 'Completed' WHERE id = ?`,
          [parseInt(handover_id)]
        );
      } catch (handoverErr) {
        console.error("Error updating handover status:", handoverErr);
      }

      return { id: result.insertId ? String(result.insertId) : String(result), ...data };
    } catch (error) {
      console.error("Error in create:", error);
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const {
        inspection_date, inspector_name, total_penalty,
        notes, status, penalty_rules, inspection_items = []
      } = data;

      await db.query(
        `UPDATE move_out_inspections SET
          inspection_date = ?, inspector_name = ?, total_penalty = ?,
          notes = ?, status = ?, penalty_rules = ?, inspection_items = ?,
          updated_at = NOW()
         WHERE id = ?`,
        [
          inspection_date.split('T')[0], inspector_name, parseFloat(total_penalty) || 0,
          notes || null, status,
          JSON.stringify(penalty_rules || []),
          JSON.stringify(inspection_items),
          id
        ]
      );

      return { id, ...data };
    } catch (error) {
      console.error("Error in update:", error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const [result] = await db.query(`DELETE FROM move_out_inspections WHERE id = ?`, [id]);
      return result;
    } catch (error) {
      console.error("Error in delete:", error);
      throw error;
    }
  },

  bulkDelete: async (ids) => {
    try {
      if (!ids || ids.length === 0) return { affectedRows: 0 };
      const placeholders = ids.map(() => '?').join(',');
      const [result] = await db.query(
        `DELETE FROM move_out_inspections WHERE id IN (${placeholders})`,
        ids
      );
      return result;
    } catch (error) {
      console.error("Error in bulkDelete:", error);
      throw error;
    }
  },

  getStats: async () => {
    try {
      const result = await db.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
          COALESCE(SUM(total_penalty), 0) as total_penalties,
          COALESCE(AVG(total_penalty), 0) as avg_penalty,
          COALESCE(MAX(total_penalty), 0) as max_penalty,
          COUNT(DISTINCT property_name) as total_properties
        FROM move_out_inspections
      `);

      let stats = {};
      if (Array.isArray(result)) {
        stats = result.length > 0 && Array.isArray(result[0]) ? result[0][0] || {} : result[0] || {};
      } else if (result && typeof result === 'object') {
        stats = result[0] || result.data || result.rows || {};
      }

      return {
        total: parseInt(stats.total) || 0,
        completed: parseInt(stats.completed) || 0,
        approved: parseInt(stats.approved) || 0,
        pending: parseInt(stats.pending) || 0,
        active: parseInt(stats.active) || 0,
        cancelled: parseInt(stats.cancelled) || 0,
        total_penalties: parseFloat(stats.total_penalties) || 0,
        avg_penalty: parseFloat(stats.avg_penalty) || 0,
        max_penalty: parseFloat(stats.max_penalty) || 0,
        total_properties: parseInt(stats.total_properties) || 0
      };
    } catch (error) {
      console.error("Error in getStats:", error);
      throw error;
    }
  },

  getDefaultPenaltyRules: async () => {
    try {
      const result = await db.query(
        `SELECT penalty_rules FROM move_out_inspections WHERE handover_id = 0 LIMIT 1`
      );

      let rows = [];
      if (Array.isArray(result)) {
        rows = result.length > 0 && Array.isArray(result[0]) ? result[0] : result;
      } else if (result && typeof result === 'object') {
        rows = result.rows || result.data || [];
      }

      if (rows.length > 0 && rows[0].penalty_rules) {
        return JSON.parse(rows[0].penalty_rules);
      }

      return [
        { id: '1', item_category: 'Furniture', from_condition: 'Good', to_condition: 'Damaged', penalty_amount: 500 },
        { id: '2', item_category: 'Furniture', from_condition: 'Good', to_condition: 'Missing', penalty_amount: 2000 },
        { id: '3', item_category: 'Electronics', from_condition: 'Good', to_condition: 'Damaged', penalty_amount: 1000 },
        { id: '4', item_category: 'Electronics', from_condition: 'Good', to_condition: 'Missing', penalty_amount: 5000 },
        { id: '5', item_category: 'Kitchen', from_condition: 'Good', to_condition: 'Damaged', penalty_amount: 300 },
        { id: '6', item_category: 'Kitchen', from_condition: 'Good', to_condition: 'Missing', penalty_amount: 1000 }
      ];
    } catch (error) {
      console.error("Error in getDefaultPenaltyRules:", error);
      return [];
    }
  }
};

module.exports = MoveOutInspectionModel;