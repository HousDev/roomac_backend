// controllers/adminTemplateController.js
const db = require("../config/db");

// ─── VARIABLES AVAILABLE PER CATEGORY ───────────────────────────────────────
const CATEGORY_VARIABLES = {
  otp: ["otp", "tenant_name", "expiry_minutes"],
  payment: [
    "tenant_name",
    "amount",
    "property_name",
    "receipt_id",
    "payment_date",
    "due_date",
  ],
  verification: ["tenant_name", "verify_link", "otp", "expiry_hours"],
  marketing: [
    "name",
    "property_name",
    "location",
    "price",
    "cta_url",
    "discount",
  ],
  alert: ["tenant_name", "request_id", "status", "staff_name", "property_name"],
  reminder: [
    "tenant_name",
    "amount",
    "due_date",
    "property_name",
    "room_number",
  ],
  welcome: [
    "tenant_name",
    "property_name",
    "checkin_date",
    "room_number",
    "staff_name",
  ],
  notice: ["tenant_name", "notice_message", "effective_date", "property_name"],
};

// ─── GET ALL TEMPLATES ───────────────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
const { channel, category, status, search, is_active } = req.query;
    let where = [];  // ← REMOVE "mt.is_active = 1" from here
    const params = [];

    if (is_active !== undefined && is_active !== "all") {
  where.push("mt.is_active = ?");
  params.push(Number(is_active));
}
    if (channel && channel !== "all") {
      where.push("mt.channel = ?");
      params.push(channel);
    }
    if (category && category !== "all") {
      where.push("mt.category = ?");
      params.push(category);
    }
    if (status && status !== "all") {
      where.push("mt.status = ?");
      params.push(status);
    }
    if (search) {
      where.push("(mt.name LIKE ? OR mt.content LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

   const sql = `
  SELECT 
    mt.*,
    creator.name  AS created_by_name,
    approver.name AS approved_by_name
  FROM message_templates mt
  LEFT JOIN staff creator  ON mt.created_by  = creator.id
  LEFT JOIN staff approver ON mt.approved_by = approver.id
  ${where.length ? "WHERE " + where.join(" AND ") : ""}
  ORDER BY mt.created_at DESC
`;

    const [templates] = await db.query(sql, params);

    const formatted = templates.map((t) => ({
      ...t,
      variables: t.variables
        ? typeof t.variables === "string"
          ? JSON.parse(t.variables)
          : t.variables
        : [],
    }));

   const [stats] = await db.query(`
      SELECT
        channel,
        SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        COUNT(*) AS total
      FROM message_templates
      GROUP BY channel
    `);

    res.json({ success: true, data: formatted, stats });
  } catch (err) {
    console.error("❌ Error fetching templates:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch templates" });
  }
};

// ─── GET SINGLE TEMPLATE ─────────────────────────────────────────────────────
// ─── GET SINGLE TEMPLATE ─────────────────────────────────────────────────────
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT mt.*, creator.name AS created_by_name, approver.name AS approved_by_name
       FROM message_templates mt
       LEFT JOIN staff creator ON mt.created_by = creator.id
       LEFT JOIN staff approver ON mt.approved_by = approver.id
       WHERE mt.id = ?`,
      [id]
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });

    const t = rows[0];
    t.variables = t.variables
      ? typeof t.variables === "string"
        ? JSON.parse(t.variables)
        : t.variables
      : [];

    res.json({ success: true, data: t });
  } catch (err) {
    console.error("❌ Error fetching template:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch template" });
  }
};

// ─── CREATE TEMPLATE ─────────────────────────────────────────────────────────
exports.createTemplate = async (req, res) => {
  try {
    const {
      name,
      channel,
      category,
      content,
      subject,
      variables,
      status,
      priority,
      auto_approve,
    } = req.body;

    if (!name || !channel || !category || !content) {
      return res.status(400).json({
        success: false,
        message: "name, channel, category, content are required",
      });
    }

    const contentVars = (content.match(/\{(\w+)\}/g) || []).map((v) =>
      v.replace(/[{}]/g, ""),
    );
    const finalVars = variables && variables.length ? variables : contentVars;

    const finalStatus = auto_approve ? "approved" : status || "pending";
    const approvedAt = finalStatus === "approved" ? new Date() : null;
    const approvedBy =
      finalStatus === "approved" ? req.admin?.id || null : null;

    const [result] = await db.query(
      `INSERT INTO message_templates
        (name, channel, category, content, subject, variables, status, priority,
         auto_approve, created_by, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        channel,
        category,
        content,
        subject || null,
        JSON.stringify(finalVars),
        finalStatus,
        priority || "normal",
        auto_approve ? 1 : 0,
        req.admin?.id || null,
        approvedBy,
        approvedAt,
      ],
    );

    const [newTemplate] = await db.query(
      "SELECT * FROM message_templates WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: newTemplate[0],
    });
  } catch (err) {
    console.error("❌ Error creating template:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to create template" });
  }
};

