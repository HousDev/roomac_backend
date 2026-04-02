// models/documentListModel.js
const db = require("../config/db");

const _j = (v, fb) => {
  if (!v) return fb;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return fb; }
};

const parseRow = (r) => {
  if (!r) return null;
  return {
    ...r,
    signature_required: r.signature_required === 1 || r.signature_required === true,
    tags:        _j(r.tags, []),
    data_json:   _j(r.data_json, {}),
    history_log: _j(r.history_log, []),
  };
};

const DocumentModel = {

  getAll: async (f = {}) => {
    let q = `
      SELECT id, document_number, template_id, document_name, document_title, document_type,
             tenant_id, tenant_name, tenant_phone, tenant_email,
             property_name, room_number, bed_number, rent_amount, security_deposit,
             company_name, status, created_by, signature_required, priority,
             expiry_date, tags, notes, signed_at, signed_by, share_token,
             html_content, data_json,  history_log,
             created_at, updated_at
      FROM documents WHERE 1=1`;
    const p = [];

    if (f.status)    { q += ` AND status = ?`;    p.push(f.status); }
    if (f.priority)  { q += ` AND priority = ?`;  p.push(f.priority); }
    if (f.tenant_id) { q += ` AND tenant_id = ?`; p.push(f.tenant_id); }

    if (f.search) {
      q += ` AND (
        tenant_name     COLLATE utf8mb4_general_ci LIKE ? OR
        tenant_phone    COLLATE utf8mb4_general_ci LIKE ? OR
        document_number COLLATE utf8mb4_general_ci LIKE ? OR
        document_name   COLLATE utf8mb4_general_ci LIKE ?
      )`;
      const s = `%${f.search}%`;
      p.push(s, s, s, s);
    }

    if (f.from_date) { q += ` AND DATE(created_at) >= ?`; p.push(f.from_date); }
    if (f.to_date)   { q += ` AND DATE(created_at) <= ?`; p.push(f.to_date); }

    const pg = Math.max(1, parseInt(f.page     || "1"));
    const ps = Math.min(100, Math.max(1, parseInt(f.pageSize || "50")));

    const cq = q.replace(/SELECT[\s\S]*?FROM documents/, "SELECT COUNT(*) as total FROM documents");
    const [[{ total }]] = await db.query(cq, p);

    q += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    p.push(ps, (pg - 1) * ps);

    const [rows] = await db.query(q, p);
    return { data: rows.map(parseRow), total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) };
  },

  getById: async (id) => {
    const [rows] = await db.query(`SELECT * FROM documents WHERE id = ?`, [id]);
    return parseRow(rows[0]);
  },

  create: async (d) => {
    const initialHistory = JSON.stringify([{
      status:            "Created",
      event_type:        "Created",
      event_description: `Document "${d.document_name}" created`,
      performed_by:      d.created_by || "Admin",
      metadata:          { template_id: d.template_id, tenant_name: d.tenant_name },
      created_at:        new Date().toISOString(),
    }]);

    const [res] = await db.query(
      `INSERT INTO documents
         (template_id, document_name, document_title, document_type,
          tenant_id, tenant_name, tenant_phone, tenant_email,
          aadhaar_number, pan_number, emergency_contact_name, emergency_phone,
          property_name, property_address, room_number, bed_number,
          move_in_date, rent_amount, security_deposit, payment_mode,
          company_name, company_address,
          html_content, data_json,
          status, created_by, signature_required, priority,
          expiry_date, tags, notes, history_log)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        d.template_id,       d.document_name,    d.document_title || null,  d.document_type || null,
        d.tenant_id || null, d.tenant_name,      d.tenant_phone,            d.tenant_email || null,
        d.aadhaar_number || null,  d.pan_number || null,
        d.emergency_contact_name || null, d.emergency_phone || null,
        d.property_name || null,   d.property_address || null,
        d.room_number || null,     d.bed_number || null,
        d.move_in_date || null,    d.rent_amount || null,
        d.security_deposit || null, d.payment_mode || null,
        d.company_name || null,    d.company_address || null,
        d.html_content,            JSON.stringify(d.data_json || {}),
        d.status || "Created",     d.created_by || "Admin",
        d.signature_required ? 1 : 0, d.priority || "normal",
        d.expiry_date || null,     JSON.stringify(d.tags || []),
        d.notes || null,           initialHistory,
      ]
    );
    return DocumentModel.getById(res.insertId);
  },

  updateStatus: async (id, status, performedBy = "Admin", extra = {}) => {
    const entry = JSON.stringify({
      status, event_type: status,
      event_description: `Status changed to ${status}`,
      performed_by: performedBy,
      notes: extra.notes || null,
      metadata: extra.metadata || null,
      created_at: new Date().toISOString(),
    });
    const fields = [
      "status = ?",
      `history_log = JSON_ARRAY_APPEND(IFNULL(history_log, JSON_ARRAY()), '$', CAST(? AS JSON))`,
    ];
    const vals = [status, entry];
    if (status === "Signed") {
      fields.push("signed_at = ?", "signed_by = ?", "signature_data = ?");
      vals.push(new Date(), extra.signed_by || null, extra.signature_data || null);
    }
    vals.push(id);
    await db.query(`UPDATE documents SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`, vals);
    return DocumentModel.getById(id);
  },

  generateShareToken: async (id) => {
    const token   = require("crypto").randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 72 * 3600 * 1000);
    await db.query(`UPDATE documents SET share_token = ?, share_expires_at = ? WHERE id = ?`, [token, expires, id]);
    return { token, expires };
  },

  delete: async (id) => {
    const [r] = await db.query(`DELETE FROM documents WHERE id = ?`, [id]);
    return r;
  },
 updateDocument: async (id, data) => {
    const existing = await DocumentModel.getById(id);
    if (!existing) return null;

    const existingJson = existing.data_json || {};
    const newDataJson = { ...existingJson, ...data.data_json };

    // Get the original template html to re-render from scratch
    const [templateRows] = await db.query(
      `SELECT html_content, logo_url FROM document_templates WHERE id = ?`,
      [existing.template_id]
    );

    let newHtml = existing.html_content;

    if (templateRows && templateRows[0] && templateRows[0].html_content) {
      // Re-render from original template with new values
      newHtml = templateRows[0].html_content;
      
      // Handle logo
      const logoUrl = templateRows[0].logo_url || "";
      const API_BASE = process.env.API_BASE_URL || "http://localhost:3001";
      if (logoUrl) {
        const fullLogoUrl = logoUrl.startsWith("http") ? logoUrl : `${API_BASE}${logoUrl}`;
        newHtml = newHtml.replace(
          /\{\{logo_url\}\}/g,
          `<img src="${fullLogoUrl}" style="max-height:60px;max-width:160px;object-fit:contain;" />`
        );
      } else {
        newHtml = newHtml.replace(/\{\{logo_url\}\}/g, "");
      }

      // Replace all variables from newDataJson
      Object.entries(newDataJson).forEach(([key, val]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        newHtml = newHtml.replace(regex, val || '');
      });

      // Replace any remaining placeholders with empty
      newHtml = newHtml.replace(/\{\{[\w_]+\}\}/g, '');
    } else {
      // Fallback: try replacing in existing html using old→new value swap
      const oldJson = existingJson;
      Object.entries(newDataJson).forEach(([key, newVal]) => {
        const oldVal = String(oldJson[key] || '');
        const newValStr = String(newVal || '');
        if (oldVal && oldVal !== newValStr) {
          const escaped = oldVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          newHtml = newHtml.replace(new RegExp(escaped, 'g'), newValStr);
        }
      });
    }

    await db.query(
      `UPDATE documents SET
        tenant_name = ?, tenant_phone = ?, tenant_email = ?,
        aadhaar_number = ?, pan_number = ?,
        emergency_contact_name = ?, emergency_phone = ?,
        property_name = ?, room_number = ?, bed_number = ?,
        move_in_date = ?, rent_amount = ?, security_deposit = ?,
        payment_mode = ?, company_name = ?, company_address = ?,
        notes = ?, data_json = ?, html_content = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        data.tenant_name,            data.tenant_phone,
        data.tenant_email || null,   data.aadhaar_number || null,
        data.pan_number || null,     data.emergency_contact_name || null,
        data.emergency_phone || null, data.property_name || null,
        data.room_number || null,    data.bed_number || null,
        data.move_in_date || null,
        data.rent_amount ? parseFloat(data.rent_amount) : null,
        data.security_deposit ? parseFloat(data.security_deposit) : null,
        data.payment_mode || null,   data.company_name || null,
        data.company_address || null, data.notes || null,
        JSON.stringify(newDataJson), newHtml, id,
      ]
    );
    return DocumentModel.getById(id);
  },

  bulkDelete: async (ids) => {
    if (!ids?.length) return { affectedRows: 0 };
    const ph = ids.map(() => "?").join(",");
    const [r] = await db.query(`DELETE FROM documents WHERE id IN (${ph})`, ids);
    return r;
  },

