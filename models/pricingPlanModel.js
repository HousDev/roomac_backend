// models/pricingPlanModel.js
const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const PricingPlanModel = {

  async findAllWithPagination(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT p.*, pr.name as property_name
      FROM pricing_plans p
      LEFT JOIN properties pr ON p.property_id = pr.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ` AND (p.name LIKE ? OR p.duration LIKE ? OR pr.name LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }

    if (filters.property_id && filters.property_id !== "all") {
      if (filters.property_id === "general") {
        query += ` AND p.property_id IS NULL`;
      } else {
        query += ` AND p.property_id = ?`;
        params.push(filters.property_id);
      }
    }

    if (filters.is_active !== undefined) {
      query += ` AND p.is_active = ?`;
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.type === "regular") {
      query += ` AND (p.is_short_stay = 0 OR p.is_short_stay IS NULL)`;
    } else if (filters.type === "short_stay") {
      query += ` AND p.is_short_stay = 1`;
    }

    // ORDER: short_stay last, then display_order ASC (lower = first), then created_at DESC
    query += ` ORDER BY p.is_short_stay ASC, p.display_order ASC, p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    return rows.map(row => ({
      ...row,
      features: row.features
        ? (typeof row.features === "string" ? JSON.parse(row.features) : row.features)
        : [],
      is_short_stay: row.is_short_stay === 1,
    }));
  },

  async getTotalCount(filters = {}) {
    let query = `
      SELECT COUNT(*) as total FROM pricing_plans p
      LEFT JOIN properties pr ON p.property_id = pr.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ` AND (p.name LIKE ? OR p.duration LIKE ? OR pr.name LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }

    if (filters.property_id && filters.property_id !== "all") {
      if (filters.property_id === "general") {
        query += ` AND p.property_id IS NULL`;
      } else {
        query += ` AND p.property_id = ?`;
        params.push(filters.property_id);
      }
    }

    if (filters.is_active !== undefined) {
      query += ` AND p.is_active = ?`;
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.type === "regular") {
      query += ` AND (p.is_short_stay = 0 OR p.is_short_stay IS NULL)`;
    } else if (filters.type === "short_stay") {
      query += ` AND p.is_short_stay = 1`;
    }

    const [[result]] = await db.query(query, params);
    return result.total;
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT p.*, pr.name as property_name
       FROM pricing_plans p
       LEFT JOIN properties pr ON p.property_id = pr.id
       WHERE p.id = ?`,
      [id]
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      ...row,
      features: row.features
        ? (typeof row.features === "string" ? JSON.parse(row.features) : row.features)
        : [],
      is_short_stay: row.is_short_stay === 1,
    };
  },

  async create(data) {
    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const features = Array.isArray(data.features)
      ? JSON.stringify(data.features)
      : (data.features || "[]");

    await db.query(
      `INSERT INTO pricing_plans
        (id, property_id, name, duration, subtitle, total_price, per_day_price,
         is_popular, button_style, features, is_active, display_order,
         is_short_stay, short_stay_label, short_stay_rate_per_day,
         created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        data.property_id || null,
        data.name,
        data.duration,
        data.subtitle || "All-inclusive",
        parseFloat(data.total_price) || 0,
        parseFloat(data.per_day_price) || 0,
        data.is_popular ? 1 : 0,
        data.button_style || "blue",
        features,
        data.is_active !== false ? 1 : 0,
        parseInt(data.display_order) || 0,
        data.is_short_stay ? 1 : 0,
        data.short_stay_label || "Book Short Stay",
        parseFloat(data.short_stay_rate_per_day) || 500,
        now, now,
      ]
    );
    return { id };
  },

  async update(id, data) {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const features = data.features !== undefined
      ? (Array.isArray(data.features) ? JSON.stringify(data.features) : data.features)
      : undefined;

    const fields = [];
    const params = [];

    if (data.property_id !== undefined) { fields.push("property_id = ?"); params.push(data.property_id || null); }
    if (data.name !== undefined) { fields.push("name = ?"); params.push(data.name); }
    if (data.duration !== undefined) { fields.push("duration = ?"); params.push(data.duration); }
    if (data.subtitle !== undefined) { fields.push("subtitle = ?"); params.push(data.subtitle); }
    if (data.total_price !== undefined) { fields.push("total_price = ?"); params.push(parseFloat(data.total_price)); }
    if (data.per_day_price !== undefined) { fields.push("per_day_price = ?"); params.push(parseFloat(data.per_day_price)); }
    if (data.is_popular !== undefined) { fields.push("is_popular = ?"); params.push(data.is_popular ? 1 : 0); }
    if (data.button_style !== undefined) { fields.push("button_style = ?"); params.push(data.button_style); }
    if (features !== undefined) { fields.push("features = ?"); params.push(features); }
    if (data.is_active !== undefined) { fields.push("is_active = ?"); params.push(data.is_active ? 1 : 0); }
    if (data.display_order !== undefined) { fields.push("display_order = ?"); params.push(parseInt(data.display_order)); }
    if (data.is_short_stay !== undefined) { fields.push("is_short_stay = ?"); params.push(data.is_short_stay ? 1 : 0); }
    if (data.short_stay_label !== undefined) { fields.push("short_stay_label = ?"); params.push(data.short_stay_label); }
    if (data.short_stay_rate_per_day !== undefined) { fields.push("short_stay_rate_per_day = ?"); params.push(parseFloat(data.short_stay_rate_per_day)); }

    fields.push("updated_at = ?");
    params.push(now);
    params.push(id);

    await db.query(`UPDATE pricing_plans SET ${fields.join(", ")} WHERE id = ?`, params);
  },

  async delete(id) {
    await db.query("DELETE FROM pricing_plans WHERE id = ?", [id]);
  },

  async toggleActive(id, isActive) {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await db.query(
      "UPDATE pricing_plans SET is_active = ?, updated_at = ? WHERE id = ?",
      [isActive ? 1 : 0, now, id]
    );
  },

  // FIX: propertyId null → general banner (property_id IS NULL)
  //      propertyId set  → property-specific banner
  async getShortStayBanner(propertyId = null) {
    let query = `
      SELECT * FROM pricing_plans
      WHERE is_short_stay = 1 AND is_active = 1
    `;
    const params = [];

    if (propertyId) {
      query += ` AND property_id = ?`;
      params.push(propertyId);
    } else {
      query += ` AND property_id IS NULL`;
    }

    query += ` ORDER BY created_at DESC LIMIT 1`;

    const [rows] = await db.query(query, params);
    if (rows.length) {
      return {
        id: rows[0].id,
        property_id: rows[0].property_id,
        label: rows[0].short_stay_label,
        rate_per_day: rows[0].short_stay_rate_per_day,
        is_active: rows[0].is_active === 1,
      };
    }
    // Return null so callers can fall back to general
    return null;
  },

  // FIX: one short stay per scope (general OR per-property), not cross-contaminated
  async upsertShortStayBanner(data) {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const propertyId = data.property_id || null;

    let query = `SELECT id FROM pricing_plans WHERE is_short_stay = 1`;
    const params = [];

    if (propertyId) {
      query += ` AND property_id = ?`;
      params.push(propertyId);
    } else {
      query += ` AND property_id IS NULL`;
    }

    const [existing] = await db.query(query, params);

    if (existing.length) {
      await db.query(
        `UPDATE pricing_plans
         SET short_stay_label = ?, short_stay_rate_per_day = ?, is_active = ?, updated_at = ?
         WHERE id = ?`,
        [
          data.label || "Book Short Stay",
          parseFloat(data.rate_per_day) || 500,
          data.is_active !== false ? 1 : 0,
          now,
          existing[0].id,
        ]
      );
      return { id: existing[0].id };
    } else {
      const id = uuidv4();
      await db.query(
        `INSERT INTO pricing_plans
         (id, property_id, name, duration, subtitle, total_price, per_day_price,
          is_short_stay, short_stay_label, short_stay_rate_per_day, is_active,
          display_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          propertyId,
          "Short Stay",
          "Daily",
          "Flexible daily booking",
          0,
          0,
          1,
          data.label || "Book Short Stay",
          parseFloat(data.rate_per_day) || 500,
          data.is_active !== false ? 1 : 0,
          999, // short stay always last
          now,
          now,
        ]
      );
      return { id };
    }
  },
};

module.exports = PricingPlanModel;