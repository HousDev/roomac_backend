const pool = require("../config/db");

// function parseTenant(row) {
//   if (!row) return row;
//   row.is_active = !!row.is_active;
//   row.portal_access_enabled = !!row.portal_access_enabled;

//   // Parse date of birth
//   if (row.date_of_birth) {
//     const date = new Date(row.date_of_birth);
//     row.date_of_birth = date.toISOString().split('T')[0];
//   }
//   return row;
// }

// In tenantModel.js, update the parseTenant function:

function parseTenant(row) {
  if (!row) return row;
  
  // Convert boolean values
  row.is_active = !!row.is_active;
  row.portal_access_enabled = !!row.portal_access_enabled;
  row.bed_is_available = row.bed_is_available !== null ? !!row.bed_is_available : null;

  // Parse date of birth
  if (row.date_of_birth) {
    const date = new Date(row.date_of_birth);
    row.date_of_birth = date.toISOString().split('T')[0];
  }

  if (row.check_in_date) {
    const date = new Date(row.check_in_date);
    row.check_in_date = date.toISOString().split('T')[0];
  }
  
  // Parse additional_documents JSON
  if (row.additional_documents) {
    try {
      if (typeof row.additional_documents === 'string') {
        row.additional_documents = JSON.parse(row.additional_documents);
      }
      if (!Array.isArray(row.additional_documents)) {
        row.additional_documents = [];
      }
    } catch (e) {
      console.error('Error parsing additional_documents:', e);
      row.additional_documents = [];
    }
  } else {
    row.additional_documents = [];
  }
  
  // Create assignment object if assignment exists
  if (row.assignment_id) {
    row.current_assignment = {
      id: row.assignment_id,
      room_id: row.assigned_room_id,
      bed_number: row.assigned_bed_number,
      tenant_gender: row.assigned_gender,
      is_available: row.bed_is_available,
      room_number: row.assigned_room_number,
      property_name: row.assigned_property_name,
      property_id: row.assigned_property_id
    };
  } else {
    row.current_assignment = null;
  }
  
  // Remove the extra assignment fields from the main tenant object
  delete row.assignment_id;
  delete row.assigned_room_id;
  delete row.assigned_bed_number;
  delete row.bed_is_available;
  delete row.assigned_gender;
  delete row.assigned_room_number;
  delete row.assigned_property_name;
  delete row.assigned_property_id;
  
  return row;
}


