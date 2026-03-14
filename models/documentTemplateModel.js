// models/documentTemplateModel.js
// Single table — version_history stored as JSON array column
const db = require("../config/db");

// ── helpers ──────────────────────────────────────────────────────────────────
const parseRow = (r) => {
  if (!r) return null;
  return {
    ...r,
    is_active:       r.is_active === 1 || r.is_active === true,
    variables:       _parseJson(r.variables,       []),
    version_history: _parseJson(r.version_history, []),
  };
};

const _parseJson = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

const extractVars = (html = "") => {
  const matches = [...html.matchAll(/{{(\w+)}}/g)];
  return [...new Set(matches.map((m) => m[1]))];
};

// ─────────────────────────────────────────────────────────────────────────────
const DocumentTemplateModel = {

  // GET all ──────────────────────────────────────────────────────────────────
  getAll: async (filters = {}) => {
    let q = `SELECT id, name, category, description, html_content, variables, version, is_active,
                    logo_url, change_notes, created_by, last_modified_by, created_at, updated_at
             FROM document_templates WHERE 1=1`;
    const p = [];

    if (filters.category) { q += ` AND category = ?`; p.push(filters.category); }

    if (filters.is_active !== undefined && filters.is_active !== "") {
      q += ` AND is_active = ?`;
      p.push(filters.is_active === "true" || filters.is_active === true ? 1 : 0);
    }
    if (filters.search) {
      q += ` AND (name LIKE ? OR description LIKE ? OR category LIKE ?)`;
      const s = `%${filters.search}%`;
      p.push(s, s, s);
    }

    q += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(q, p);
    return rows.map(parseRow);
  },

  // GET by ID ────────────────────────────────────────────────────────────────
  getById: async (id) => {
    const [rows] = await db.query(`SELECT * FROM document_templates WHERE id = ?`, [id]);
    return parseRow(rows[0]);
  },

  // CREATE ───────────────────────────────────────────────────────────────────
  create: async (data) => {
    const {
      name, category = "Other", description = null,
      html_content, logo_url = null,
      change_notes = "Initial version", created_by = "Admin",
    } = data;

    const variables = extractVars(html_content);

    // Seed version_history with the first snapshot
    const firstSnapshot = {
      version:     1,
      name,
      category,
      description,
      html_content,
      variables,
      logo_url,
      change_notes,
      modified_by: created_by,
      saved_at:    new Date().toISOString(),
    };

    const [result] = await db.query(
      `INSERT INTO document_templates
         (name, category, description, html_content, variables, version,
          version_history, is_active, logo_url, change_notes, created_by, last_modified_by)
       VALUES (?, ?, ?, ?, ?, 1, ?, 1, ?, ?, ?, ?)`,
      [
        name, category, description, html_content,
        JSON.stringify(variables),
        JSON.stringify([firstSnapshot]),
        logo_url, change_notes, created_by, created_by,
      ]
    );

    return DocumentTemplateModel.getById(result.insertId);
  },

  // UPDATE (auto-snapshot current state → version_history) ──────────────────
  update: async (id, data) => {
    const existing = await DocumentTemplateModel.getById(id);
    if (!existing) return null;

    const {
      name, category, description, html_content,
      logo_url, change_notes, is_active, last_modified_by = "Admin",
    } = data;

    // Snapshot CURRENT state before overwriting
    const snapshot = {
      version:     existing.version,
      name:        existing.name,
      category:    existing.category,
      description: existing.description,
      html_content: existing.html_content,
      variables:   existing.variables,
      logo_url:    existing.logo_url,
      change_notes: existing.change_notes,
      modified_by: existing.last_modified_by,
      saved_at:    existing.updated_at || new Date().toISOString(),
    };

    const history = [...(existing.version_history || []), snapshot];
    const newVersion = existing.version + 1;

    const newHtml      = html_content   ?? existing.html_content;
    const newVariables = extractVars(newHtml);

    const fields = [];
    const values = [];

    const set = (col, val) => { fields.push(`${col} = ?`); values.push(val); };

    set("name",             name             ?? existing.name);
    set("category",         category         ?? existing.category);
    set("description",      description      !== undefined ? description : existing.description);
    set("html_content",     newHtml);
    set("variables",        JSON.stringify(newVariables));
    set("version",          newVersion);
    set("version_history",  JSON.stringify(history));
    set("change_notes",     change_notes     ?? null);
    set("last_modified_by", last_modified_by);

    if (logo_url !== undefined) set("logo_url", logo_url);
    if (is_active !== undefined) set("is_active", is_active ? 1 : 0);

    values.push(id);
    await db.query(
      `UPDATE document_templates SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return DocumentTemplateModel.getById(id);
  },

  // DELETE ───────────────────────────────────────────────────────────────────
  delete: async (id) => {
    const [result] = await db.query(`DELETE FROM document_templates WHERE id = ?`, [id]);
    return result;
  },

  // BULK DELETE ──────────────────────────────────────────────────────────────
  bulkDelete: async (ids) => {
    if (!ids?.length) return { affectedRows: 0 };
    const ph = ids.map(() => "?").join(",");
    const [result] = await db.query(`DELETE FROM document_templates WHERE id IN (${ph})`, ids);
    return result;
  },

  // BULK STATUS ──────────────────────────────────────────────────────────────
  bulkStatus: async (ids, is_active) => {
    if (!ids?.length) return { affectedRows: 0 };
    const ph = ids.map(() => "?").join(",");
    const [result] = await db.query(
      `UPDATE document_templates SET is_active = ?, updated_at = NOW() WHERE id IN (${ph})`,
      [is_active ? 1 : 0, ...ids]
    );
    return result;
  },

  // RESTORE VERSION ──────────────────────────────────────────────────────────
  // Finds the snapshot by version number inside version_history JSON
  restoreVersion: async (id, targetVersion, restoredBy = "Admin") => {
    const existing = await DocumentTemplateModel.getById(id);
    if (!existing) return null;

    const snap = (existing.version_history || []).find((v) => v.version === Number(targetVersion));
    if (!snap) return null;

    return DocumentTemplateModel.update(id, {
      name:             snap.name,
      category:         snap.category,
      description:      snap.description,
      html_content:     snap.html_content,
      logo_url:         snap.logo_url,
      change_notes:     `Restored from v${snap.version}`,
      last_modified_by: restoredBy,
    });
  },
};

module.exports = { DocumentTemplateModel, extractVars };