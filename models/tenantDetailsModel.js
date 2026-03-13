// const pool = require("../config/db");

// const TenantDetailsModel = {
//   async getById(tenantId) {
//     try {
//       console.log('🔍 Fetching tenant details for ID:', tenantId);
      
//       const [rows] = await pool.query(
//         `
//         SELECT 
//           -- ===== TENANT PERSONAL INFO =====
//           t.id,
//           t.full_name,
//           t.email,
//           t.phone,
//           t.country_code,
//           t.date_of_birth,
//           t.gender,
//           t.occupation,
//           t.occupation_category,
//           t.exact_occupation,
//           t.is_active,
//           t.portal_access_enabled,
//           t.created_at,
//           t.updated_at,
          
//           -- ===== TENANT ADDRESS INFO =====
//           t.address,
//           t.city,
//           t.state,
//           t.pincode,
          
//           -- ===== EMERGENCY CONTACT INFO =====
//           t.emergency_contact_name,
//           t.emergency_contact_phone,
//           t.emergency_contact_relation,
          
//           -- ===== TENANT DOCUMENTS =====
//           t.id_proof_url,
//           t.address_proof_url,
//           t.photo_url,
//           t.additional_documents,
          
//           -- ===== TENANT PREFERENCES =====
//           t.preferred_sharing,
//           t.preferred_room_type,
//           t.preferred_property_id,
          
//           -- ===== BED ASSIGNMENT DETAILS =====
//           ba.room_id,
//           ba.bed_number,
//           ba.tenant_gender,
//           ba.is_available,
//           ba.created_at as bed_assigned_at,
          
//           -- ===== ROOM DETAILS =====
//           r.room_number,
//           r.floor,
//           r.room_type,
//           r.rent_per_bed,
          
//           -- ===== PROPERTY DETAILS =====
//           p.id as property_id,
//           p.name as property_name,
//           p.address as property_address,
//           p.city_id as property_city,
//           p.state as property_state,
//           p.property_manager_name,
//           p.property_manager_phone
          
//         FROM tenants t
        
//         -- Get bed assignment
//         LEFT JOIN bed_assignments ba ON ba.tenant_id = t.id 
        
//         -- Get room details
//         LEFT JOIN rooms r ON r.id = ba.room_id
        
//         -- Get property details
//         LEFT JOIN properties p ON p.id = r.property_id
        
//         WHERE t.id = ? 
//           AND t.deleted_at IS NULL
//         `,
//         [tenantId]
//       );

//       console.log('✅ SQL Query executed, rows found:', rows.length);

//       if (!rows || rows.length === 0) {
//         console.log('❌ No tenant found with ID:', tenantId);
//         return null;
//       }

//       const tenantData = rows[0];
      
//       // Debug log
//       console.log('\n📊 ===== DOCUMENTS DEBUG INFO =====');
//       console.log('📄 ID Proof URL:', tenantData.id_proof_url);
//       console.log('📄 Address Proof URL:', tenantData.address_proof_url);
//       console.log('📸 Photo URL:', tenantData.photo_url);
//       console.log('📁 Additional Documents:', tenantData.additional_documents);
//       console.log('====================================\n');

//       // Parse additional_documents if it exists and is not null
//       if (tenantData.additional_documents) {
//         try {
//           if (typeof tenantData.additional_documents === 'string') {
//             // Try to parse as JSON
//             const parsed = JSON.parse(tenantData.additional_documents);
//             tenantData.additional_documents = parsed;
//           }
//           // If it's already an object/array, keep as is
//         } catch (e) {
//           console.error('❌ Error parsing additional_documents:', e.message);
//           console.error('Raw additional_documents:', tenantData.additional_documents);
//           tenantData.additional_documents = [];
//         }
//       } else {
//         // If it's null or undefined, set to empty array
//         tenantData.additional_documents = [];
//       }

//       return tenantData;
//     } catch (error) {
//       console.error('❌ Error in getById:', error.message);
//       console.error('SQL Message:', error.sqlMessage);
//       throw error;
//     }
//   },

//   async updateProfile(tenantId, updateData) {
//     try {
//       console.log('📝 Updating profile for tenant ID:', tenantId);
      
//       const allowedFields = [
//         'full_name', 'phone', 'country_code', 'date_of_birth', 'gender',
//         'occupation', 'occupation_category', 'exact_occupation',
//         'address', 'city', 'state', 'pincode',
//         'preferred_sharing', 'preferred_room_type',
//         'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'
//       ];
      
//       // Filter only allowed fields
//       const filteredData = {};
//       Object.keys(updateData).forEach(key => {
//         if (allowedFields.includes(key)) {
//           filteredData[key] = updateData[key];
//         }
//       });

//       if (Object.keys(filteredData).length === 0) {
//         throw new Error('No valid fields to update');
//       }

//       const setClause = Object.keys(filteredData)
//         .map(key => `${key} = ?`)
//         .join(', ');
      
//       const values = Object.values(filteredData);
//       values.push(tenantId);

//       const [result] = await pool.query(
//         `UPDATE tenants SET ${setClause}, updated_at = NOW() WHERE id = ?`,
//         values
//       );

//       return result.affectedRows > 0;
//     } catch (error) {
//       console.error('❌ Error in updateProfile:', error);
//       throw error;
//     }
//   }
// };

// module.exports = TenantDetailsModel;


// models/tenantDetailModel.js
// models/tenantDetailModel.js
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
  }
};

module.exports = TenantDetailsModel;