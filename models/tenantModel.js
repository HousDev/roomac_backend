// tenantModel.js 
const pool = require("../config/db");

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

// In tenantModel.js - Update the findAll method SELECT clause
// In tenantModel.js - Update findAll method with simplified vacate filter

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
  includeDeleted = false,
  vacate_status, // 'vacated' or 'active' or undefined
}) {
  try {
    const offset = (page - 1) * pageSize;
    const where = [];
    const params = [];

    // Add soft delete filter
    if (!includeDeleted) {
      where.push("t.deleted_at IS NULL");
    }

    // SIMPLIFIED VACATE FILTER - Just get tenant IDs from vacate_records
    if (vacate_status === 'vacated') {
      // Only show tenants that exist in vacate_records table
      where.push("t.id IN (SELECT DISTINCT tenant_id FROM vacate_records)");
    } else if (vacate_status === 'active') {
      // Show tenants that are NOT in vacate_records table AND have active bed assignments
      where.push("t.id NOT IN (SELECT DISTINCT tenant_id FROM vacate_records)");
      where.push("EXISTS (SELECT 1 FROM bed_assignments ba WHERE ba.tenant_id = t.id AND ba.is_available = FALSE)");
    }
    // If vacate_status is undefined, show all tenants (no filter)

    // Existing filters
    if (search) {
      where.push("(t.full_name LIKE ? OR t.email LIKE ? OR t.phone LIKE ? OR t.emergency_contact_name LIKE ? OR t.emergency_contact_phone LIKE ?)");
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }
    if (gender) {
      where.push("t.gender = ?");
      params.push(gender);
    }
    if (occupation_category) {
      where.push("t.occupation_category = ?");
      params.push(occupation_category);
    }
    if (typeof is_active !== "undefined" && is_active !== null) {
      where.push("t.is_active = ?");
      params.push(is_active ? 1 : 0);
    }
    if (typeof portal_access_enabled !== "undefined" && portal_access_enabled !== null) {
      where.push("t.portal_access_enabled = ?");
      params.push(portal_access_enabled ? 1 : 0);
    }
    if (city) {
      where.push("t.city LIKE ?");
      params.push(`%${city}%`);
    }
    if (state) {
      where.push("t.state LIKE ?");
      params.push(`%${state}%`);
    }
    if (preferred_sharing) {
      where.push("t.preferred_sharing = ?");
      params.push(preferred_sharing);
    }
    if (typeof has_credentials !== "undefined" && has_credentials !== null) {
      if (has_credentials) {
        where.push("EXISTS (SELECT 1 FROM tenant_credentials tc WHERE tc.tenant_id = t.id)");
      } else {
        where.push("NOT EXISTS (SELECT 1 FROM tenant_credentials tc WHERE tc.tenant_id = t.id)");
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // SIMPLIFIED SQL - Don't need to join with vacate_records
    const sql = `
      SELECT 
        t.*,
        -- Include all occupation fields explicitly
        t.occupation_category,
        t.exact_occupation,
        t.occupation,
        t.organization,
        t.years_of_experience,
        t.monthly_income,
        t.course_duration,
        t.student_id,
        t.employee_id,
        t.portfolio_url,
        t.work_mode,
        t.shift_timing,
        -- Bed assignment fields
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

    console.log('SQL query with vacate filter:', sql);
    console.log('Vacate filter applied:', vacate_status);
    console.log('Parameters:', [...params, parseInt(pageSize, 10), parseInt(offset, 10)]);

    const [rows] = await pool.query(
      sql,
      [...params, parseInt(pageSize, 10), parseInt(offset, 10)]
    );

    // Count query also needs same filters
    const countSql = `
      SELECT COUNT(DISTINCT t.id) as total 
      FROM tenants t
      ${whereSql}
    `;
    
    const [countRows] = await pool.query(countSql, params);
    
    const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

    // Process rows
    const processedRows = rows.map(row => {
      const tenant = parseTenant(row);
      
      // We don't need to add vacate record here - keep it simple
      // The vacate information can be fetched separately when viewing tenant details
      
      return tenant;
    });

    return { rows: processedRows, total };
  } catch (err) {
    console.error("TenantModel.findAll error:", err);
    throw err;
  }
},

// Add a separate method to get vacate records for a specific tenant
async getVacateRecordsByTenantId(tenantId) {
  try {
    const [records] = await pool.query(
      `SELECT * FROM vacate_records WHERE tenant_id = ? ORDER BY created_at DESC`,
      [tenantId]
    );
    return records;
  } catch (err) {
    console.error("TenantModel.getVacateRecordsByTenantId error:", err);
    return [];
  }
},

// Add method to check if tenant has vacated
async hasTenantVacated(tenantId) {
  try {
    const [result] = await pool.query(
      `SELECT COUNT(*) as count FROM vacate_records WHERE tenant_id = ?`,
      [tenantId]
    );
    return result[0].count > 0;
  } catch (err) {
    console.error("TenantModel.hasTenantVacated error:", err);
    return false;
  }
},

  // In TenantModel.findById() - ensure it includes:
// In tenantModel.js - Update the findById method
async findById(id) {
  try {
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
    
    if (!rows[0]) return null;
    
    const tenant = rows[0];
    
    // Parse additional_documents if it exists
    if (tenant.additional_documents) {
      try {
        if (typeof tenant.additional_documents === 'string') {
          tenant.additional_documents = JSON.parse(tenant.additional_documents);
        }
      } catch (e) {
        console.error('Error parsing additional_documents:', e);
        tenant.additional_documents = [];
      }
    } else {
      tenant.additional_documents = [];
    }
    
    // Format dates
    if (tenant.date_of_birth) {
      const date = new Date(tenant.date_of_birth);
      tenant.date_of_birth = date.toISOString().split('T')[0];
    }
    
    if (tenant.check_in_date) {
      const date = new Date(tenant.check_in_date);
      tenant.check_in_date = date.toISOString().split('T')[0];
    }
    
    console.log('Tenant fetched with all fields:', {
      id: tenant.id,
      work_mode: tenant.work_mode,
      shift_timing: tenant.shift_timing,
      occupation_category: tenant.occupation_category,
      exact_occupation: tenant.exact_occupation,
      organization: tenant.organization,
      years_of_experience: tenant.years_of_experience,
      monthly_income: tenant.monthly_income
    });
    
    return tenant;
  } catch (err) {
    console.error("TenantModel.findById error:", err);
    throw err;
  }
},

  

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

  
  // In tenantModel.js - Update the create method
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
      organization,
      years_of_experience,
      monthly_income,
      course_duration,
      student_id,
      employee_id,
      portfolio_url,
      work_mode,
      shift_timing,
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
      // Lock-in and notice period fields
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
      organization || null,
      years_of_experience || null,
      monthly_income || null,
      course_duration || null,
      student_id || null,
      employee_id || null,
      portfolio_url || null,
      work_mode || null,
      shift_timing || null,
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
      check_in_date ? (typeof check_in_date === 'string' && check_in_date.includes('T') ? check_in_date.split('T')[0] : check_in_date) : null,
      emergency_contact_name || null,
      emergency_contact_phone || null,
      emergency_contact_relation || null,
      additionalDocsJson,
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
      occupation_category: values[7],
      exact_occupation: values[8],
      occupation: values[9],
      organization: values[10],
      years_of_experience: values[11],
      monthly_income: values[12],
      course_duration: values[13],
      student_id: values[14],
      employee_id: values[15],
      portfolio_url: values[16],
      work_mode: values[17],
      shift_timing: values[18],
      property_id: values[31],
      lockin_months: values[40],
      notice_days: values[43]
    });

    // UPDATED SQL to include ALL occupation fields
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
  organization,
  years_of_experience,
  monthly_income,
  course_duration,
  student_id,
  employee_id,
  portfolio_url,
  work_mode,
  shift_timing,
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
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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


// In tenantModel.js - Update the update method
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
        const date = new Date(payload.check_in_date);
        if (!isNaN(date.getTime())) {
          payload.check_in_date = date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Error formatting check_in_date:', e);
      }
    }

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
    
    // Occupation fields - ALL of them
    setIf("occupation_category", payload.occupation_category);
    setIf("exact_occupation", payload.exact_occupation);
    setIf("occupation", payload.occupation);
    setIf("organization", payload.organization);
    setIf("years_of_experience", payload.years_of_experience);
    setIf("monthly_income", payload.monthly_income);
    setIf("course_duration", payload.course_duration);
    setIf("student_id", payload.student_id);
    setIf("employee_id", payload.employee_id);
    setIf("portfolio_url", payload.portfolio_url);
    setIf("work_mode", payload.work_mode);
    setIf("shift_timing", payload.shift_timing);
    
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
    setIf("property_id", payload.property_id);
    setIf("check_in_date", payload.check_in_date);
    
    // Lock-in and notice period fields
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


// Add soft delete method
async softDelete(id) {
  try {
    const [result] = await pool.query(
      "UPDATE tenants SET deleted_at = NOW() WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  } catch (err) {
    console.error("TenantModel.softDelete error:", err);
    throw err;
  }
},

// Add restore method
async restore(id) {
  try {
    const [result] = await pool.query(
      "UPDATE tenants SET deleted_at = NULL WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  } catch (err) {
    console.error("TenantModel.restore error:", err);
    throw err;
  }
},

// Modify delete method to either soft delete or permanently delete
async delete(id, permanent = false) {
  try {
    if (permanent) {
      // Permanent delete
      const [result] = await pool.query("DELETE FROM tenants WHERE id = ?", [id]);
      return result.affectedRows > 0;
    } else {
      // Soft delete
      return this.softDelete(id);
    }
  } catch (err) {
    console.error("TenantModel.delete error:", err);
    throw err;
  }
},

// Add method to get deleted tenants
async getDeletedTenants() {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tenants WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
    );
    return rows.map(parseTenant);
  } catch (err) {
    console.error("TenantModel.getDeletedTenants error:", err);
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
  },


// Complete corrected methods for tenantModel.js

// Check if tenant exists
// In tenantModel.js - Update findByEmailOrPhone

async findByEmailOrPhone(email, phone, includeDeleted = false) {
  let query = 'SELECT * FROM tenants WHERE email = ? OR phone = ?';
  const params = [email, phone];
  
  // If not including deleted, exclude soft-deleted records
  if (!includeDeleted) {
    query += ' AND deleted_at IS NULL';
  }
  
  try {
    const [rows] = await pool.query(query, params);
    return rows[0];
  } catch (error) {
    console.error("TenantModel.findByEmailOrPhone error:", error);
    throw error;
  }
},

// Create new tenant from booking
async createFromBooking(bookingData, roomData, propertyData) {
  // Generate a unique email if not exists
  let email = bookingData.email;
  if (!email || email === '') {
    email = `guest_${Date.now()}@temp.com`;
  }

  const query = `
    INSERT INTO tenants (
      salutation, full_name, email, phone, gender, 
      property_id, room_id, bed_id, check_in_date,
      preferred_property_id, preferred_sharing,
      is_active, portal_access_enabled,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  // Map sharing type from room data
  let sharingType = 'double';
  if (roomData.sharing_type) {
    if (roomData.sharing_type.toString().includes('1') || roomData.sharing_type === 'single') {
      sharingType = 'single';
    } else if (roomData.sharing_type.toString().includes('2') || roomData.sharing_type === 'double') {
      sharingType = 'double';
    } else if (roomData.sharing_type.toString().includes('3') || roomData.sharing_type === 'triple') {
      sharingType = 'triple';
    }
  }

  const values = [
    bookingData.salutation || 'Mr.',
    bookingData.fullName,
    email,
    bookingData.phone,
    bookingData.gender || 'Other',
    bookingData.propertyId,
    bookingData.roomId,
    null, // bed_id
    bookingData.moveInDate || bookingData.checkInDate || null,
    bookingData.propertyId,
    sharingType,
    1, // is_active
    0 // portal_access_enabled
  ];

  try {
    const [result] = await pool.query(query, values);
    return result.insertId;
  } catch (error) {
    console.error("TenantModel.createFromBooking error:", error);
    throw error;
  }
},

// Get bookings for tenant IDs - FIXED VERSION
async getBookingsForTenantIds(tenantIds = []) {
  try {
    if (!tenantIds || !tenantIds.length) return [];
    
    const [rows] = await pool.query(
      `SELECT 
        b.id, 
        b.tenant_name,
        b.email,
        b.phone,
        b.status, 
        b.monthly_rent,
        b.booking_type,
        b.check_in_date,
        b.check_out_date,
        b.move_in_date,
        b.total_amount,
        b.payment_status,
        b.created_at,
        p.name as property_name, 
        p.city_id as property_city_id,
        p.state as property_state,
        r.room_number, 
        r.room_type, 
        r.sharing_type, 
        r.floor
       FROM bookings b
       LEFT JOIN properties p ON p.id = b.property_id
       LEFT JOIN rooms r ON r.id = b.room_id
       WHERE b.email IN (
         SELECT email FROM tenants WHERE id IN (?)
       ) OR b.phone IN (
         SELECT phone FROM tenants WHERE id IN (?)
       )
       ORDER BY b.created_at DESC`,
      [tenantIds, tenantIds]
    );
    return rows;
  } catch (err) {
    console.error("TenantModel.getBookingsForTenantIds error:", err);
    return [];
  }
},

// Get payments for tenant IDs - FIXED VERSION (removed month/year)
async getPaymentsForTenantIds(tenantIds = []) {
  try {
    if (!tenantIds || !tenantIds.length) return [];
    
    const [rows] = await pool.query(
      `SELECT 
        id, 
        tenant_id, 
        amount, 
        payment_date, 
        payment_mode, 
        status, 
        transaction_id, 
        notes, 
        created_at,
        updated_at
       FROM payments 
       WHERE tenant_id IN (?)
       ORDER BY payment_date DESC`,
      [tenantIds]
    );
    return rows;
  } catch (err) {
    console.error("TenantModel.getPaymentsForTenantIds error:", err);
    return [];
  }
},
};


module.exports = TenantModel;