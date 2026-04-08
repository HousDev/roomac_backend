
const pool = require("../config/db");

const TenantDetailsModel = {
async getById(tenantId) {
  try {
    
    const [rows] = await pool.query(
      `
      SELECT 
        t.id,
        t.salutation,
        t.full_name,
        t.email,
        t.phone,
        t.gender,
        t.occupation, 
        t.occupation_category,
        t.exact_occupation,
        t.is_active,  
        t.address,
        t.city,
        t.state,
        t.pincode,
        t.photo_url,
        t.check_in_date,
        t.lockin_period_months,
        t.lockin_penalty_amount,
        t.lockin_penalty_type,
        t.notice_period_days,
        t.notice_penalty_amount,
        t.notice_penalty_type,
        t.emergency_contact_name,
        t.emergency_contact_phone,
        t.emergency_contact_relation,
        t.preferred_sharing,
        t.preferred_room_type,
        t.preferred_property_id,
        t.id_proof_url,
t.address_proof_url,
t.id_proof_type,
t.id_proof_number,
t.address_proof_type,
t.address_proof_number,
t.additional_documents,  
t.aadhar_number,
t.pan_number,
t.country_code,
t.work_mode,
t.shift_timing,
t.organization,
t.years_of_experience,
t.monthly_income,
t.course_duration,
t.student_id,
t.portfolio_url,
t.employee_id,

t.partner_salutation,
t.partner_country_code,
t.partner_full_name,
t.partner_phone,
DATE_FORMAT(t.partner_date_of_birth, '%Y-%m-%d') as partner_date_of_birth,
DATE_FORMAT(t.date_of_birth, '%Y-%m-%d') as date_of_birth,
t.partner_email,
t.partner_gender,
t.partner_address,
t.partner_occupation,
t.partner_organization,
t.partner_relationship,
t.partner_id_proof_type,
    t.partner_id_proof_number,
    t.partner_id_proof_url,
    t.partner_address_proof_type,
    t.partner_address_proof_number,
    t.partner_address_proof_url,
    t.partner_photo_url,
    t.is_couple_booking,
    t.couple_id,


        
        -- Bed Assignment 
        ba.id as bed_assignment_id,
        ba.room_id,
        ba.bed_number,
        ba.bed_type,           
        ba.tenant_rent,         
        ba.is_couple,           
        ba.created_at as bed_assigned_at,
        
        -- Room Details
        r.room_number,
        r.floor,
        r.room_type,
        r.sharing_type,     
        r.rent_per_bed,
        
        -- Property Details - Using correct column names
        p.id as property_id,
        p.name as property_name,
        p.address as property_address,
        p.state as property_state,        -- 'state' column exists
        p.city_id as property_city_id,    -- 'city_id' column exists
        p.area as property_area,           -- 'area' column exists
        p.property_manager_name,
        p.property_manager_phone,
        p.property_manager_email
        
      FROM tenants t
      LEFT JOIN bed_assignments ba ON ba.tenant_id = t.id AND ba.is_available = 0
      LEFT JOIN rooms r ON r.id = ba.room_id
      LEFT JOIN properties p ON p.id = r.property_id
      WHERE t.id = ? 
        AND t.deleted_at IS NULL
      `,
      [tenantId]
    );


    if (!rows || rows.length === 0) {
      return null;
    }

    const tenantData = rows[0];
    
    // CRITICAL: Log exactly what we're returning
    

    return tenantData;
  } catch (error) {
    console.error('❌ Error in getById:', error);
    throw error;
  }
},

 async updateProfile(tenantId, updateData) {
  try {
    console.log('📝 Updating profile for tenant:', tenantId);
    
    // ALLOWED FIELDS - All partner fields are OPTIONAL
    const allowedFields = [
      // Basic info
      'full_name', 'phone', 'country_code', 'date_of_birth', 'gender',
      // Occupation
      'occupation', 'occupation_category', 'exact_occupation',
      'organization', 'work_mode', 'shift_timing', 'years_of_experience',
  'monthly_income', 'course_duration', 'student_id', 'portfolio_url', 'employee_id',
      // Address
      'address', 'city', 'state', 'pincode',
      // Preferences
      'preferred_sharing', 'preferred_room_type',
      // Emergency contact
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
      // Email
      'email',
      // Partner fields - ALL OPTIONAL
      'partner_salutation', 'partner_country_code','partner_full_name', 'partner_phone', 'partner_email', 'partner_gender',
      'partner_date_of_birth', 'partner_address', 'partner_occupation',
      'partner_organization', 'partner_relationship',

      'id_proof_type', 'id_proof_number', 'address_proof_type', 'address_proof_number',
      'partner_id_proof_type', 'partner_id_proof_number',
      'partner_address_proof_type', 'partner_address_proof_number',
      'partner_id_proof_url', 'partner_address_proof_url', 'partner_photo_url'
    ];
    
    // Filter and clean data - convert empty strings to NULL for database
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        let value = updateData[key];
        
        // Convert empty strings to NULL (especially important for partner fields)
        if (value === '' || value === null || value === undefined) {
          value = null;
        }
        
        // Only add if value is not undefined
        if (updateData[key] !== undefined) {
          filteredData[key] = value;
        }
      }
    });

    console.log('📝 Fields to update:', Object.keys(filteredData));

    if (Object.keys(filteredData).length === 0) {
      console.log('⚠️ No fields to update');
      return true; // Return true as no error, just nothing to update
    }

    // Build SET clause
    const setClause = Object.keys(filteredData)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.values(filteredData);
    values.push(tenantId);

    const [result] = await pool.query(
      `UPDATE tenants SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      values
    );

    console.log('✅ Update successful:', result.affectedRows > 0);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('❌ Error in updateProfile:', error);
    throw error;
  }
},


  async getAdditionalDocuments(tenantId) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        id_proof_url,
        address_proof_url,
        photo_url,
        additional_documents
      FROM tenants
      WHERE id = ? AND deleted_at IS NULL`,
      [tenantId]
    );

    if (!rows || rows.length === 0) return [];

    const tenant = rows[0];

    // Parse additional_documents JSON if needed
    let additionalDocs = [];
    if (tenant.additional_documents) {
      try {
        additionalDocs = typeof tenant.additional_documents === 'string'
          ? JSON.parse(tenant.additional_documents)
          : tenant.additional_documents;
      } catch (e) {
        additionalDocs = [];
      }
    }

    return {
      id_proof_url: tenant.id_proof_url,
      address_proof_url: tenant.address_proof_url,
      photo_url: tenant.photo_url,
      additional_documents: additionalDocs
    };
  } catch (error) {
    console.error('❌ Error in getAdditionalDocuments:', error);
    throw error;
  }
}
};

module.exports = TenantDetailsModel;