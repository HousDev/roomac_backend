
// model/propertyModel.js
const db = require("../config/db");

function parseRow(row) {
  if (!row) return row;

  

  // Parse tags FIRST
  try {
    if (row.tags) {
      
      if (typeof row.tags === 'string') {
        // Try to parse as JSON
        if (row.tags.trim().startsWith('[') || row.tags.trim().startsWith('{')) {
          try {
            row.tags = JSON.parse(row.tags);
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

        }
        // Single tag string
        else if (row.tags.trim() !== '') {
          row.tags = [row.tags.trim()];
        }
        // Empty string
        else {
          row.tags = [];
        }
      } 
      // If already array (from previous parse)
      else if (Array.isArray(row.tags)) {
        // console.log(`✅ Already array tags:`, row.tags);
        // Keep as is
      }
      // If object (might be from MySQL JSON)
      else if (row.tags && typeof row.tags === 'object') {
        try {
          // Convert object to array
          row.tags = Object.values(row.tags).filter(v => typeof v === 'string' && v.trim() !== '');
        } catch (e) {
          console.error(`❌ Object conversion error:`, e);
          row.tags = [];
        }
      }
      else {
        row.tags = [];
      }
    } else {
      row.tags = [];
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
        "(p.name LIKE ? OR p.area LIKE ? OR p.property_manager_name LIKE ? OR p.address LIKE ? OR p.state LIKE ? OR p.city_id LIKE ?)"
      );
      const q = `%${search}%`;
      params.push(q, q, q, q, q, q);
    }

    if (area) {
      where.push("p.area = ?");
      params.push(area);
    }

    if (state) {
      where.push("p.state = ?");
      params.push(state);
    }

    if (typeof is_active !== "undefined" && is_active !== null) {
      where.push("p.is_active = ?");
      params.push(is_active ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Get master item IDs for each category
    const [masterItems] = await db.query(
      `SELECT id, name FROM master_items WHERE name IN ('Tags', 'Property Rules', 'Additional Terms') AND tab_name = 'Properties'`
    );
    
    const masterItemMap = {};
    masterItems.forEach(item => {
      masterItemMap[item.name] = item.id;
    });

    // Main query to get properties
    const [rows] = await db.query(
      `SELECT 
        p.id, p.name, p.slug, p.city_id, p.state, p.area, p.address,
         p.map_embed_url,
         p.map_direction_url,
        p.total_rooms, p.total_beds, p.floor, p.starting_price, 
        p.security_deposit, p.description, p.property_manager_name, 
        p.property_manager_phone, p.property_manager_email,
        p.property_manager_role, p.staff_id, p.amenities, p.services, 
        p.photo_urls, p.property_rules, p.is_active, p.rating, 
        p.created_at, p.updated_at, p.lockin_period_months, 
        p.lockin_penalty_amount, p.lockin_penalty_type,
        p.notice_period_days, p.notice_penalty_amount, p.notice_penalty_type,
        p.additional_terms, p.tags, p.terms_conditions , mi.name as role_name
      FROM properties p
      left join  master_item_values as mi on p.property_manager_role = mi.id
         ${whereSql} 
      ORDER BY p.created_at DESC 
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    // Get count for pagination
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM properties p ${whereSql}`,
      params
    );

    // Fetch all master values for mapping
    const [allMasterValues] = await db.query(
      `SELECT mv.id, mv.name, mv.master_item_id, mi.name as category_name
       FROM master_item_values mv
       JOIN master_items mi ON mv.master_item_id = mi.id
       WHERE mi.id IN (?, ?, ?)`,
      [masterItemMap['Tags'] || 0, masterItemMap['Property Rules'] || 0, masterItemMap['Additional Terms'] || 0]
    );

    // Create lookup maps
    const valueMap = {
      tags: {},
      propertyRules: {},
      additionalTerms: {}
    };

    allMasterValues.forEach(value => {
      if (value.category_name === 'Tags') {
        valueMap.tags[value.id] = value.name;
      } else if (value.category_name === 'Property Rules') {
        valueMap.propertyRules[value.id] = value.name;
      } else if (value.category_name === 'Additional Terms') {
        valueMap.additionalTerms[value.id] = value.name;
      }
    });

    // Helper function to parse JSON and keep original IDs, add mapped values
    const parseField = (field) => {
      if (!field) return { ids: [], values: [] };
      
      try {
        // If it's already an array
        if (Array.isArray(field)) {
          return {
            ids: field,
            values: field.map(id => {
              const numId = parseInt(id);
              return valueMap.propertyRules[numId] || 
                     valueMap.tags[numId] || 
                     valueMap.additionalTerms[numId] || 
                     id;
            })
          };
        }
        
        // Try to parse as JSON
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) {
          return {
            ids: parsed,
            values: parsed.map(id => {
              const numId = parseInt(id);
              return valueMap.propertyRules[numId] || 
                     valueMap.tags[numId] || 
                     valueMap.additionalTerms[numId] || 
                     id;
            })
          };
        }
        // Single value
        const numId = parseInt(parsed);
        return {
          ids: [parsed],
          values: [valueMap.propertyRules[numId] || 
                   valueMap.tags[numId] || 
                   valueMap.additionalTerms[numId] || 
                   parsed]
        };
      } catch (e) {
        // If parsing fails and it's a string, check if it's a single ID
        if (typeof field === 'string' && field.trim()) {
          const numId = parseInt(field);
          if (!isNaN(numId)) {
            return {
              ids: [field],
              values: [valueMap.propertyRules[numId] || 
                       valueMap.tags[numId] || 
                       valueMap.additionalTerms[numId] || 
                       field]
            };
          }
          // If it's a plain text string, return as is
          return {
            ids: [],
            values: [field]
          };
        }
        return { ids: [], values: [] };
      }
    };

    // Parse and map each property
    const parsedRows = rows.map(row => {
      // Parse tags - keep original IDs, add mapped values
      let tagsResult = { ids: [], values: [] };
      if (row.tags) {
        try {
          if (Array.isArray(row.tags)) {
            tagsResult = {
              ids: row.tags,
              values: row.tags.map(id => {
                const numId = parseInt(id);
                return valueMap.tags[numId] || id;
              })
            };
          } else {
            const parsed = JSON.parse(row.tags);
            if (Array.isArray(parsed)) {
              tagsResult = {
                ids: parsed,
                values: parsed.map(id => {
                  const numId = parseInt(id);
                  return valueMap.tags[numId] || id;
                })
              };
            } else {
              const numId = parseInt(parsed);
              tagsResult = {
                ids: [parsed],
                values: [valueMap.tags[numId] || parsed]
              };
            }
          }
        } catch (e) {
          tagsResult = { ids: [], values: [row.tags] };
        }
      }

      // Parse property_rules - keep original IDs, add mapped values
      let propertyRulesResult = { ids: [], values: [] };
      if (row.property_rules) {
        try {
          if (Array.isArray(row.property_rules)) {
            propertyRulesResult = {
              ids: row.property_rules,
              values: row.property_rules.map(id => {
                const numId = parseInt(id);
                return valueMap.propertyRules[numId] || id;
              })
            };
          } else {
            const parsed = JSON.parse(row.property_rules);
            if (Array.isArray(parsed)) {
              propertyRulesResult = {
                ids: parsed,
                values: parsed.map(id => {
                  const numId = parseInt(id);
                  return valueMap.propertyRules[numId] || id;
                })
              };
            } else {
              const numId = parseInt(parsed);
              propertyRulesResult = {
                ids: [parsed],
                values: [valueMap.propertyRules[numId] || parsed]
              };
            }
          }
        } catch (e) {
          propertyRulesResult = { ids: [], values: [row.property_rules] };
        }
      }

      // Parse additional_terms - keep original IDs, add mapped values
      let additionalTermsResult = { ids: [], values: [] };
      if (row.additional_terms) {
        try {
          if (Array.isArray(row.additional_terms)) {
            additionalTermsResult = {
              ids: row.additional_terms,
              values: row.additional_terms.map(id => {
                const numId = parseInt(id);
                return valueMap.additionalTerms[numId] || id;
              })
            };
          } else {
            const parsed = JSON.parse(row.additional_terms);
            if (Array.isArray(parsed)) {
              additionalTermsResult = {
                ids: parsed,
                values: parsed.map(id => {
                  const numId = parseInt(id);
                  return valueMap.additionalTerms[numId] || id;
                })
              };
            } else {
              const numId = parseInt(parsed);
              additionalTermsResult = {
                ids: [parsed],
                values: [valueMap.additionalTerms[numId] || parsed]
              };
            }
          }
        } catch (e) {
          additionalTermsResult = { ids: [], values: [row.additional_terms] };
        }
      }

      // Parse amenities, services, photo_urls (keep as is)
      let amenities = [];
      try {
        amenities = row.amenities ? JSON.parse(row.amenities) : [];
      } catch (e) {
        amenities = row.amenities || [];
      }

      let services = [];
      try {
        services = row.services ? JSON.parse(row.services) : [];
      } catch (e) {
        services = row.services || [];
      }

      let photoUrls = [];
      try {
        photoUrls = row.photo_urls ? JSON.parse(row.photo_urls) : [];
      } catch (e) {
        photoUrls = row.photo_urls || [];
      }

      return {
        ...row,
        // Original IDs (keep as is)
        tags: row.tags,
        property_rules: row.property_rules,
        additional_terms: row.additional_terms,
        
        // Mapped values (add these)
        tags_mapped: tagsResult.values,
        property_rules_mapped: propertyRulesResult.values,
        additional_terms_mapped: additionalTermsResult.values,
        
        // Parsed arrays
        amenities,
        services,
        photo_urls: photoUrls,
        
        // Ensure numeric fields are numbers
        total_rooms: Number(row.total_rooms) || 0,
        total_beds: Number(row.total_beds) || 0,
        starting_price: parseFloat(row.starting_price) || 0,
        security_deposit: parseFloat(row.security_deposit) || 0,
        lockin_period_months: parseInt(row.lockin_period_months) || 0,
        lockin_penalty_amount: parseFloat(row.lockin_penalty_amount) || 0,
        notice_period_days: parseInt(row.notice_period_days) || 0,
        notice_penalty_amount: parseFloat(row.notice_penalty_amount) || 0,
        is_active: Boolean(row.is_active),
        terms_conditions: row.terms_conditions,
        role_name: row.role_name
      };
    });

    const total = countRows[0]?.total || 0;
    
   

    return { rows: parsedRows, total };
    
  } catch (err) {
    console.error("PropertyModel.findAll error:", err);
    throw err;
  }
},

  // GET BY ID
async findById(id) {
  try {
    
    // Convert id to number if it's a string
    const propertyId = parseInt(id);
    
    // Get master item IDs for each category
    const [masterItems] = await db.query(
      `SELECT id, name FROM master_items WHERE name IN ('Tags', 'Property Rules', 'Additional Terms') AND tab_name = 'Properties'`
    );
    
    const masterItemMap = {};
    masterItems.forEach(item => {
      masterItemMap[item.name] = item.id;
    });

    // Main query to get property with staff details
    const [rows] = await db.query(
      `SELECT p.*, 
        s.photo_url AS manager_photo_url,
        s.salutation AS manager_salutation,
        s.name AS staff_name,
        s.phone AS staff_phone,
         s.phone_country_code AS staff_phone_country_code,
        s.email AS staff_email,
        s.role AS staff_role,
        mi.name as role_name
        FROM properties p
        left join  master_item_values as mi on p.property_manager_role = mi.id
      LEFT JOIN staff s ON p.staff_id = s.id
      WHERE p.id = ? LIMIT 1`,
      [propertyId]
    );
    
    
    if (!rows[0]) return null;

    // Fetch all master values for mapping
    const [allMasterValues] = await db.query(
      `SELECT mv.id, mv.name, mv.master_item_id, mi.name as category_name
       FROM master_item_values mv
       JOIN master_items mi ON mv.master_item_id = mi.id
       WHERE mi.id IN (?, ?, ?)`,
      [masterItemMap['Tags'] || 0, masterItemMap['Property Rules'] || 0, masterItemMap['Additional Terms'] || 0]
    );

    // Create lookup maps
    const valueMap = {
      tags: {},
      propertyRules: {},
      additionalTerms: {}
    };

    allMasterValues.forEach(value => {
      if (value.category_name === 'Tags') {
        valueMap.tags[value.id] = value.name;
      } else if (value.category_name === 'Property Rules') {
        valueMap.propertyRules[value.id] = value.name;
      } else if (value.category_name === 'Additional Terms') {
        valueMap.additionalTerms[value.id] = value.name;
      }
    });

    // Helper function to parse JSON and map IDs to names
    const parseAndMapField = (field, map) => {
      if (!field) return { ids: [], values: [] };
      
      try {
        // If it's already an array
        if (Array.isArray(field)) {
          return {
            ids: field,
            values: field.map(id => {
              const numId = parseInt(id);
              return map[numId] || id;
            })
          };
        }
        
        // Try to parse as JSON
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) {
          return {
            ids: parsed,
            values: parsed.map(id => {
              const numId = parseInt(id);
              return map[numId] || id;
            })
          };
        }
        // Single value
        const numId = parseInt(parsed);
        return {
          ids: [parsed],
          values: [map[numId] || parsed]
        };
      } catch (e) {
        // If parsing fails and it's a string, check if it's a single ID
        if (typeof field === 'string' && field.trim()) {
          const numId = parseInt(field);
          if (!isNaN(numId)) {
            return {
              ids: [field],
              values: [map[numId] || field]
            };
          }
          // If it's a plain text string, return as is
          return {
            ids: [],
            values: [field]
          };
        }
        return { ids: [], values: [] };
      }
    };

    const row = rows[0];

    // Parse and map tags
    const tagsResult = parseAndMapField(row.tags, valueMap.tags);
    
    // Parse and map property_rules
    const propertyRulesResult = parseAndMapField(row.property_rules, valueMap.propertyRules);
    
    // Parse and map additional_terms
    const additionalTermsResult = parseAndMapField(row.additional_terms, valueMap.additionalTerms);

    // Parse amenities, services, photo_urls
    let amenities = [];
    try {
      amenities = row.amenities ? JSON.parse(row.amenities) : [];
    } catch (e) {
      amenities = row.amenities || [];
    }

    let services = [];
    try {
      services = row.services ? JSON.parse(row.services) : [];
    } catch (e) {
      services = row.services || [];
    }

    let photoUrls = [];
    try {
      photoUrls = row.photo_urls ? JSON.parse(row.photo_urls) : [];
    } catch (e) {
      photoUrls = row.photo_urls || [];
    }

    // Build the response object with both original IDs and mapped values
    const parsedRow = {
      ...row,
      // Original IDs (keep as is)
      tags: row.tags,
      property_rules: row.property_rules,
      additional_terms: row.additional_terms,
      
      // Mapped values (add these)
      tags_mapped: tagsResult.values,
      property_rules_mapped: propertyRulesResult.values,
      additional_terms_mapped: additionalTermsResult.values,
            staff_phone_country_code: row.staff_phone_country_code || '+91', // ADD THIS

      // Parsed arrays
      amenities,
      services,
      photo_urls: photoUrls,
      
      // Ensure numeric fields are numbers
      total_rooms: Number(row.total_rooms) || 0,
      total_beds: Number(row.total_beds) || 0,
      starting_price: parseFloat(row.starting_price) || 0,
      security_deposit: parseFloat(row.security_deposit) || 0,
      lockin_period_months: parseInt(row.lockin_period_months) || 0,
      lockin_penalty_amount: parseFloat(row.lockin_penalty_amount) || 0,
      notice_period_days: parseInt(row.notice_period_days) || 0,
      notice_penalty_amount: parseFloat(row.notice_penalty_amount) || 0,
      is_active: Boolean(row.is_active),
      role_name:row.role_name
    };

    

    return parsedRow;
    
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
      state,
      area,
      address,
      map_embed_url,
      map_direction_url,
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
      (name, slug, city_id, state, area, address,
       map_embed_url, map_direction_url,
       total_rooms, total_beds, floor,
       starting_price, security_deposit, description,
       property_manager_name, property_manager_phone,
       property_manager_email, property_manager_role, staff_id,
       amenities, services, photo_urls, property_rules,
       is_active, rating,
       lockin_period_months, lockin_penalty_amount, lockin_penalty_type,
       notice_period_days, notice_penalty_amount, notice_penalty_type,
       terms_conditions, terms_json,
       additional_terms, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name,
        slug,
        city_id || null,
        state || null,
        area || null,
        address || null,

        map_embed_url || null,
        map_direction_url || null,

        total_rooms || 0,
        total_beds || 0,
        floor || 0,
        starting_price || 0,
        security_deposit || 0,
        description || null,
        property_manager_name || null,
        property_manager_phone || null,
        property_manager_email || null,
        property_manager_role || null,
        staff_id ? parseInt(staff_id) : null,
        JSON.stringify(amenities || []),
        JSON.stringify(services || []),
        JSON.stringify(photo_urls || []),
        JSON.stringify(property_rules || []),
        is_active ? 1 : 0,
        rating || null,
        lockin_period_months || 0,
        lockin_penalty_amount || 0,
        lockin_penalty_type || "fixed",
        notice_period_days || 0,
        notice_penalty_amount || 0,
        notice_penalty_type || "fixed",
        terms_conditions || null,
        terms_json ? JSON.stringify(terms_json) : null,
        JSON.stringify(additional_terms || []),
        JSON.stringify(tags || [])
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
      add("map_embed_url", property.map_embed_url);
      add("map_direction_url", property.map_direction_url);
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
      add("property_rules", property.property_rules, (v) => JSON.stringify(v || []));
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
      add("additional_terms", property.additional_terms, (v) => JSON.stringify(v || []));
      console.log("test prpoperty", property.tag);
      if (property.tags) {
        add("tags", property.tags, (v) => JSON.stringify(v || []));
      } else {
        add("tags", JSON.stringify([]));
      }

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
        
        
      } catch (error) {
        console.error(`❌ Error parsing tags for property ${property.id}:`, error);
        currentTags = [];
      }


      let newTags;
      switch(operation) {
        case 'add':
          // Add tags if not already present
          const tagsToAdd = tags.filter(tag => 
            !currentTags.some(ct => ct.toLowerCase() === tag.toLowerCase())
          );
          newTags = [...currentTags, ...tagsToAdd];
          break;
          
        case 'remove':
          // Only remove specified tags, keep others
          const tagsToRemoveLower = tags.map(t => t.toLowerCase().trim());
          newTags = currentTags.filter(tag => 
            !tagsToRemoveLower.includes(tag.toLowerCase().trim())
          );
          break;
          
        case 'set':
          // Set tags (replace all)
          newTags = [...tags];
          break;
          
        default:
          newTags = currentTags;
      }

      // Remove duplicates and empty values
      newTags = [...new Set(newTags.filter(tag => tag && tag.trim() !== ''))];

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


