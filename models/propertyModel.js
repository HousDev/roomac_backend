
// model/propertyModel.js
const db = require("../config/db");

function parseRow(row) {
  if (!row) return row;

  console.log("🔍 Raw DB row for parsing:", { 
    id: row.id, 
    name: row.name, 
    rawTags: row.tags,
    rawTagsType: typeof row.tags,
    rawTagsLength: row.tags?.length
  });

  // Parse tags FIRST
  try {
    if (row.tags) {
      console.log(`🔍 Parsing tags for property ${row.id}:`, row.tags);
      
      if (typeof row.tags === 'string') {
        // Try to parse as JSON
        if (row.tags.trim().startsWith('[') || row.tags.trim().startsWith('{')) {
          try {
            row.tags = JSON.parse(row.tags);
            console.log(`✅ JSON parsed tags:`, row.tags);
          } catch (e) {
            console.error(`❌ JSON parse error:`, e);
            // Fallback to comma-separated
            if (row.tags.includes(',')) {
              row.tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            } else if (row.tags.trim() !== '') {
              row.tags = [row.tags.trim()];
            } else {
              row.tags = [];
            }
          }
        } 
        // Comma-separated string
        else if (row.tags.includes(',')) {
          row.tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          console.log(`✅ Comma-separated parsed tags:`, row.tags);
        }
        // Single tag string
        else if (row.tags.trim() !== '') {
          row.tags = [row.tags.trim()];
          console.log(`✅ Single tag parsed:`, row.tags);
        }
        // Empty string
        else {
          row.tags = [];
          console.log(`✅ Empty tags array`);
        }
      } 
      // If already array (from previous parse)
      else if (Array.isArray(row.tags)) {
        console.log(`✅ Already array tags:`, row.tags);
        // Keep as is
      }
      // If object (might be from MySQL JSON)
      else if (row.tags && typeof row.tags === 'object') {
        try {
          // Convert object to array
          row.tags = Object.values(row.tags).filter(v => typeof v === 'string' && v.trim() !== '');
          console.log(`✅ Object converted to array tags:`, row.tags);
        } catch (e) {
          console.error(`❌ Object conversion error:`, e);
          row.tags = [];
        }
      }
      else {
        row.tags = [];
        console.log(`✅ Default empty array`);
      }
    } else {
      row.tags = [];
      console.log(`✅ No tags field, set to empty array`);
    }
  } catch (error) {
    console.error(`❌ Error parsing tags for property ${row.id}:`, error);
    row.tags = [];
  }

  // Parse other JSON fields
  try {
    row.amenities = row.amenities ? JSON.parse(row.amenities) : [];
  } catch {
    row.amenities = [];
  }

  try {
    row.services = row.services ? JSON.parse(row.services) : [];
  } catch {
    row.services = [];
  }

  try {
    row.photo_urls = row.photo_urls ? JSON.parse(row.photo_urls) : [];
  } catch {
    row.photo_urls = [];
  }

  try {
    row.terms_json = row.terms_json ? JSON.parse(row.terms_json) : [];
  } catch {
    row.terms_json = [];
  }

  // Convert boolean
  row.is_active = !!row.is_active;
  
  // Convert numeric fields
  row.starting_price = row.starting_price ? Number(row.starting_price) : 0;
  row.security_deposit = row.security_deposit ? Number(row.security_deposit) : 0;
  row.lockin_period_months = row.lockin_period_months ? Number(row.lockin_period_months) : 0;
  row.lockin_penalty_amount = row.lockin_penalty_amount ? Number(row.lockin_penalty_amount) : 0;
  row.notice_period_days = row.notice_period_days ? Number(row.notice_period_days) : 0;
  row.notice_penalty_amount = row.notice_penalty_amount ? Number(row.notice_penalty_amount) : 0;

  console.log(`✅ Final parsed row for ${row.id}:`, { 
    id: row.id, 
    name: row.name, 
    tags: row.tags,
    tagsLength: row.tags.length 
  });

  return row;
}

