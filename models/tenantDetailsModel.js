
const pool = require("../config/db");

const TenantDetailsModel = {
async getById(tenantId) {
  try {
    console.log('🔍 Fetching simplified tenant details for ID:', tenantId);
    
    const [rows] = await pool.query(
      `
      SELECT 
        t.id,
        t.salutation,
        t.full_name,
        t.email,
        t.phone,
        t.date_of_birth,
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
t.additional_documents,  

        
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

    console.log('✅ Query executed, rows found:', rows.length);

    if (!rows || rows.length === 0) {
      return null;
    }

    const tenantData = rows[0];
    
    // CRITICAL: Log exactly what we're returning
    console.log('\n📦 FINAL DATA BEING RETURNED:');
    console.log('room_id:', tenantData.room_id);
    console.log('room_number:', tenantData.room_number);
    console.log('bed_number:', tenantData.bed_number);
    console.log('bed_type:', tenantData.bed_type);
    console.log('tenant_rent:', tenantData.tenant_rent);
    console.log('is_couple:', tenantData.is_couple);
    console.log('bed_assigned_at:', tenantData.bed_assigned_at);
    console.log('property_name:', tenantData.property_name);
    console.log('property_address:', tenantData.property_address);
    console.log('property_state:', tenantData.property_state);
    console.log('property_city_id:', tenantData.property_city_id);
    console.log('property_area:', tenantData.property_area);
    console.log('property_manager_name:', tenantData.property_manager_name);
    console.log('property_manager_phone:', tenantData.property_manager_phone);
    console.log('rent_per_bed:', tenantData.rent_per_bed);
    console.log('================================\n');

    return tenantData;
  } catch (error) {
    console.error('❌ Error in getById:', error);
    throw error;
  }
},

  async updateProfile(tenantId, updateData) {
    try {
      console.log('📝 Updating profile for tenant ID:', tenantId);
      
      const allowedFields = [
        'full_name', 'phone', 'country_code', 'date_of_birth', 'gender',
        'occupation', 'occupation_category', 'exact_occupation',
        'address', 'city', 'state', 'pincode',
        'preferred_sharing', 'preferred_room_type',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
        'email'
      ];
      
      // Filter only allowed fields
      const filteredData = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No valid fields to update');
      }

      const setClause = Object.keys(filteredData)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.values(filteredData);
      values.push(tenantId);

      const [result] = await pool.query(
        `UPDATE tenants SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        values
      );

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