const TenantModel = {
  // async findAll({
  //   search = "",
  //   page = 1,
  //   pageSize = 50,
  //   gender,
  //   occupation_category,
  //   is_active,
  //   portal_access_enabled,
  //   city,
  //   state,
  //   preferred_sharing,
  //   preferred_room_type,
  //   has_credentials,
  // }) {
  //   try {
  //     const offset = (page - 1) * pageSize;
  //     const where = [];
  //     const params = [];

  //     if (search) {
  //       where.push("(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
  //       const q = `%${search}%`;
  //       params.push(q, q, q);
  //     }
  //     if (gender) {
  //       where.push("gender = ?");
  //       params.push(gender);
  //     }
  //     if (occupation_category) {
  //       where.push("occupation_category = ?");
  //       params.push(occupation_category);
  //     }
  //     if (typeof is_active !== "undefined" && is_active !== null) {
  //       where.push("is_active = ?");
  //       params.push(is_active ? 1 : 0);
  //     }
  //     if (typeof portal_access_enabled !== "undefined" && portal_access_enabled !== null) {
  //       where.push("portal_access_enabled = ?");
  //       params.push(portal_access_enabled ? 1 : 0);
  //     }
  //     if (city) {
  //       where.push("city LIKE ?");
  //       params.push(`%${city}%`);
  //     }
  //     if (state) {
  //       where.push("state LIKE ?");
  //       params.push(`%${state}%`);
  //     }
  //     if (preferred_sharing) {
  //       where.push("preferred_sharing = ?");
  //       params.push(preferred_sharing);
  //     }
  //     if (preferred_room_type) {
  //       where.push("preferred_room_type = ?");
  //       params.push(preferred_room_type);
  //     }
  //     if (typeof has_credentials !== "undefined" && has_credentials !== null) {
  //       if (has_credentials) {
  //         where.push("EXISTS (SELECT 1 FROM tenant_credentials tc WHERE tc.tenant_id = tenants.id)");
  //       } else {
  //         where.push("NOT EXISTS (SELECT 1 FROM tenant_credentials tc WHERE tc.tenant_id = tenants.id)");
  //       }
  //     }

  //     const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  //     const [rows] = await pool.query(
  //       `SELECT * FROM tenants ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  //       [...params, parseInt(pageSize, 10), parseInt(offset, 10)]
  //     );

  //     const [countRows] = await pool.query(
  //       `SELECT COUNT(*) as total FROM tenants ${whereSql}`,
  //       params
  //     );
  //     const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

  //     return { rows: rows.map(parseTenant), total };
  //   } catch (err) {
  //     console.error("TenantModel.findAll error:", err);
  //     throw err;
  //   }
  // },
  
async findAll({
  search = "",
  page = 1,
  pageSize = 50,
  gender,
  occupation_category,
  is_active,
  portal_access_enabled,
  city,
  state,
  preferred_sharing,
  preferred_room_type,
  has_credentials,
}) {
  try {
    const offset = (page - 1) * pageSize;
    const where = [];
    const params = [];

    if (search) {
      where.push("(t.full_name LIKE ? OR t.email LIKE ? OR t.phone LIKE ? OR t.emergency_contact_name LIKE ? OR t.emergency_contact_phone LIKE ?)");
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }
    if (gender) {
      where.push("t.gender = ?"); // ✅ Use t.gender
      params.push(gender);
    }
    if (occupation_category) {
      where.push("t.occupation_category = ?"); // ✅ Use t.occupation_category
      params.push(occupation_category);
    }
    if (typeof is_active !== "undefined" && is_active !== null) {
      where.push("t.is_active = ?"); // ✅ Use t.is_active (from tenants table)
      params.push(is_active ? 1 : 0);
    }
    if (typeof portal_access_enabled !== "undefined" && portal_access_enabled !== null) {
      where.push("t.portal_access_enabled = ?"); // ✅ Use t.portal_access_enabled
      params.push(portal_access_enabled ? 1 : 0);
    }
    if (city) {
      where.push("t.city LIKE ?"); // ✅ Use t.city
      params.push(`%${city}%`);
    }
    if (state) {
      where.push("t.state LIKE ?"); // ✅ Use t.state
      params.push(`%${state}%`);
    }
    if (preferred_sharing) {
      where.push("t.preferred_sharing = ?"); // ✅ Use t.preferred_sharing
      params.push(preferred_sharing);
    }
    if (preferred_room_type) {
      where.push("t.preferred_room_type = ?"); // ✅ Use t.preferred_room_type
      params.push(preferred_room_type);
    }
    if (typeof has_credentials !== "undefined" && has_credentials !== null) {
      if (has_credentials) {
        where.push("EXISTS (SELECT 1 FROM tenant_credentials tc WHERE tc.tenant_id = t.id)");
      } else {
        where.push("NOT EXISTS (SELECT 1 FROM tenant_credentials tc WHERE tc.tenant_id = t.id)");
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // SQL with table aliases
    const sql = `
      SELECT 
        t.*,
        -- Use aggregation functions for bed assignment fields
        MAX(ba.id) as assignment_id,
        MAX(ba.room_id) as assigned_room_id,
        MAX(ba.bed_number) as assigned_bed_number,
        MAX(ba.is_available) as bed_is_available,
        MAX(ba.tenant_gender) as assigned_gender,
        MAX(r.room_number) as assigned_room_number,
        MAX(p.name) as assigned_property_name,
        MAX(p.id) as assigned_property_id
      FROM tenants t
      LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = FALSE
      LEFT JOIN rooms r ON ba.room_id = r.id
      LEFT JOIN properties p ON r.property_id = p.id
      ${whereSql} 
      GROUP BY t.id 
      ORDER BY t.created_at DESC 
      LIMIT ? OFFSET ?
    `;

    console.log('SQL query:', sql);
    console.log('Parameters:', [...params, parseInt(pageSize, 10), parseInt(offset, 10)]);

    const [rows] = await pool.query(
      sql,
      [...params, parseInt(pageSize, 10), parseInt(offset, 10)]
    );

    // Count query also needs table alias
    const countSql = `
      SELECT COUNT(*) as total 
      FROM tenants t
      ${whereSql}
    `;
    
    const [countRows] = await pool.query(
      countSql,
      params
    );
    
    const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

    return { rows: rows.map(parseTenant), total };
  } catch (err) {
    console.error("TenantModel.findAll error:", err);
    throw err;
  }
},

  // In TenantModel.findById() - ensure it includes:
async findById(id) {
  const sql = `
    SELECT 
      t.*, 
      p.name as property_name,
      p.address as property_address,
      p.city as property_city,
      p.state as property_state,
      p.lockin_period_months as property_lockin_period_months,
      p.lockin_penalty_amount as property_lockin_penalty_amount,
      p.lockin_penalty_type as property_lockin_penalty_type,
      p.notice_period_days as property_notice_period_days,
      p.notice_penalty_amount as property_notice_penalty_amount,
      p.notice_penalty_type as property_notice_penalty_type
    FROM tenants t
    LEFT JOIN properties p ON t.property_id = p.id
    WHERE t.id = ?
  `;
  
  const [rows] = await pool.query(sql, [id]);
  return rows[0] || null;
},

  // async findById(id) {
  //   try {
  //     const [rows] = await pool.query(
  //       "SELECT * FROM tenants WHERE id = ? LIMIT 1",
  //       [id]
  //     );
  //     return parseTenant(rows[0] || null);
  //   } catch (err) {
  //     console.error("TenantModel.findById error:", err);
  //     throw err;
  //   }
  // },

  async findById(id) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tenants WHERE id = ? LIMIT 1",
      [id]
    );
    
    if (!rows[0]) return null;
    
    const tenant = rows[0];
    
    // Parse additional_documents if it exists
    if (tenant.additional_documents) {
      try {
        if (typeof tenant.additional_documents === 'string') {
          tenant.additional_documents = JSON.parse(tenant.additional_documents);
        }
        // If already parsed or null, keep as is
      } catch (e) {
        console.error('Error parsing additional_documents:', e);
        tenant.additional_documents = [];
      }
    } else {
      tenant.additional_documents = [];
    }
    
    return tenant;
  } catch (err) {
    console.error("TenantModel.findById error:", err);
    throw err;
  }
},

  // async create(payload) {
  //   try {
  //     console.log('TenantModel.create called with payload:', payload);
      
  //     const {
  //       full_name,
  //       email,
  //       phone,
  //       country_code = '+91',
  //       gender,
  //       date_of_birth,
  //       occupation_category,
  //       exact_occupation,
  //       occupation,
  //       portal_access_enabled = false,
  //       is_active = true,
  //       id_proof_url,
  //       address_proof_url,
  //       photo_url,
  //       address,
  //       city,
  //       state,
  //       pincode,
  //       preferred_sharing,
  //       preferred_room_type,
  //       preferred_property_id,
  //     } = payload;
      
  //     // Debug: Log all values
  //     console.log('Values to insert:', {
  //       full_name,
  //       email,
  //       phone,
  //       country_code,
  //       gender,
  //       date_of_birth,
  //       occupation_category,
  //       exact_occupation,
  //       occupation,
  //       portal_access_enabled,
  //       is_active,
  //       id_proof_url,
  //       address_proof_url,
  //       photo_url,
  //       address,
  //       city,
  //       state,
  //       pincode,
  //       preferred_sharing,
  //       preferred_room_type,
  //       preferred_property_id
  //     });
      
  //     const values = [
  //       full_name,
  //       email || null,
  //       phone || null,
  //       country_code,
  //       gender || null,
  //       date_of_birth || null,
  //       occupation_category || null,
  //       exact_occupation || null,
  //       occupation || null,
  //       portal_access_enabled ? 1 : 0,
  //       is_active ? 1 : 0,
  //       id_proof_url || null,
  //       address_proof_url || null,
  //       photo_url || null,
  //       address || null,
  //       city || null,
  //       state || null,
  //       pincode || null,
  //       preferred_sharing || null,
  //       preferred_room_type || null,
  //       preferred_property_id ? parseInt(preferred_property_id) : null,
  //     ];
      
  //     console.log('Number of columns in INSERT: 22');
  //     console.log('Number of values in VALUES: ' + values.length);
  //     console.log('Values array:', values);
      
  //     const [result] = await pool.query(
  //       `INSERT INTO tenants
  //        (full_name, email, phone, country_code, gender, date_of_birth, occupation_category, 
  //         exact_occupation, occupation, portal_access_enabled, is_active,
  //         id_proof_url, address_proof_url, photo_url, address, city, state, pincode,
  //         preferred_sharing, preferred_room_type, preferred_property_id, created_at)
  //        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
  //       values
  //     );
      
  //     console.log('Tenant created successfully with ID:', result.insertId);
  //     return result.insertId;
  //   } catch (err) {
  //     console.error("TenantModel.create error:", err);
  //     console.error("SQL Error details:", {
  //       code: err.code,
  //       errno: err.errno,
  //       sqlState: err.sqlState,
  //       sqlMessage: err.sqlMessage,
  //       sql: err.sql
  //     });
  //     throw err;
  //   }
  // },

  // In tenantModel.js - Update the create method