// ─── UPDATE TEMPLATE ─────────────────────────────────────────────────────────
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      channel,
      category,
      content,
      subject,
      variables,
      status,
      priority,
      auto_approve,
      rejection_reason,
    } = req.body;

    const [existing] = await db.query(
      "SELECT * FROM message_templates WHERE id = ? AND is_active = 1",
      [id],
    );
    if (!existing.length)
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });

    const updates = [];
    const params = [];

    if (name) {
      updates.push("name = ?");
      params.push(name);
    }
    if (channel) {
      updates.push("channel = ?");
      params.push(channel);
    }
    if (category) {
      updates.push("category = ?");
      params.push(category);
    }
    if (content) {
      updates.push("content = ?");
      params.push(content);
    }
    if (subject !== undefined) {
      updates.push("subject = ?");
      params.push(subject);
    }
    if (priority) {
      updates.push("priority = ?");
      params.push(priority);
    }
    if (auto_approve !== undefined) {
      updates.push("auto_approve = ?");
      params.push(auto_approve ? 1 : 0);
    }

    if (variables) {
      updates.push("variables = ?");
      params.push(JSON.stringify(variables));
    } else if (content) {
      const contentVars = (content.match(/\{(\w+)\}/g) || []).map((v) =>
        v.replace(/[{}]/g, ""),
      );
      updates.push("variables = ?");
      params.push(JSON.stringify(contentVars));
    }

    if (status) {
      updates.push("status = ?");
      params.push(status);
      if (status === "approved") {
        updates.push("approved_by = ?", "approved_at = NOW()");
        params.push(req.admin?.id || null);
      }
      if (status === "rejected" && rejection_reason) {
        updates.push("rejection_reason = ?");
        params.push(rejection_reason);
      }
    }

    updates.push("updated_at = NOW()");
    params.push(id);

    await db.query(
      `UPDATE message_templates SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    const [updated] = await db.query(
      "SELECT * FROM message_templates WHERE id = ?",
      [id],
    );
    res.json({
      success: true,
      message: "Template updated successfully",
      data: updated[0],
    });
  } catch (err) {
    console.error("❌ Error updating template:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to update template" });
  }
};

// ─── DELETE TEMPLATE (soft) ──────────────────────────────────────────────────
// ─── DELETE TEMPLATE (hard delete) ──────────────────────────────────────────
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      "DELETE FROM message_templates WHERE id = ?",
      [id]
    );
    if (!result.affectedRows)
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    res.json({ success: true, message: "Template deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting template:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete template" });
  }
};

// ─── BULK DELETE ─────────────────────────────────────────────────────────────
// ─── BULK DELETE (hard delete) ─────────────────────────────────────────────
exports.bulkDeleteTemplates = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || !ids.length) {
      return res
        .status(400)
        .json({ success: false, message: "Provide array of ids" });
    }
    const [result] = await db.query(
      "DELETE FROM message_templates WHERE id IN (?)",
      [ids]
    );
    res.json({
      success: true,
      message: `Deleted ${result.affectedRows} templates`,
    });
  } catch (err) {
    console.error("❌ Error bulk deleting templates:", err.message);
    res.status(500).json({ success: false, message: "Failed to bulk delete" });
  }
};

// ─── APPROVE / REJECT ────────────────────────────────────────────────────────
exports.approveTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      "UPDATE message_templates SET status = 'approved', approved_by = ?, approved_at = NOW(), rejection_reason = NULL WHERE id = ?",
      [req.admin?.id || null, id],
    );
    res.json({ success: true, message: "Template approved" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to approve template" });
  }
};

exports.rejectTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    await db.query(
      "UPDATE message_templates SET status = 'rejected', rejection_reason = ? WHERE id = ?",
      [rejection_reason || "No reason provided", id],
    );
    res.json({ success: true, message: "Template rejected" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to reject template" });
  }
};

// ─── DUPLICATE TEMPLATE (FIXED) ──────────────────────────────────────────────
exports.duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔄 Duplicating template ID:", id);

    const [rows] = await db.query(
      "SELECT * FROM message_templates WHERE id = ? AND is_active = 1",
      [id],
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    const orig = rows[0];
    console.log("📄 Original template:", orig.name);

    // ✅ Handle variables safely (ensure JSON string)
    let variablesValue = orig.variables;
    if (typeof variablesValue === "object") {
      variablesValue = JSON.stringify(variablesValue);
    }
    if (!variablesValue || variablesValue === "null") {
      variablesValue = "[]";
    }

    // ✅ Handle subject: if column is NOT NULL, use empty string instead of null
    const subjectValue = orig.subject === null ? "" : orig.subject;

    // ✅ Ensure auto_approve is 0 or 1
    const autoApproveValue = orig.auto_approve === 1 ? 1 : 0;

    // ✅ Priority default
    const priorityValue = orig.priority || "normal";

    const createdBy = req.admin?.id || null;

    const [result] = await db.query(
      `INSERT INTO message_templates
        (name, channel, category, content, subject, variables, status, priority, auto_approve, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        `${orig.name} (Copy)`,
        orig.channel,
        orig.category,
        orig.content,
        subjectValue,
        variablesValue,
        priorityValue,
        autoApproveValue,
        createdBy,
      ],
    );

    const [newT] = await db.query(
      "SELECT * FROM message_templates WHERE id = ?",
      [result.insertId],
    );
    res.status(201).json({
      success: true,
      message: "Template duplicated",
      data: newT[0],
    });
  } catch (err) {
    console.error("❌ Duplicate template error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to duplicate template: " + err.message,
    });
  }
};

// ─── GET VARIABLES FOR CATEGORY ──────────────────────────────────────────────
exports.getCategoryVariables = async (req, res) => {
  try {
    const { category } = req.params;
    const variables = CATEGORY_VARIABLES[category] || [];
    res.json({ success: true, data: variables });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to get variables" });
  }
};

// ─── INCREMENT USAGE COUNT ───────────────────────────────────────────────────
exports.incrementUsage = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      "UPDATE message_templates SET usage_count = usage_count + 1 WHERE id = ?",
      [id],
    );
    res.json({ success: true, message: "Usage incremented" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to increment usage" });
  }
};

// ─── TOGGLE ACTIVE/INACTIVE ──────────────────────────────────────────────────
exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT is_active FROM message_templates WHERE id = ?", [id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Template not found" });

    const newVal = rows[0].is_active === 1 ? 0 : 1;
    await db.query(
      "UPDATE message_templates SET is_active = ?, updated_at = NOW() WHERE id = ?",
      [newVal, id]
    );
    res.json({ success: true, is_active: newVal, message: newVal ? "Activated" : "Deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to toggle status" });
  }
};