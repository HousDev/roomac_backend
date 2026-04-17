const db = require("../config/db");

// template fetch by category (with optional sub_category)
const getTemplate = async (category, channel = "email", sub_category = null) => {
  let query = `
    SELECT * FROM message_templates
    WHERE category = ?
    AND channel = ?
    AND is_active = 1
    AND status = 'approved'
  `;
  const params = [category, channel];

  // ✅ sub_category is OPTIONAL - only add to query if provided
  if (sub_category && sub_category !== "") {
    query += ` AND sub_category = ?`;
    params.push(sub_category);
  }

  query += ` ORDER BY priority DESC, updated_at DESC LIMIT 1`;

  const [rows] = await db.query(query, params);

  if (!rows.length) {
    // If no template found with sub_category, try without sub_category (backward compatible)
    if (sub_category && sub_category !== "") {
      console.log(`No template found for category=${category}, sub_category=${sub_category}, falling back to category-only search`);
      return getTemplate(category, channel, null);
    }
    throw new Error(`Template not found for category=${category}, channel=${channel}`);
  }

  return rows[0];
};

// dynamic variable replace
const replaceVariables = (content, data) => {
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{${key}}`, "g");
    content = content.replace(regex, data[key] !== undefined && data[key] !== null ? data[key] : '');
  });
  return content;
};

module.exports = { getTemplate, replaceVariables };