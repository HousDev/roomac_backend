const db = require("../config/db");

// template fetch by category
const getTemplate = async (category, channel = "email") => {
  const [rows] = await db.query(
    `SELECT * FROM message_templates
     WHERE category = ?
     AND channel = ?
     AND is_active = 1
     AND status = 'approved'
     ORDER BY priority DESC, updated_at DESC
     LIMIT 1`,
    [category, channel],
  );

  if (!rows.length) {
    throw new Error("Template not found");
  }

  return rows[0];
};

// dynamic variable replace
const replaceVariables = (content, data) => {
  Object.keys(data).forEach((key) => {
const regex = new RegExp(`{${key}}`, "g");
    content = content.replace(regex, data[key]);
  });
  return content;
};

module.exports = { getTemplate, replaceVariables };