async create(payload) {
  try {
    console.log('TenantModel.create called with payload keys:', Object.keys(payload));
    
    const {
      salutation,
      full_name,
      email,
      phone,
      country_code = '+91',
      gender,
      date_of_birth,
      occupation_category,
      exact_occupation,
      occupation,
      portal_access_enabled = false,
      is_active = true,
      id_proof_url,
      address_proof_url,
      photo_url,
      address,
      city,
      state,
      pincode,
      preferred_sharing,
      preferred_room_type,
      preferred_property_id,
      check_in_date,
      property_id,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
      additional_documents = '[]',
      // New fields for lock-in and notice period
      lockin_period_months,
      lockin_penalty_amount,
      lockin_penalty_type,
      notice_period_days,
      notice_penalty_amount,
      notice_penalty_type
    } = payload;
    
    // Prepare additional_documents JSON
    let additionalDocsJson = '[]';
    try {
      if (typeof additional_documents === 'string') {
        // Already JSON string
        additionalDocsJson = additional_documents;
      } else if (Array.isArray(additional_documents)) {
        additionalDocsJson = JSON.stringify(additional_documents);
      } else if (additional_documents && typeof additional_documents === 'object') {
        additionalDocsJson = JSON.stringify(additional_documents);
      }
    } catch (e) {
      console.error('Error processing additional_documents:', e);
      additionalDocsJson = '[]';
    }
    
    const values = [
      salutation || null,
      full_name,
      email || null,
      phone || null,
      country_code,
      gender || null,
      date_of_birth || null,
      occupation_category || null,
      exact_occupation || null,
      occupation || null,
      portal_access_enabled ? 1 : 0,
      is_active ? 1 : 0,
      id_proof_url || null,
      address_proof_url || null,
      photo_url || null,
      address || null,
      city || null,
      state || null,
      pincode || null,
      preferred_sharing || null,
      preferred_room_type || null,
      preferred_property_id ? parseInt(preferred_property_id) : null,
      property_id ? parseInt(property_id) : null,
      // check_in_date || null,
      check_in_date 
  ? (typeof check_in_date === 'string' && check_in_date.includes('T')
      ? check_in_date.split('T')[0]
      : check_in_date)
  : null,
      emergency_contact_name || null,
      emergency_contact_phone || null,
      emergency_contact_relation || null,
      additionalDocsJson,
      // New fields
      lockin_period_months || 0,
      lockin_penalty_amount || 0,
      lockin_penalty_type || 'fixed',
      notice_period_days || 0,
      notice_penalty_amount || 0,
      notice_penalty_type || 'fixed'
    ];
    
    console.log('Number of values for INSERT:', values.length);
    console.log('Sample values:', {
      full_name: values[0],
      email: values[1],
      property_id: values[21],
      lockin_months: values[26],
      notice_days: values[29]
    });

//     add("check_in_date", property.check_in_date, (v) => {
//   if (!v) return null;
//   // If it's an ISO string with time, extract just the date part
//   if (typeof v === 'string' && v.includes('T')) {
//     return v.split('T')[0]; // Extract YYYY-MM-DD
//   }
//   return v;
// });
    
    // const sql = `INSERT INTO tenants
    //    (salutation, full_name, email, phone, country_code, gender, date_of_birth, occupation_category, 
    //     exact_occupation, occupation, portal_access_enabled, is_active,
    //     id_proof_url, address_proof_url, photo_url, address, city, state, pincode,
    //     preferred_sharing, preferred_room_type, preferred_property_id, property_id, check_in_date,
    //     emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    //     additional_documents, 
    //     lockin_period_months, lockin_penalty_amount, lockin_penalty_type,
    //     notice_period_days, notice_penalty_amount, notice_penalty_type)
    //    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
const sql = `
INSERT INTO tenants (
  salutation,
  full_name,
  email,
  phone,
  country_code,
  gender,
  date_of_birth,
  occupation_category,
  exact_occupation,
  occupation,
  portal_access_enabled,
  is_active,
  id_proof_url,
  address_proof_url,
  photo_url,
  address,
  city,
  state,
  pincode,
  preferred_sharing,
  preferred_room_type,
  preferred_property_id,
  property_id,
  check_in_date,
  emergency_contact_name,
  emergency_contact_phone,
  emergency_contact_relation,
  additional_documents,
  lockin_period_months,
  lockin_penalty_amount,
  lockin_penalty_type,
  notice_period_days,
  notice_penalty_amount,
  notice_penalty_type
)
VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
`;


    console.log('SQL query prepared');
    
    const [result] = await pool.query(sql, values);
    
    console.log('Tenant created successfully with ID:', result.insertId);
    return result.insertId;
  } catch (err) {
    console.error("TenantModel.create error:", err);
    console.error("SQL Error details:", {
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    throw err;
  }
},

// Add this method to create credentials
async createCredential(credentialData) {
  try {
    const { tenant_id, email, password_hash } = credentialData;
    
    console.log('Creating credential for tenant:', tenant_id);
    
    const sql = `
      INSERT INTO tenant_credentials 
      (tenant_id, email, password_hash, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    
    const [result] = await pool.query(sql, [tenant_id, email, password_hash]);
    console.log('Credential created successfully');
    return result.insertId;
  } catch (err) {
    console.error("TenantModel.createCredential error:", err);
    throw err;
  }
},

// Also add this method for updating credentials
async updateCredential(tenantId, updateData) {
  try {
    const { password_hash } = updateData;
    
    const sql = `
      UPDATE tenant_credentials 
      SET password_hash = ?, updated_at = NOW() 
      WHERE tenant_id = ?
    `;
    
    const [result] = await pool.query(sql, [password_hash, tenantId]);
    return result.affectedRows > 0;
  } catch (err) {
    console.error("TenantModel.updateCredential error:", err);
    throw err;
  }
},

// Add this method to get credentials
async getCredentialsByTenantIds(tenantIds) {
  try {
    if (!tenantIds.length) return [];
    
    const placeholders = tenantIds.map(() => '?').join(',');
    const sql = `
      SELECT tenant_id, email, password_hash, created_at 
      FROM tenant_credentials 
      WHERE tenant_id IN (${placeholders})
    `;
    
    const [rows] = await pool.query(sql, tenantIds);
    return rows;
  } catch (err) {
    console.error("TenantModel.getCredentialsByTenantIds error:", err);
    return [];
  }
},

  // async create(payload) {
  //   try {
  //     console.log('TenantModel.create called with payload:', Object.keys(payload));
      
  //     const {
  //       full_name,
  //       email,
  //       phone,
  //       country_code = '+91',
  //       gender,
  //       date_of_birth,
  //       occupation_category,
  //       exact_occupation,
  //       occupation,
  //       portal_access_enabled = false,
  //       is_active = true,
  //       id_proof_url,
  //       address_proof_url,
  //       photo_url,
  //       address,
  //       city,
  //       state,
  //       pincode,
  //       preferred_sharing,
  //       preferred_room_type,
  //       preferred_property_id,
  //       emergency_contact_name,
  //       emergency_contact_phone,
  //       emergency_contact_relation,
  //       additional_documents = '[]'
  //     } = payload;
      
  //     // Prepare additional_documents JSON
  //     let additionalDocsJson = '[]';
  //     try {
  //       if (typeof additional_documents === 'string') {
  //         additionalDocsJson = additional_documents;
  //       } else if (Array.isArray(additional_documents)) {
  //         additionalDocsJson = JSON.stringify(additional_documents);
  //       }
  //     } catch (e) {
  //       console.error('Error processing additional_documents:', e);
  //     }
      
  //     const values = [
  //       full_name,
  //       email || null,
  //       phone || null,
  //       country_code,
  //       gender || null,
  //       date_of_birth || null,
  //       occupation_category || null,
  //       exact_occupation || null,
  //       occupation || null,
  //       portal_access_enabled ? 1 : 0,
  //       is_active ? 1 : 0,
  //       id_proof_url || null,
  //       address_proof_url || null,
  //       photo_url || null,
  //       address || null,
  //       city || null,
  //       state || null,
  //       pincode || null,
  //       preferred_sharing || null,
  //       preferred_room_type || null,
  //       preferred_property_id ? parseInt(preferred_property_id) : null,
  //       emergency_contact_name || null,
  //       emergency_contact_phone || null,
  //       emergency_contact_relation || null,
  //       additionalDocsJson
  //     ];
      
  //     console.log('Number of values:', values.length);
      
  //     const [result] = await pool.query(
  //       `INSERT INTO tenants
  //        (full_name, email, phone, country_code, gender, date_of_birth, occupation_category, 
  //         exact_occupation, occupation, portal_access_enabled, is_active,
  //         id_proof_url, address_proof_url, photo_url, address, city, state, pincode,
  //         preferred_sharing, preferred_room_type, preferred_property_id,
  //         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  //         additional_documents, created_at)
  //        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
  //       values
  //     );
      
  //     console.log('Tenant created successfully with ID:', result.insertId);
  //     return result.insertId;
  //   } catch (err) {
  //     console.error("TenantModel.create error:", err);
  //     console.error("SQL Error details:", {
  //       code: err.code,
  //       errno: err.errno,
  //       sqlState: err.sqlState,
  //       sqlMessage: err.sqlMessage,
  //       sql: err.sql
  //     });
  //     throw err;
  //   }
  // },


  // async update(id, payload) {
  //   try {
  //     const fields = [];
  //     const params = [];

  //     const setIf = (k, v) => {
  //       if (typeof v !== "undefined" && v !== null) {
  //         fields.push(`${k} = ?`);
  //         params.push(v);
  //       }
  //     };

  //     setIf("full_name", payload.full_name);
  //     setIf("email", payload.email);
  //     setIf("phone", payload.phone);
  //     setIf("country_code", payload.country_code);
  //     setIf("gender", payload.gender);
  //     setIf("date_of_birth", payload.date_of_birth);
  //     setIf("occupation_category", payload.occupation_category);
  //     setIf("exact_occupation", payload.exact_occupation);
  //     setIf("occupation", payload.occupation);
  //     if (typeof payload.is_active !== "undefined")
  //       setIf("is_active", payload.is_active ? 1 : 0);
  //     if (typeof payload.portal_access_enabled !== "undefined")
  //       setIf("portal_access_enabled", payload.portal_access_enabled ? 1 : 0);
  //     setIf("id_proof_url", payload.id_proof_url);
  //     setIf("address_proof_url", payload.address_proof_url);
  //     setIf("photo_url", payload.photo_url);
  //     setIf("address", payload.address);
  //     setIf("city", payload.city);
  //     setIf("state", payload.state);
  //     setIf("pincode", payload.pincode);
  //     setIf("preferred_sharing", payload.preferred_sharing);
  //     setIf("preferred_room_type", payload.preferred_room_type);
  //     setIf("preferred_property_id", payload.preferred_property_id);

  //     if (fields.length === 0) return false;

  //     params.push(new Date());
  //     params.push(id);

  //     const sql = `UPDATE tenants SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`;
  //     const [result] = await pool.query(sql, params);
  //     return result.affectedRows > 0;
  //   } catch (err) {
  //     console.error("TenantModel.update error:", err);
  //     throw err;
  //   }
  // },

// async update(id, payload) {
//   try {
//     console.log('📝 TenantModel.update called for ID:', id);
//     console.log('📝 Payload keys:', Object.keys(payload));
//     console.log('📝 Has additional_documents field?', 'additional_documents' in payload);
//     console.log('📝 Additional documents raw:', payload.additional_documents);
    
//     const fields = [];
//     const params = [];

//     const setIf = (k, v) => {
//       if (typeof v !== "undefined" && v !== null) {
//         fields.push(`${k} = ?`);
//         params.push(v);
//       }
//     };

//     // Personal info
//     setIf("full_name", payload.full_name);
//     setIf("email", payload.email);
//     setIf("phone", payload.phone);
//     setIf("country_code", payload.country_code);
//     setIf("gender", payload.gender);
//     setIf("date_of_birth", payload.date_of_birth);
//     setIf("occupation_category", payload.occupation_category);
//     setIf("exact_occupation", payload.exact_occupation);
//     setIf("occupation", payload.occupation);
    
//     // Status fields
//     if (typeof payload.is_active !== "undefined")
//       setIf("is_active", payload.is_active ? 1 : 0);
//     if (typeof payload.portal_access_enabled !== "undefined")
//       setIf("portal_access_enabled", payload.portal_access_enabled ? 1 : 0);
    
//     // Document fields
//     setIf("id_proof_url", payload.id_proof_url);
//     setIf("address_proof_url", payload.address_proof_url);
//     setIf("photo_url", payload.photo_url);
    
//     // Address fields
//     setIf("address", payload.address);
//     setIf("city", payload.city);
//     setIf("state", payload.state);
//     setIf("pincode", payload.pincode);
    
//     // Preferences
//     setIf("preferred_sharing", payload.preferred_sharing);
//     setIf("preferred_room_type", payload.preferred_room_type);
//     setIf("preferred_property_id", payload.preferred_property_id);
    
//     // Emergency contacts
//     setIf("emergency_contact_name", payload.emergency_contact_name);
//     setIf("emergency_contact_phone", payload.emergency_contact_phone);
//     setIf("emergency_contact_relation", payload.emergency_contact_relation);
    
//     // ===== FIX: Handle Additional Documents =====
//     console.log('🔍 Checking for additional document files...');
    
//     // Check for file uploads in request (these come from req.files, not req.body)
//     if (payload._files && payload._files.additional_documents) {
//       console.log('📁 Found additional document files in _files:', payload._files.additional_documents.length);
      
//       // First, get current additional documents from database
//       const [currentRows] = await pool.query(
//         'SELECT additional_documents FROM tenants WHERE id = ?',
//         [id]
//       );
      
//       let currentDocs = [];
//       if (currentRows[0] && currentRows[0].additional_documents) {
//         try {
//           const parsed = JSON.parse(currentRows[0].additional_documents);
//           currentDocs = Array.isArray(parsed) ? parsed : [];
//         } catch (e) {
//           console.error('Error parsing current additional_documents:', e);
//         }
//       }
      
//       // Process uploaded files
//       const uploadedFiles = Array.isArray(payload._files.additional_documents) 
//         ? payload._files.additional_documents 
//         : [payload._files.additional_documents];
      
//       const newDocs = uploadedFiles.map(file => ({
//         filename: file.originalname,
//         url: file.path || `/uploads/additional/${Date.now()}-${file.originalname}`,
//         uploaded_at: new Date().toISOString(),
//         document_type: 'Additional'
//       }));
      
//       // Merge with existing documents
//       const allDocs = [...currentDocs, ...newDocs];
//       setIf("additional_documents", JSON.stringify(allDocs));
      
//       console.log('✅ Processed additional documents:', allDocs.length);
//     } 
//     // If additional_documents is sent as JSON string in body
//     else if (typeof payload.additional_documents !== "undefined" && payload.additional_documents !== '') {
//       console.log('📝 Processing additional_documents from body:', payload.additional_documents);
      
//       let additionalDocsJson = '[]';
//       try {
//         if (typeof payload.additional_documents === 'string') {
//           // Check if it's already valid JSON
//           if (payload.additional_documents.trim().startsWith('[') || 
//               payload.additional_documents.trim().startsWith('{')) {
//             additionalDocsJson = payload.additional_documents;
//           } else {
//             // Might be a simple value, wrap in array
//             additionalDocsJson = JSON.stringify([{ 
//               filename: payload.additional_documents,
//               uploaded_at: new Date().toISOString()
//             }]);
//           }
//         } else if (Array.isArray(payload.additional_documents)) {
//           additionalDocsJson = JSON.stringify(payload.additional_documents);
//         }
//       } catch (e) {
//         console.error('Error processing additional_documents:', e);
//         additionalDocsJson = '[]';
//       }
      
//       setIf("additional_documents", additionalDocsJson);
//     }

//     if (fields.length === 0) {
//       console.log('⚠️ No fields to update');
//       return false;
//     }

//     params.push(new Date());
//     params.push(id);

//     const sql = `UPDATE tenants SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`;
//     console.log('📝 Update SQL:', sql);
//     console.log('📝 Update params:', params.map(p => 
//       typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p
//     ));
    
//     const [result] = await pool.query(sql, params);
//     console.log('✅ Update result:', { 
//       affectedRows: result.affectedRows, 
//       changedRows: result.changedRows 
//     });
    
//     return result.affectedRows > 0;
//   } catch (err) {
//     console.error("❌ TenantModel.update error:", err.message);
//     console.error("SQL Error details:", err.sqlMessage);
//     throw err;
//   }
// },

// async update(id, payload) {
//   try {
//     const fields = [];
//     const params = [];

//     const setIf = (k, v) => {
//       if (typeof v !== "undefined" && v !== null) {
//         fields.push(`${k} = ?`);
//         params.push(v);
//       }
//     };

//     // Personal info
//     setIf("full_name", payload.full_name);
//     setIf("email", payload.email);
//     setIf("phone", payload.phone);
//     setIf("country_code", payload.country_code);
//     setIf("gender", payload.gender);
//     setIf("date_of_birth", payload.date_of_birth);
//     setIf("occupation_category", payload.occupation_category);
//     setIf("exact_occupation", payload.exact_occupation);
//     setIf("occupation", payload.occupation);
    
//     // Status fields
//     if (typeof payload.is_active !== "undefined")
//       setIf("is_active", payload.is_active ? 1 : 0);
//     if (typeof payload.portal_access_enabled !== "undefined")
//       setIf("portal_access_enabled", payload.portal_access_enabled ? 1 : 0);
    
//     // Document fields
//     setIf("id_proof_url", payload.id_proof_url);
//     setIf("address_proof_url", payload.address_proof_url);
//     setIf("photo_url", payload.photo_url);
    
//     // Address fields
//     setIf("address", payload.address);
//     setIf("city", payload.city);
//     setIf("state", payload.state);
//     setIf("pincode", payload.pincode);
    
//     // Preferences
//     setIf("preferred_sharing", payload.preferred_sharing);
//     setIf("preferred_room_type", payload.preferred_room_type);
//     setIf("preferred_property_id", payload.preferred_property_id);
    
//     // Emergency contacts
//     setIf("emergency_contact_name", payload.emergency_contact_name);
//     setIf("emergency_contact_phone", payload.emergency_contact_phone);
//     setIf("emergency_contact_relation", payload.emergency_contact_relation);
    
//     // Additional documents - FIXED
//     if (typeof payload.additional_documents !== "undefined") {
//       let additionalDocsJson = '[]';
//       try {
//         if (typeof payload.additional_documents === 'string') {
//           // Check if it's already JSON string
//           try {
//             JSON.parse(payload.additional_documents);
//             additionalDocsJson = payload.additional_documents;
//           } catch (e) {
//             // If not JSON, assume it's a string that should be an array
//             additionalDocsJson = '[]';
//           }
//         } else if (Array.isArray(payload.additional_documents)) {
//           additionalDocsJson = JSON.stringify(payload.additional_documents);
//         } else if (payload.additional_documents && typeof payload.additional_documents === 'object') {
//           // If it's an object with files array
//           if (payload.additional_documents.files && Array.isArray(payload.additional_documents.files)) {
//             additionalDocsJson = JSON.stringify(payload.additional_documents.files);
//           } else {
//             additionalDocsJson = JSON.stringify(payload.additional_documents);
//           }
//         }
//         console.log('Processed additional_documents:', additionalDocsJson);
//       } catch (e) {
//         console.error('Error processing additional_documents:', e);
//         additionalDocsJson = '[]';
//       }
//       setIf("additional_documents", additionalDocsJson);
//     }

//     if (fields.length === 0) return false;

//     params.push(new Date());
//     params.push(id);

//     const sql = `UPDATE tenants SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`;
//     console.log('Update SQL:', sql);
//     console.log('Update params:', params);
    
//     const [result] = await pool.query(sql, params);
//     return result.affectedRows > 0;
//   } catch (err) {
//     console.error("TenantModel.update error:", err);
//     throw err;
//   }
// },

async update(id, payload) {
  try {
    const fields = [];
    const params = [];

    const setIf = (k, v) => {
      if (typeof v !== "undefined" && v !== null) {
        fields.push(`${k} = ?`);
        params.push(v);
      }
    };
     if (payload.check_in_date && typeof payload.check_in_date === 'string') {
      try {
        // Parse and format to YYYY-MM-DD
        const date = new Date(payload.check_in_date);
        if (!isNaN(date.getTime())) {
          payload.check_in_date = date.toISOString().split('T')[0]; // Extract YYYY-MM-DD
        }
      } catch (e) {
        console.error('Error formatting check_in_date:', e);
      }
    }

    // Also format date_of_birth for consistency
    if (payload.date_of_birth && typeof payload.date_of_birth === 'string') {
      try {
        const date = new Date(payload.date_of_birth);
        if (!isNaN(date.getTime())) {
          payload.date_of_birth = date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Error formatting date_of_birth:', e);
      }
    }

    // Personal info
    setIf("salutation", payload.salutation);
    setIf("full_name", payload.full_name);
    setIf("email", payload.email);
    setIf("phone", payload.phone);
    setIf("country_code", payload.country_code);
    setIf("gender", payload.gender);
    setIf("date_of_birth", payload.date_of_birth);
    setIf("occupation_category", payload.occupation_category);
    setIf("exact_occupation", payload.exact_occupation);
    setIf("occupation", payload.occupation);
    
    // Status fields
    if (typeof payload.is_active !== "undefined")
      setIf("is_active", payload.is_active ? 1 : 0);
    if (typeof payload.portal_access_enabled !== "undefined")
      setIf("portal_access_enabled", payload.portal_access_enabled ? 1 : 0);
    
    // Document fields
    setIf("id_proof_url", payload.id_proof_url);
    setIf("address_proof_url", payload.address_proof_url);
    setIf("photo_url", payload.photo_url);
    
    // Address fields
    setIf("address", payload.address);
    setIf("city", payload.city);
    setIf("state", payload.state);
    setIf("pincode", payload.pincode);
    
    // Preferences
    setIf("preferred_sharing", payload.preferred_sharing);
    setIf("preferred_room_type", payload.preferred_room_type);
    setIf("preferred_property_id", payload.preferred_property_id);
    setIf("property_id", payload.property_id); // New field
    setIf("check_in_date", payload.check_in_date); // New field
    
    // New lock-in and notice period fields
    setIf("lockin_period_months", payload.lockin_period_months);
    setIf("lockin_penalty_amount", payload.lockin_penalty_amount);
    setIf("lockin_penalty_type", payload.lockin_penalty_type);
    setIf("notice_period_days", payload.notice_period_days);
    setIf("notice_penalty_amount", payload.notice_penalty_amount);
    setIf("notice_penalty_type", payload.notice_penalty_type);
    
    // Emergency contacts
    setIf("emergency_contact_name", payload.emergency_contact_name);
    setIf("emergency_contact_phone", payload.emergency_contact_phone);
    setIf("emergency_contact_relation", payload.emergency_contact_relation);
    
    // Additional documents
    if (typeof payload.additional_documents !== "undefined") {
      let additionalDocsJson = '[]';
      try {
        if (typeof payload.additional_documents === 'string') {
          try {
            JSON.parse(payload.additional_documents);
            additionalDocsJson = payload.additional_documents;
          } catch (e) {
            additionalDocsJson = '[]';
          }
        } else if (Array.isArray(payload.additional_documents)) {
          additionalDocsJson = JSON.stringify(payload.additional_documents);
        } else if (payload.additional_documents && typeof payload.additional_documents === 'object') {
          if (payload.additional_documents.files && Array.isArray(payload.additional_documents.files)) {
            additionalDocsJson = JSON.stringify(payload.additional_documents.files);
          } else {
            additionalDocsJson = JSON.stringify(payload.additional_documents);
          }
        }
        console.log('Processed additional_documents:', additionalDocsJson);
      } catch (e) {
        console.error('Error processing additional_documents:', e);
        additionalDocsJson = '[]';
      }
      setIf("additional_documents", additionalDocsJson);
    }

    if (fields.length === 0) return false;

    params.push(new Date());
    params.push(id);

    const sql = `UPDATE tenants SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`;
    console.log('Update SQL:', sql);
    console.log('Update params:', params);
    
    const [result] = await pool.query(sql, params);
    return result.affectedRows > 0;
  } catch (err) {
    console.error("TenantModel.update error:", err);
    throw err;
  }
},

  async delete(id) {
    try {
      const [result] = await pool.query("DELETE FROM tenants WHERE id = ?", [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error("TenantModel.delete error:", err);
      throw err;
    }
  },

  async bulkDelete(ids) {
    try {
      if (!ids || !ids.length) return false;
      const [result] = await pool.query("DELETE FROM tenants WHERE id IN (?)", [ids]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error("TenantModel.bulkDelete error:", err);
      throw err;
    }
  },

  async bulkUpdateStatus(ids, is_active) {
    try {
      if (!ids || !ids.length) return false;
      const [result] = await pool.query(
        "UPDATE tenants SET is_active = ?, updated_at = ? WHERE id IN (?)",
        [is_active ? 1 : 0, new Date(), ids]
      );
      return result.affectedRows > 0;
    } catch (err) {
      console.error("TenantModel.bulkUpdateStatus error:", err);
      throw err;
    }
  },

  async bulkUpdatePortalAccess(ids, portal_access_enabled) {
    try {
      if (!ids || !ids.length) return false;
      const [result] = await pool.query(
        "UPDATE tenants SET portal_access_enabled = ?, updated_at = ? WHERE id IN (?)",
        [portal_access_enabled ? 1 : 0, new Date(), ids]
      );
      return result.affectedRows > 0;
    } catch (err) {
      console.error("TenantModel.bulkUpdatePortalAccess error:", err);
      throw err;
    }
  },

  async createCredential({ tenant_id, email, password_hash }) {
    try {
      const [result] = await pool.query(
        `INSERT INTO tenant_credentials (tenant_id, email, password_hash, is_active, created_at) VALUES (?, ?, ?, ?, NOW())`,
        [tenant_id, email, password_hash, 1]
      );
      return result.insertId;
    } catch (err) {
      console.error("TenantModel.createCredential error:", err);
      throw err;
    }
  },

  async updateCredential(tenant_id, { password_hash }) {
    try {
      const [result] = await pool.query(
        `UPDATE tenant_credentials SET password_hash = ?, updated_at = ? WHERE tenant_id = ?`,
        [password_hash, new Date(), tenant_id]
      );
      return result.affectedRows > 0;
    } catch (err) {
      console.error("TenantModel.updateCredential error:", err);
      throw err;
    }
  },

  async getCredentialsByTenantIds(ids = []) {
    try {
      if (!ids || !ids.length) return [];
      const [rows] = await pool.query(
        "SELECT tenant_id, email, is_active FROM tenant_credentials WHERE tenant_id IN (?)",
        [ids]
      );
      return rows;
    } catch (err) {
      console.error("TenantModel.getCredentialsByTenantIds error:", err);
      throw err;
    }
  },

  async getBookingsForTenantIds(tenantIds = []) {
    try {
      if (!tenantIds || !tenantIds.length) return [];
      const [rows] = await pool.query(
        `SELECT b.id, b.tenant_id, b.status, b.monthly_rent, 
                p.name as property_name, p.city_id as property_city, p.state as property_state,
                r.room_number, r.room_type, r.sharing_type, r.floor
         FROM bookings b
         LEFT JOIN properties p ON p.id = b.property_id
         LEFT JOIN rooms r ON r.id = b.room_id
         WHERE b.tenant_id IN (?)`,
        [tenantIds]
      );
      return rows;
    } catch (err) {
      console.error("TenantModel.getBookingsForTenantIds error:", err);
      throw err;
    }
  },

  async getPaymentsForTenantIds(tenantIds = []) {
    try {
      if (!tenantIds || !tenantIds.length) return [];
      const [rows] = await pool.query(
        `SELECT id, tenant_id, amount, payment_date, payment_mode, 
                status, transaction_id, month, year, notes, created_at
         FROM payments 
         WHERE tenant_id IN (?)
         ORDER BY payment_date DESC`,
        [tenantIds]
      );
      return rows;
    } catch (err) {
      console.error("TenantModel.getPaymentsForTenantIds error:", err);
      throw err;
    }
  },

  async getAvailableRooms(gender, propertyId) {
    try {
      console.log('getAvailableRooms called with:', { gender, propertyId });
      
      // Map gender to room preference
      const genderMap = {
        'Male': 'male',
        'Female': 'female',
        'Other': 'mixed'
      };
      
      const roomGender = genderMap[gender] || gender?.toLowerCase();
      
      if (!roomGender) {
        throw new Error('Gender is required');
      }
      
      // Build the query with proper JSON handling
      let genderCondition = '';
      
      if (roomGender === 'male') {
        genderCondition = `
          AND (
            r.room_gender_preference IS NULL OR 
            r.room_gender_preference = '[]' OR 
            JSON_CONTAINS(r.room_gender_preference, '"male"') OR 
            JSON_CONTAINS(r.room_gender_preference, '"mixed"')
          )
        `;
      } else if (roomGender === 'female') {
        genderCondition = `
          AND (
            r.room_gender_preference IS NULL OR 
            r.room_gender_preference = '[]' OR 
            JSON_CONTAINS(r.room_gender_preference, '"female"') OR 
            JSON_CONTAINS(r.room_gender_preference, '"mixed"')
          )
        `;
      } else {
        genderCondition = `
          AND (
            r.room_gender_preference IS NULL OR 
            r.room_gender_preference = '[]' OR 
            JSON_CONTAINS(r.room_gender_preference, '"mixed"')
          )
        `;
      }
      
      // Build the SQL query
      let query = `
        SELECT 
          r.*, 
          p.name as property_name, 
          p.address as property_address,
          p.city_id, 
          p.state,
          r.sharing_type,
          r.room_type,
          r.rent_per_bed,
          (r.total_bed - COALESCE(r.occupied_beds, 0)) as available_beds
        FROM rooms r
        JOIN properties p ON p.id = r.property_id
        WHERE r.occupied_beds < r.total_bed 
        AND r.is_active = 1 
        ${genderCondition}
      `;
      
      const params = [];
      
      // Add property filter if provided
      if (propertyId) {
        query += ` AND r.property_id = ?`;
        params.push(propertyId);
      }
      
      query += ` ORDER BY p.name, r.room_number`;
      
      console.log('SQL Query:', query);
      console.log('Params:', params);
      
      const [rows] = await pool.query(query, params);
      console.log('Rows found:', rows.length);
      
      return rows;
    } catch (error) {
      console.error('TenantModel.getAvailableRooms error:', error);
      throw error;
    }
  },

  async getAllProperties() {
    try {
      const [rows] = await pool.query(
        "SELECT id, name, address, city_id, state FROM properties WHERE is_active = 1 ORDER BY name"
      );
      return rows;
    } catch (err) {
      console.error("TenantModel.getAllProperties error:", err);
      throw err;
    }
  },

  async exportTenants(filters = {}) {
    try {
      const where = [];
      const params = [];

      const addFilter = (field, value) => {
        if (value) {
          where.push(`${field} = ?`);
          params.push(value);
        }
      };

      addFilter("gender", filters.gender);
      addFilter("occupation_category", filters.occupation_category);
      addFilter("city", filters.city);
      addFilter("state", filters.state);
      
      if (typeof filters.is_active !== "undefined" && filters.is_active !== null) {
        where.push("is_active = ?");
        params.push(filters.is_active ? 1 : 0);
      }
      
      if (typeof filters.portal_access_enabled !== "undefined" && filters.portal_access_enabled !== null) {
        where.push("portal_access_enabled = ?");
        params.push(filters.portal_access_enabled ? 1 : 0);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT 
          id,
          full_name,
          email,
          CONCAT(country_code, ' ', phone) as phone_with_code,
          DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth,
          gender,
          occupation_category,
          exact_occupation,
          address,
          city,
          state,
          pincode,
          CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END as status,
          CASE WHEN portal_access_enabled = 1 THEN 'Yes' ELSE 'No' END as portal_access,
          preferred_sharing,
          preferred_room_type,
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
         FROM tenants
         ${whereSql}
         ORDER BY created_at DESC`,
        params
      );

      return rows;
    } catch (err) {
      console.error("TenantModel.exportTenants error:", err);
      throw err;
    }
  },

  async getRoomTypes() {
    try {
      const [sharingTypes] = await pool.query(
        "SELECT DISTINCT sharing_type FROM rooms WHERE sharing_type IS NOT NULL AND sharing_type != '' ORDER BY sharing_type"
      );
      
      const [roomTypes] = await pool.query(
        "SELECT DISTINCT room_type FROM rooms WHERE room_type IS NOT NULL AND room_type != '' ORDER BY room_type"
      );
      
      return {
        sharingTypes: sharingTypes.map(st => st.sharing_type),
        roomTypes: roomTypes.map(rt => rt.room_type)
      };
    } catch (err) {
      console.error("TenantModel.getRoomTypes error:", err);
      return { sharingTypes: [], roomTypes: [] };
    }
  },

  // NEW METHODS FOR FETCHING OPTIONS
  async getPreferredSharingOptions() {
    try {
      const [rows] = await pool.query(
        "SELECT DISTINCT sharing_type as value FROM rooms WHERE sharing_type IS NOT NULL AND sharing_type != '' ORDER BY sharing_type"
      );
      return rows.map(row => row.value);
    } catch (err) {
      console.error("TenantModel.getPreferredSharingOptions error:", err);
      return [];
    }
  },

  async getPreferredRoomTypeOptions() {
    try {
      const [rows] = await pool.query(
        "SELECT DISTINCT room_type as value FROM rooms WHERE room_type IS NOT NULL AND room_type != '' ORDER BY room_type"
      );
      return rows.map(row => row.value);
    } catch (err) {
      console.error("TenantModel.getPreferredRoomTypeOptions error:", err);
      return [];
    }
  },

  async getPropertyOptions() {
    try {
      const [rows] = await pool.query(
        "SELECT id as value, name as label, address FROM properties WHERE is_active = 1 ORDER BY name"
      );
      return rows.map(row => ({
        value: row.value,
        label: row.label,
        address: row.address
      }));
    } catch (err) {
      console.error("TenantModel.getPropertyOptions error:", err);
      return [];
    }
  },

  async getPreferredOptions() {
    try {
      const [sharingRows] = await pool.query(
        "SELECT DISTINCT sharing_type FROM rooms WHERE sharing_type IS NOT NULL AND sharing_type != '' ORDER BY sharing_type"
      );
      
      const [roomTypeRows] = await pool.query(
        "SELECT DISTINCT room_type FROM rooms WHERE room_type IS NOT NULL AND room_type != '' ORDER BY room_type"
      );
      
      const [propertyRows] = await pool.query(
        "SELECT id, name, address FROM properties WHERE is_active = 1 ORDER BY name"
      );

      return {
        sharingTypes: sharingRows.map(row => row.sharing_type),
        roomTypes: roomTypeRows.map(row => row.room_type),
        properties: propertyRows.map(row => ({
          id: row.id,
          name: row.name,
          address: row.address
        }))
      };
    } catch (err) {
      console.error("TenantModel.getPreferredOptions error:", err);
      return { sharingTypes: [], roomTypes: [], properties: [] };
    }
  },

  async getOccupationalOptions() {
    try {
      const [rows] = await pool.query(
        "SELECT DISTINCT occupation_category FROM tenants WHERE occupation_category IS NOT NULL AND occupation_category != '' ORDER BY occupation_category"
      );
      return rows.map(row => row.occupation_category);
    } catch (err) {
      console.error("TenantModel.getOccupationalOptions error:", err);
      return [];
    }
  },

  async getCityOptions() {
    try {
      const [rows] = await pool.query(
        "SELECT DISTINCT city FROM tenants WHERE city IS NOT NULL AND city != '' ORDER BY city"
      );
      return rows.map(row => row.city);
    } catch (err) {
      console.error("TenantModel.getCityOptions error:", err);
      return [];
    }
  },

  async getStateOptions() {
    try {
      const [rows] = await pool.query(
        "SELECT DISTINCT state FROM tenants WHERE state IS NOT NULL AND state != '' ORDER BY state"
      );
      return rows.map(row => row.state);
    } catch (err) {
      console.error("TenantModel.getStateOptions error:", err);
      return [];
    }
  }
};

module.exports = TenantModel;