getByTenantId: async (tenantId, options = {}) => {
  const { page = 1, pageSize = 50, status, search } = options;
  
  let query = `
    SELECT id, document_number, template_id, document_name, document_title, document_type,
           tenant_id, tenant_name, tenant_phone, tenant_email,
           property_name, room_number, bed_number, rent_amount, security_deposit,
           company_name, status, created_by, signature_required, priority,
           expiry_date, tags, notes, signed_at, signed_by, share_token,
           html_content, data_json,
           created_at, updated_at
    FROM documents 
    WHERE tenant_id = ?`;
  
  const params = [tenantId];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (search) {
    query += ` AND (
      document_name COLLATE utf8mb4_general_ci LIKE ? OR
      document_title COLLATE utf8mb4_general_ci LIKE ? OR
      document_type COLLATE utf8mb4_general_ci LIKE ? OR
      document_number COLLATE utf8mb4_general_ci LIKE ?
    )`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM documents 
    WHERE tenant_id = ? 
    ${status ? 'AND status = ?' : ''} 
    ${search ? 'AND (document_name LIKE ? OR document_title LIKE ? OR document_type LIKE ? OR document_number LIKE ?)' : ''}
  `;
  
  const countParams = [tenantId];
  if (status) countParams.push(status);
  if (search) {
    const s = `%${search}%`;
    countParams.push(s, s, s, s);
  }
  
  const [[{ total }]] = await db.query(countQuery, countParams);

  // Add pagination
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

  const [rows] = await db.query(query, params);
  
  return { 
    data: rows.map(parseRow), 
    total, 
    page: parseInt(page), 
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(total / parseInt(pageSize))
  };
},
};

module.exports = { DocumentListModel: DocumentModel };