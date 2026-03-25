// models/documentModel.js
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
             html_content, data_json,
             created_at, updated_at
      FROM documents WHERE 1=1`;
    const p = [];

    if (f.status)    { q += ` AND status = ?`;    p.push(f.status); }
    if (f.priority)  { q += ` AND priority = ?`;  p.push(f.priority); }
    if (f.tenant_id) { q += ` AND tenant_id = ?`; p.push(f.tenant_id); }

    // ── NEW: property_name filter ─────────────────────────────────────────────
    if (f.property_name) {
      q += ` AND property_name COLLATE utf8mb4_general_ci LIKE ?`;
      p.push(`%${f.property_name}%`);
    }

    // ── NEW: floor filter — room_number starts with floor prefix e.g. "1" ─────
    // Assumes room_number format is "<floor>XX" like "101","102" for floor 1
    // We match by joining rooms table if you store floor separately,
    // but here we filter via data_json->floor or room_number prefix
    // Floor is stored in rooms table; here we filter documents by room_number prefix
    if (f.floor !== undefined && f.floor !== null && f.floor !== "") {
      // room_number like "101" starts with floor number
      q += ` AND room_number LIKE ?`;
      p.push(`${f.floor}%`);
    }

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

    // ── NEW: hide_expired — exclude docs where expiry_date < TODAY ────────────
    if (f.hide_expired === "true") {
      q += ` AND (expiry_date IS NULL OR DATE(expiry_date) >= CURDATE())`;
    }

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

  // ── NEW: get distinct tenant_ids that already have a doc for a given template
  // Used by DocumentCreate Step 2 to exclude those tenants
  getTenantsWithTemplate: async (templateId) => {
    const [rows] = await db.query(
      `SELECT DISTINCT tenant_id FROM documents WHERE template_id = ? AND tenant_id IS NOT NULL`,
      [templateId]
    );
    return rows; // [{ tenant_id: 1 }, { tenant_id: 5 }, ...]
  },

  // With trigger, you don't need to generate document_number
  create: async (d) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const initialHistory = JSON.stringify([{
            status: "Created",
            event_type: "Created",
            event_description: `Document "${d.document_name}" created`,
            performed_by: d.created_by || "Admin",
            metadata: { template_id: d.template_id, tenant_name: d.tenant_name },
            created_at: new Date().toISOString(),
        }]);

        // Insert the document WITHOUT document_number - trigger will add it
        const [res] = await connection.query(
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
                d.template_id, 
                d.document_name, 
                d.document_title || null, 
                d.document_type || null,
                d.tenant_id || null, 
                d.tenant_name, 
                d.tenant_phone, 
                d.tenant_email || null,
                d.aadhaar_number || null, 
                d.pan_number || null,
                d.emergency_contact_name || null, 
                d.emergency_phone || null,
                d.property_name || null, 
                d.property_address || null,
                d.room_number || null, 
                d.bed_number || null,
                d.move_in_date || null, 
                d.rent_amount || null,
                d.security_deposit || null, 
                d.payment_mode || null,
                d.company_name || null, 
                d.company_address || null,
                d.html_content, 
                JSON.stringify(d.data_json || {}),
                d.status || "Created", 
                d.created_by || "Admin",
                d.signature_required ? 1 : 0, 
                d.priority || "normal",
                d.expiry_date || null, 
                JSON.stringify(d.tags || []),
                d.notes || null, 
                initialHistory,
            ]
        );
        
        await connection.commit();
        
        // Get the created document (with trigger-generated document_number)
        const [newDoc] = await connection.query(
            'SELECT * FROM documents WHERE id = ?',
            [res.insertId]
        );
        
        return newDoc[0];
        
    } catch (error) {
        await connection.rollback();
        console.error('Error in document creation:', error);
        throw error;
    } finally {
        connection.release();
    }
  },

  updateStatus: async (id, status, performedBy = "Admin", extra = {}) => {
    const entry = JSON.stringify({
      status, event_type: status,
      event_description: `Status changed to ${status}`,
      performed_by: performedBy,
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

  bulkDelete: async (ids) => {
    if (!ids?.length) return { affectedRows: 0 };
    const ph = ids.map(() => "?").join(",");
    const [r] = await db.query(`DELETE FROM documents WHERE id IN (${ph})`, ids);
    return r;
  },
};

// Add to DocumentModel in both documentModel.js and documentListModel.js
updateDocument: async (id, data) => {
  const existing = await DocumentModel.getById(id);
  if (!existing) return null;

  // Merge new data_json with existing
  const existingJson = existing.data_json || {};
  const newDataJson = { ...existingJson, ...data.data_json };

  // Re-render html_content: replace all {{variable}} placeholders
  let newHtml = existing.html_content;
  Object.entries(newDataJson).forEach(([key, val]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    newHtml = newHtml.replace(regex, val || '');
  });

  const [result] = await db.query(
    `UPDATE documents SET
      tenant_name = ?, tenant_phone = ?, tenant_email = ?,
      aadhaar_number = ?, pan_number = ?,
      emergency_contact_name = ?, emergency_phone = ?,
      property_name = ?, property_address = ?,
      room_number = ?, bed_number = ?,
      move_in_date = ?, rent_amount = ?, security_deposit = ?,
      payment_mode = ?, company_name = ?, company_address = ?,
      notes = ?, data_json = ?, html_content = ?,
      updated_at = NOW()
     WHERE id = ?`,
    [
      data.tenant_name, data.tenant_phone, data.tenant_email || null,
      data.aadhaar_number || null, data.pan_number || null,
      data.emergency_contact_name || null, data.emergency_phone || null,
      data.property_name || null, data.property_address || null,
      data.room_number || null, data.bed_number || null,
      data.move_in_date || null,
      data.rent_amount ? parseFloat(data.rent_amount) : null,
      data.security_deposit ? parseFloat(data.security_deposit) : null,
      data.payment_mode || null, data.company_name || null,
      data.company_address || null, data.notes || null,
      JSON.stringify(newDataJson), newHtml,
      id
    ]
  );
  return DocumentModel.getById(id);
},
module.exports = { DocumentModel };