const PropertyModel = {
  // LIST
// PropertyModel.findAll function में
async findAll({ page = 1, pageSize = 20, search = "", area, is_active, state }) {
  try {
    const offset = (page - 1) * pageSize;
    const where = [];
    const params = [];

    if (search) {
      where.push(
        "(name LIKE ? OR area LIKE ? OR property_manager_name LIKE ? OR address LIKE ? OR state LIKE ? OR city_id LIKE ?)"
      );
      const q = `%${search}%`;
      params.push(q, q, q, q, q, q);
    }

    if (area) {
      where.push("area = ?");
      params.push(area);
    }

    if (state) {
      where.push("state = ?");
      params.push(state);
    }

    if (typeof is_active !== "undefined" && is_active !== null) {
      where.push("is_active = ?");
      params.push(is_active ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // ✅ ADD DEBUG: Log the SQL query
    console.log("🔍 SQL Query for properties:", 
      `SELECT * FROM properties ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    
    // const [rows] = await db.query(
    //   `SELECT * FROM properties ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    //   [...params, pageSize, offset]
    // );
    const [rows] = await db.query(
  `SELECT id, name, slug, city_id, state, area, address, total_rooms, total_beds, 
   occupied_beds, starting_price, security_deposit, description, 
   property_manager_name, property_manager_phone, property_manager_email,
   property_manager_role, staff_id, amenities, services, photo_urls, 
   property_rules, is_active, rating, created_at, updated_at,
   lockin_period_months, lockin_penalty_amount, lockin_penalty_type,
   notice_period_days, notice_penalty_amount, notice_penalty_type,
   additional_terms, tags
   FROM properties ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  [...params, pageSize, offset]
);


    // ✅ ADD DEBUG: Show raw database data
    console.log("📊 Raw database rows with tags:", 
      rows.map(r => ({ 
        id: r.id, 
        name: r.name, 
        rawTags: r.tags,
        rawTagsType: typeof r.tags,
        rawTagsValue: r.tags 
      }))
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM properties ${whereSql}`,
      params
    );

    const total = countRows[0]?.total || 0;
    
    const parsedRows = rows.map(parseRow);
    
    // ✅ ADD DEBUG: Show parsed data
    console.log("📊 Parsed rows with tags:", 
      parsedRows.map(r => ({ 
        id: r.id, 
        name: r.name, 
        tags: r.tags,
        tagsType: typeof r.tags,
        tagsLength: r.tags.length 
      }))
    );
    
    return { rows: parsedRows, total };
  } catch (err) {
    console.error("PropertyModel.findAll error:", err);
    throw err;
  }
},

  // GET BY ID
async findById(id) {
  try {
    console.log(`🔍 PropertyModel.findById looking for ID: ${id} (type: ${typeof id})`);
    
    // Convert id to number if it's a string
    const propertyId = parseInt(id);
    
//     const [rows] = await db.query(
//   `SELECT p.*, s.photo_url AS manager_photo_url, s.salutation AS manager_salutation
//    FROM properties p
//    LEFT JOIN staff s ON p.staff_id = s.id
//    WHERE p.id = ? LIMIT 1`,
//   [propertyId]
// );

const [rows] = await db.query(
  `SELECT p.*, 
    s.photo_url AS manager_photo_url,
    s.salutation AS manager_salutation,
    s.name AS staff_name,
    s.phone AS staff_phone,
    s.email AS staff_email,
    s.role AS staff_role
   FROM properties p
   LEFT JOIN staff s ON p.staff_id = s.id
   WHERE p.id = ? LIMIT 1`,
  [propertyId]
);
    
    console.log(`🔍 Found ${rows.length} properties`);
    
    return rows[0] ? parseRow(rows[0]) : null;
  } catch (err) {
    console.error("PropertyModel.findById error:", err);
    throw err;
  }
},

  // CREATE
  async create(property) {
    try {
      const {
        name,
        slug,
        city_id,
        state, // ADDED STATE FIELD
        area,
        address,
        total_rooms,
        total_beds,
        floor,
        starting_price,
        security_deposit,
        description,
        property_manager_name,
        property_manager_phone,
        property_manager_email,
  property_manager_role,
  staff_id,
        amenities,
        services,
        photo_urls,
        property_rules,
        is_active,
        rating,
        lockin_period_months,
        lockin_penalty_amount,
        lockin_penalty_type,
        notice_period_days,
        notice_penalty_amount,
        notice_penalty_type,
        terms_conditions,
        terms_json,
        additional_terms,
         tags
      } = property;

      const [result] = await db.query(
        `INSERT INTO properties
        (name, slug, city_id, state, area, address, total_rooms, total_beds, floor,
         starting_price, security_deposit, description, property_manager_name,
          property_manager_phone, property_manager_email, property_manager_role, staff_id,
 amenities, services, photo_urls, property_rules,
         is_active, rating, lockin_period_months, lockin_penalty_amount, lockin_penalty_type,
         notice_period_days, notice_penalty_amount, notice_penalty_type,
         terms_conditions, terms_json, additional_terms, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, NOW())`,
        [
          name,
          slug,
          city_id || null,
          state || null, // ADDED STATE FIELD
          area || null,
          address || null,
          total_rooms || 0,
          total_beds || 0,
          floor || 0,
          starting_price || 0,
          security_deposit || 0,
          description || null,
          property_manager_name || null,
          property_manager_phone || null,
          property_manager_name || null,
property_manager_phone || null,
property_manager_email || null,      // ← ADD
property_manager_role || null,       // ← ADD  
staff_id ? parseInt(staff_id) : null, // ← ADD
JSON.stringify(amenities || []),
          JSON.stringify(services || []),
          JSON.stringify(photo_urls || []),
          property_rules || null,
          is_active ? 1 : 0,
          rating || null,
          lockin_period_months || 0,
          lockin_penalty_amount || 0,
          lockin_penalty_type || 'fixed',
          notice_period_days || 0,
          notice_penalty_amount || 0,
          notice_penalty_type || 'fixed',
          terms_conditions || null,
          terms_json ? JSON.stringify(terms_json) : null,
          additional_terms || null,
          JSON.stringify(tags || []),
        ]
      );

      return result.insertId;
    } catch (err) {
      console.error("PropertyModel.create error:", err);
      throw err;
    }
  },

  // UPDATE
  async update(id, property) {
    try {
      const fields = [];
      const params = [];

      const add = (field, value, transform = (v) => v) => {
        if (typeof value !== "undefined") {
          fields.push(`${field} = ?`);
          params.push(transform(value));
        }
      };

      // Basic fields
      add("name", property.name);
      add("slug", property.slug);
      add("city_id", property.city_id);
      add("state", property.state); // ADDED STATE FIELD
      add("area", property.area);
      add("address", property.address);
      add("total_rooms", property.total_rooms);
      add("total_beds", property.total_beds);
      add("floor", property.floor);
      add("starting_price", property.starting_price);
      add("security_deposit", property.security_deposit);
      add("description", property.description);
      add("property_manager_name", property.property_manager_name);
      add("property_manager_phone", property.property_manager_phone);
      add("property_manager_email", property.property_manager_email);
add("property_manager_role", property.property_manager_role);
add("staff_id", property.staff_id, (v) => v ? parseInt(v) : null);
      add("amenities", property.amenities, (v) => JSON.stringify(v || []));
      add("services", property.services, (v) => JSON.stringify(v || []));
      add("photo_urls", property.photo_urls, (v) => JSON.stringify(v || []));
      add("property_rules", property.property_rules);
      add("is_active", property.is_active, (v) =>
        typeof v !== "undefined" ? (v ? 1 : 0) : undefined
      );
      add("rating", property.rating);
      
      // Lock-in period fields
      add("lockin_period_months", property.lockin_period_months);
      add("lockin_penalty_amount", property.lockin_penalty_amount);
      add("lockin_penalty_type", property.lockin_penalty_type);
      
      // Notice period fields
      add("notice_period_days", property.notice_period_days);
      add("notice_penalty_amount", property.notice_penalty_amount);
      add("notice_penalty_type", property.notice_penalty_type);
      
      // Terms and conditions
      add("terms_conditions", property.terms_conditions);
      add("terms_json", property.terms_json, (v) => v ? JSON.stringify(v) : null);
      add("additional_terms", property.additional_terms);
      add("tags", property.tags, (v) => JSON.stringify(v || []));

      if (!fields.length) return false;

      params.push(new Date(), id);

      await db.query(
        `UPDATE properties SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`,
        params
      );

      return true;
    } catch (err) {
      console.error("PropertyModel.update error:", err);
      throw err;
    }
  },

  // DELETE
  async delete(id) {
    try {
      const [result] = await db.query("DELETE FROM properties WHERE id = ?", [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error("PropertyModel.delete error:", err);
      throw err;
    }
  },

  // BULK DELETE
  async bulkDelete(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return false;
      
      const placeholders = ids.map(() => '?').join(',');
      
      const [result] = await db.query(
        `DELETE FROM properties WHERE id IN (${placeholders})`,
        ids
      );
      
      return result.affectedRows;
    } catch (err) {
      console.error("PropertyModel.bulkDelete error:", err);
      throw err;
    }
  },

  // BULK STATUS UPDATE
  async bulkUpdateStatus(ids, is_active) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return false;
      
      const placeholders = ids.map(() => '?').join(',');
      
      const [result] = await db.query(
        `UPDATE properties SET is_active = ?, updated_at = ? WHERE id IN (${placeholders})`,
        [is_active ? 1 : 0, new Date(), ...ids]
      );

      return result.affectedRows;
    } catch (err) {
      console.error("PropertyModel.bulkUpdateStatus error:", err);
      throw err;
    }
  },
  // Add a bulk update tags method
// propertyModel.js में bulkUpdateTags function को replace करें

async bulkUpdateTags(ids, tags, operation = 'add') {
  try {
    if (!Array.isArray(ids) || ids.length === 0) return false;
    
    const placeholders = ids.map(() => '?').join(',');
    
    // Get current tags for each property
    const [properties] = await db.query(
      `SELECT id, name, tags FROM properties WHERE id IN (${placeholders})`,
      ids
    );

    let updatedCount = 0;
    
    for (const property of properties) {
      let currentTags = [];
      try {
        console.log(`🔍 Processing property ${property.id}:`, {
          rawTags: property.tags,
          type: typeof property.tags
        });
        
        if (property.tags) {
          // Handle different formats
          if (typeof property.tags === 'string') {
            // Try to parse JSON string
            if (property.tags.trim().startsWith('[') || property.tags.trim().startsWith('{')) {
              try {
                currentTags = JSON.parse(property.tags);
              } catch (e) {
                console.error(`❌ JSON parse error for property ${property.id}:`, e);
                // Try comma-separated
                if (property.tags.includes(',')) {
                  currentTags = property.tags.split(',').map(t => t.trim()).filter(t => t);
                } else if (property.tags.trim() !== '') {
                  currentTags = [property.tags.trim()];
                }
              }
            } 
            // Handle comma-separated string
            else if (property.tags.includes(',')) {
              currentTags = property.tags.split(',').map(t => t.trim()).filter(t => t);
            }
            // Handle single tag string
            else if (property.tags.trim() !== '') {
              currentTags = [property.tags.trim()];
            }
          } 
          // If already an array (from parseRow function)
          else if (Array.isArray(property.tags)) {
            currentTags = property.tags;
          }
          // If it's an object (might be from parseRow)
          else if (property.tags && typeof property.tags === 'object') {
            // Try to convert object to array
            try {
              currentTags = Object.values(property.tags).filter(v => typeof v === 'string');
            } catch (e) {
              console.error(`❌ Object to array conversion error:`, e);
            }
          }
        }
        
        // Ensure it's an array
        if (!Array.isArray(currentTags)) {
          console.warn(`⚠️ Tags for property ${property.id} is not an array:`, currentTags);
          currentTags = [];
        }
        
        console.log(`✅ Property ${property.id} parsed current tags:`, currentTags);
        
      } catch (error) {
        console.error(`❌ Error parsing tags for property ${property.id}:`, error);
        currentTags = [];
      }

      console.log(`🏷️ Operation: ${operation}, Tags to process:`, tags);

      let newTags;
      switch(operation) {
        case 'add':
          // Add tags if not already present
          const tagsToAdd = tags.filter(tag => 
            !currentTags.some(ct => ct.toLowerCase() === tag.toLowerCase())
          );
          newTags = [...currentTags, ...tagsToAdd];
          console.log(`✅ Adding tags. Before:`, currentTags, `After:`, newTags);
          break;
          
        case 'remove':
          // Only remove specified tags, keep others
          const tagsToRemoveLower = tags.map(t => t.toLowerCase().trim());
          newTags = currentTags.filter(tag => 
            !tagsToRemoveLower.includes(tag.toLowerCase().trim())
          );
          console.log(`✅ Removing tags. Before:`, currentTags, `After:`, newTags);
          break;
          
        case 'set':
          // Set tags (replace all)
          newTags = [...tags];
          console.log(`✅ Setting tags. Before:`, currentTags, `After:`, newTags);
          break;
          
        default:
          newTags = currentTags;
      }

      // Remove duplicates and empty values
      newTags = [...new Set(newTags.filter(tag => tag && tag.trim() !== ''))];
      
      console.log(`🏷️ Final tags for property ${property.id}:`, newTags);

      await db.query(
        `UPDATE properties SET tags = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(newTags), new Date(), property.id]
      );
      
      updatedCount++;
    }

    return updatedCount;
  } catch (err) {
    console.error("PropertyModel.bulkUpdateTags error:", err);
    throw err;
  }
}
};


exports.getBulkTagsInfo = async (req, res) => {
  try {
    const { ids } = req.query;

    console.log("🔍 getBulkTagsInfo called with ids:", ids);

    if (!ids) {
      return res.status(400).json({
        success: false,
        message: "Property IDs are required",
      });
    }

    const idArray = ids
      .split(",")
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));

    if (idArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid property IDs are required",
      });
    }

    const properties = [];
    for (const id of idArray) {
      const property = await PropertyModel.findById(id);
      if (property) properties.push(property);
    }

    const allTags = new Set();

    properties.forEach(property => {
      if (Array.isArray(property.tags)) {
        property.tags.forEach(tag => {
          if (typeof tag === "string" && tag.trim()) {
            allTags.add(tag.trim());
          }
        });
      }
    });

    const uniqueTags = Array.from(allTags);

    return res.json({
      success: true,
      tags: uniqueTags,
      propertyCount: properties.length,
      tagCount: uniqueTags.length,
    });
  } catch (error) {
    console.error("getBulkTagsInfo error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tags information",
    });
  }
}

// Export helper function separately
const getPropertyWithTerms = async (propertyId) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, 
        COALESCE(p.lockin_period_months, 0) as lockin_period_months,
        COALESCE(p.lockin_penalty_amount, 0) as lockin_penalty_amount,
        COALESCE(p.lockin_penalty_type, 'fixed') as lockin_penalty_type,
        COALESCE(p.notice_period_days, 0) as notice_period_days,
        COALESCE(p.notice_penalty_amount, 0) as notice_penalty_amount,
        COALESCE(p.notice_penalty_type, 'fixed') as notice_penalty_type
       FROM properties p 
       WHERE p.id = ?`,
      [propertyId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching property with terms:", error);
    return null;
  }
};

module.exports = PropertyModel;
module.exports.getPropertyWithTerms = getPropertyWithTerms;


