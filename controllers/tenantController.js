const bcrypt = require("bcrypt");
const TenantModel = require("../models/tenantModel");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");

const SALT_ROUNDS = 10;

const TenantController = {
  async list(req, res) {
    try {
      const page = parseInt(req.query.page || "1", 10);
      const pageSize = parseInt(req.query.pageSize || "50", 10);
      const search = req.query.search || "";
      const gender = req.query.gender || undefined;
      const occupation_category = req.query.occupation_category || undefined;
      const city = req.query.city || undefined;
      const state = req.query.state || undefined;
      const preferred_sharing = req.query.preferred_sharing || undefined;
      const preferred_room_type = req.query.preferred_room_type || undefined;
      const is_active = req.query.is_active !== undefined ? 
        (req.query.is_active === "true" || req.query.is_active === "1") : undefined;
      const portal_access_enabled = req.query.portal_access_enabled !== undefined ?
        (req.query.portal_access_enabled === "true" || req.query.portal_access_enabled === "1") : undefined;
      const has_credentials = req.query.has_credentials !== undefined ?
        (req.query.has_credentials === "true" || req.query.has_credentials === "1") : undefined;

      const result = await TenantModel.findAll({
        search,
        page,
        pageSize,
        gender,
        occupation_category,
        city,
        state,
        preferred_sharing,
        preferred_room_type,
        is_active,
        portal_access_enabled,
        has_credentials,
      });
      const tenantRows = result.rows;

      // get bookings, payments and credentials
      const tenantIds = tenantRows.map((t) => t.id);
      const bookings = tenantIds.length ? await TenantModel.getBookingsForTenantIds(tenantIds) : [];
      const payments = tenantIds.length ? await TenantModel.getPaymentsForTenantIds(tenantIds) : [];
      const credentials = tenantIds.length ? await TenantModel.getCredentialsByTenantIds(tenantIds) : [];

      // attach data
      const bookingsMap = {};
      bookings.forEach((b) => {
        if (!bookingsMap[b.tenant_id]) bookingsMap[b.tenant_id] = [];
        bookingsMap[b.tenant_id].push({
          id: b.id,
          status: b.status,
          monthly_rent: Number(b.monthly_rent || 0),
          properties: { 
            name: b.property_name || null,
            city: b.property_city || null,
            state: b.property_state || null
          },
          room: {
            room_number: b.room_number,
            room_type: b.room_type,
            sharing_type: b.sharing_type,
            floor: b.floor
          }
        });
      });

      const paymentsMap = {};
      payments.forEach((p) => {
        if (!paymentsMap[p.tenant_id]) paymentsMap[p.tenant_id] = [];
        paymentsMap[p.tenant_id].push({
          id: p.id,
          amount: Number(p.amount || 0),
          payment_date: p.payment_date,
          payment_method: p.payment_mode, 
          transaction_id: p.transaction_id,
          status: p.status,
          month: p.month,
          year: p.year,
          notes: p.notes,
          created_at: p.created_at
        });
      });

      const credMap = {};
      (credentials || []).forEach((c) => {
        credMap[c.tenant_id] = c;
      });

      const finalRows = tenantRows.map((t) => ({
        ...t,
        bookings: bookingsMap[t.id] || [],
        payments: paymentsMap[t.id] || [],
        has_credentials: !!credMap[t.id],
        credential_email: credMap[t.id] ? credMap[t.id].email : null,
      }));

      return res.json({
        success: true,
        data: finalRows,
        meta: { total: result.total, page, pageSize },
      });
    } catch (err) {
      console.error("TenantController.list error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch tenants" });
    }
  },

  // async getById(req, res) {
  //   try {
  //     const id = req.params.id;
  //     const tenant = await TenantModel.findById(id);
  //     if (!tenant)
  //       return res
  //         .status(404)
  //         .json({ success: false, message: "Tenant not found" });

  //     const bookings = await TenantModel.getBookingsForTenantIds([tenant.id]);
  //     const payments = await TenantModel.getPaymentsForTenantIds([tenant.id]);
  //     const credentials = await TenantModel.getCredentialsByTenantIds([tenant.id]);

  //     // Format bookings
  //     const formattedBookings = bookings.map(b => ({
  //       id: b.id,
  //       status: b.status,
  //       monthly_rent: Number(b.monthly_rent || 0),
  //       properties: { 
  //         name: b.property_name || null,
  //         city: b.property_city || null,
  //         state: b.property_state || null
  //       },
  //       room: {
  //         room_number: b.room_number,
  //         room_type: b.room_type,
  //         sharing_type: b.sharing_type,
  //         floor: b.floor
  //       }
  //     }));

  //     return res.json({
  //       success: true,
  //       data: {
  //         ...tenant,
  //         bookings: formattedBookings || [],
  //         payments: payments || [],
  //         has_credentials: credentials && credentials.length ? true : false,
  //         credential_email: credentials && credentials[0] ? credentials[0].email : null,
  //       },
  //     });
  //   } catch (err) {
  //     console.error("TenantController.getById error:", err);
  //     return res
  //       .status(500)
  //       .json({ success: false, message: "Failed to fetch tenant" });
  //   }
  // },

  async getById(req, res) {
  try {
    const id = req.params.id;
    const tenant = await TenantModel.findById(id);

    console.log('🔍 Tenant fetched:', {
      id: tenant.id,
      property_id: tenant.property_id,
      lockin_fields: {
        lockin_period_months: tenant.lockin_period_months,
        lockin_penalty_amount: tenant.lockin_penalty_amount,
        lockin_penalty_type: tenant.lockin_penalty_type
      },
      notice_fields: {
        notice_period_days: tenant.notice_period_days,
        notice_penalty_amount: tenant.notice_penalty_amount,
        notice_penalty_type: tenant.notice_penalty_type
      }
    });
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });

    // Get property details if property_id exists
    let propertyDetails = null;
    if (tenant.property_id) {
      propertyDetails = await getPropertyWithTerms(tenant.property_id);
    }

    const bookings = await TenantModel.getBookingsForTenantIds([tenant.id]);
    const payments = await TenantModel.getPaymentsForTenantIds([tenant.id]);
    const credentials = await TenantModel.getCredentialsByTenantIds([tenant.id]);

    // Format bookings
    const formattedBookings = bookings.map(b => ({
      id: b.id,
      status: b.status,
      monthly_rent: Number(b.monthly_rent || 0),
      properties: { 
        name: b.property_name || null,
        city: b.property_city || null,
        state: b.property_state || null
      },
      room: {
        room_number: b.room_number,
        room_type: b.room_type,
        sharing_type: b.sharing_type,
        floor: b.floor
      }
    }));

    return res.json({
      success: true,
      data: {
        ...tenant,
        property_details: propertyDetails, // Add property details
        bookings: formattedBookings || [],
        payments: payments || [],
        has_credentials: credentials && credentials.length ? true : false,
        credential_email: credentials && credentials[0] ? credentials[0].email : null,
      },
    });
  } catch (err) {
    console.error("TenantController.getById error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch tenant" });
  }
},

// async create(req, res) {
//   try {
//     console.log('=== CREATE TENANT START ===');
//     console.log('Body fields:', Object.keys(req.body || {}));
//     console.log('Files received:', req.files ? Object.keys(req.files) : 'No files');
    
//     const body = req.body || {};
    
//     // Validate required fields
//     if (!body.full_name) {
//       return res.status(400).json({ success: false, message: "Full name is required" });
//     }
//     if (!body.email) {
//       return res.status(400).json({ success: false, message: "Email is required" });
//     }
//     if (!body.phone) {
//       return res.status(400).json({ success: false, message: "Phone number is required" });
//     }
    
//     // Process uploaded files
//     const uploadedFiles = {};
//     const additionalDocs = [];
    
//     // Process main documents
//     if (req.files) {
//       // ID Proof
//       if (req.files.id_proof_url && req.files.id_proof_url[0]) {
//         uploadedFiles.id_proof_url = `/uploads/id_proofs/${req.files.id_proof_url[0].filename}`;
//       }
      
//       // Address Proof
//       if (req.files.address_proof_url && req.files.address_proof_url[0]) {
//         uploadedFiles.address_proof_url = `/uploads/address_proofs/${req.files.address_proof_url[0].filename}`;
//       }
      
//       // Photo
//       if (req.files.photo_url && req.files.photo_url[0]) {
//         uploadedFiles.photo_url = `/uploads/photos/${req.files.photo_url[0].filename}`;
//       }
      
//       // Process additional documents - look for fields starting with 'additional_'
//       Object.keys(req.files).forEach(field => {
//         if (field.startsWith('additional_documents_') || field.startsWith('additional_doc_')) {
//           req.files[field].forEach(file => {
//             additionalDocs.push({
//               filename: file.originalname,
//               url: `/uploads/additional_docs/${file.filename}`,
//               uploaded_at: new Date().toISOString()
//             });
//           });
//         }
//       });
//     }
    
//     console.log('Uploaded file URLs:', uploadedFiles);
//     console.log('Additional documents:', additionalDocs);
    
//     // Phone validation
//     const phoneRegex = /^[6-9]\d{9}$/;
//     if (body.phone && !phoneRegex.test(body.phone)) {
//       return res.status(400).json({ success: false, message: "Invalid Indian mobile number" });
//     }
    
//     // Emergency contact phone validation
//     if (body.emergency_contact_phone) {
//       if (!phoneRegex.test(body.emergency_contact_phone)) {
//         return res.status(400).json({ success: false, message: "Invalid emergency contact phone number" });
//       }
//     }
    
//     // Age validation
//     if (body.date_of_birth) {
//       const dob = new Date(body.date_of_birth);
//       if (isNaN(dob.getTime())) {
//         return res.status(400).json({ success: false, message: "Invalid date of birth" });
//       }
//       const today = new Date();
//       let age = today.getFullYear() - dob.getFullYear();
//       const monthDiff = today.getMonth() - dob.getMonth();
//       if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
//         age--;
//       }
//       if (age < 18) {
//         return res.status(400).json({ success: false, message: "Tenant must be at least 18 years old" });
//       }
//     }
    
//     // Handle preferred_property_id
//     let preferredPropertyId = body.preferred_property_id;
//     if (preferredPropertyId) {
//       preferredPropertyId = parseInt(preferredPropertyId, 10);
//       if (isNaN(preferredPropertyId)) {
//         preferredPropertyId = null;
//       }
//     } else {
//       preferredPropertyId = null;
//     }
    
//     // Prepare tenant data with emergency contact fields
//     const tenantData = {
//       full_name: body.full_name,
//       email: body.email,
//       phone: body.phone,
//       country_code: body.country_code || '+91',
//       gender: body.gender,
//       date_of_birth: body.date_of_birth,
//       occupation_category: body.occupation_category,
//       exact_occupation: body.exact_occupation,
//       occupation: body.occupation,
//       portal_access_enabled: body.portal_access_enabled === 'true' || body.portal_access_enabled === '1' || body.portal_access_enabled === true,
//       is_active: body.is_active === 'true' || body.is_active === '1' || body.is_active === true || true,
//       id_proof_url: uploadedFiles.id_proof_url,
//       address_proof_url: uploadedFiles.address_proof_url,
//       photo_url: uploadedFiles.photo_url,
//       address: body.address,
//       city: body.city,
//       state: body.state,
//       pincode: body.pincode,
//       preferred_sharing: body.preferred_sharing,
//       preferred_room_type: body.preferred_room_type,
//       preferred_property_id: preferredPropertyId,
//       // NEW EMERGENCY CONTACT FIELDS
//       emergency_contact_name: body.emergency_contact_name,
//       emergency_contact_phone: body.emergency_contact_phone,
//       emergency_contact_relation: body.emergency_contact_relation,
//       // ADDITIONAL DOCUMENTS
//       additional_documents: additionalDocs
//     };
    
//     console.log('Creating tenant with data:', Object.keys(tenantData));
    
//     // Create tenant
//     const tenantId = await TenantModel.create(tenantData);
    
//     // Create credentials if requested
//     if (body.password && (body.create_credentials === "true" || body.create_credentials === true)) {
//       try {
//         const password_hash = await bcrypt.hash(body.password, 10);
//         await TenantModel.createCredential({
//           tenant_id: tenantId,
//           email: body.email,
//           password_hash,
//         });
//         console.log('Credentials created for tenant:', tenantId);
//       } catch (credErr) {
//         console.error("Failed to create credentials:", credErr.message);
//       }
//     }
    
//     return res.status(201).json({
//       success: true,
//       message: "Tenant created successfully",
//       id: tenantId,
//       file_urls: uploadedFiles,
//       additional_documents: additionalDocs
//     });
    
//   } catch (err) {
//     console.error("TenantController.create error:", err);
    
//     // Clean up uploaded files on error
//     if (req.files) {
//       Object.values(req.files).forEach(fileArray => {
//         if (fileArray && fileArray.length > 0) {
//           fileArray.forEach(file => {
//             if (file.path && fs.existsSync(file.path)) {
//               try {
//                 fs.unlinkSync(file.path);
//               } catch (unlinkErr) {
//                 console.error('Failed to delete file:', unlinkErr);
//               }
//             }
//           });
//         }
//       });
//     }
    
//     if (err.code === 'ER_DUP_ENTRY') {
//       return res.status(400).json({ success: false, message: "Email already exists" });
//     }
//     return res
//       .status(500)
//       .json({ success: false, message: "Failed to create tenant: " + err.message });
//   }
// },

async create(req, res) {
  try {
    const body = req.body || {};
    const files = req.files || {};

    console.log('=== CREATE TENANT START ===');
    console.log('Body fields:', Object.keys(body));
    console.log('Files received:', Object.keys(files));

    // Process uploaded files
    const uploadedFiles = {};
    
    // Process main documents
    const processMainDocument = (fieldName, folder) => {
      if (files[fieldName] && files[fieldName][0]) {
        const file = files[fieldName][0];
        uploadedFiles[fieldName] = `/uploads/${folder}/${file.filename}`;
        return true;
      }
      return false;
    };
    
    processMainDocument('id_proof_url', 'id_proofs');
    processMainDocument('address_proof_url', 'address_proofs');
    processMainDocument('photo_url', 'photos');
    
    // Process additional documents
    let additionalDocs = [];
    
    if (files['additional_documents[]']) {
      const additionalFiles = Array.isArray(files['additional_documents[]']) 
        ? files['additional_documents[]'] 
        : [files['additional_documents[]']];
      
      console.log(`Found ${additionalFiles.length} additional files`);
      
      additionalDocs = additionalFiles.map(file => ({
        filename: file.originalname,
        url: `/uploads/additional_docs/${file.filename}`,
        uploaded_at: new Date().toISOString(),
        document_type: 'Additional',
        file_size: file.size,
        file_mimetype: file.mimetype
      }));
      
      console.log('Processed additional documents:', additionalDocs);
    }
    
    // Also check for other patterns
    Object.keys(files).forEach(field => {
      if (field.startsWith('additional_documents') && field !== 'additional_documents[]') {
        const fileArray = Array.isArray(files[field]) ? files[field] : [files[field]];
        
        fileArray.forEach(file => {
          if (file && file.originalname) {
            // Check if this file already exists
            const exists = additionalDocs.some(doc => doc.filename === file.originalname);
            if (!exists) {
              additionalDocs.push({
                filename: file.originalname,
                url: `/uploads/additional_docs/${file.filename}`,
                uploaded_at: new Date().toISOString(),
                document_type: 'Additional',
                file_size: file.size,
                file_mimetype: file.mimetype
              });
            }
          }
        });
      }
    });
    
    console.log('Uploaded file URLs:', uploadedFiles);
    console.log('Additional documents:', additionalDocs);

    // Parse numeric fields for lock-in and notice period
    const parseNumber = (value, defaultValue = 0) => {
      if (value === undefined || value === null || value === '') return defaultValue;
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    // Create a clean tenant data object with only fields that belong in tenants table
    const tenantData = {
      // Personal info
      salutation: body.salutation,
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      country_code: body.country_code || '+91',
      gender: body.gender,
      date_of_birth: body.date_of_birth,
      
      // Occupation
      occupation_category: body.occupation_category,
      exact_occupation: body.exact_occupation,
      occupation: body.occupation,
      
      // Status
      portal_access_enabled: body.portal_access_enabled === 'true' || body.portal_access_enabled === true || false,
      is_active: body.is_active === undefined || body.is_active === '' ? true : 
                 (body.is_active === 'true' || body.is_active === true),
      
      // Address
      address: body.address,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      
      // Preferences
      preferred_sharing: body.preferred_sharing,
      preferred_room_type: body.preferred_room_type,
      preferred_property_id: body.preferred_property_id ? parseInt(body.preferred_property_id) : null,
      property_id: body.property_id ? parseInt(body.property_id) : null,
      check_in_date: body.check_in_date,
      
      // Emergency contacts
      emergency_contact_name: body.emergency_contact_name,
      emergency_contact_phone: body.emergency_contact_phone,
      emergency_contact_relation: body.emergency_contact_relation,
      
      // Lock-in period fields
      lockin_period_months: parseNumber(body.lockin_period_months),
      lockin_penalty_amount: parseNumber(body.lockin_penalty_amount),
      lockin_penalty_type: body.lockin_penalty_type || 'fixed',
      
      // Notice period fields
      notice_period_days: parseNumber(body.notice_period_days),
      notice_penalty_amount: parseNumber(body.notice_penalty_amount),
      notice_penalty_type: body.notice_penalty_type || 'fixed',
      
      // Files
      ...uploadedFiles,
      additional_documents: additionalDocs
    };

    // Validate required fields
    const required = ['full_name', 'email', 'phone'];
    const missing = required.filter(field => !tenantData[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // Validate phone
    if (tenantData.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(tenantData.phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Indian mobile number"
        });
      }
    }
    
    // Validate emergency contact phone if provided
    if (tenantData.emergency_contact_phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(tenantData.emergency_contact_phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid emergency contact phone number"
        });
      }
    }

    console.log('Creating tenant with data keys:', Object.keys(tenantData));
    console.log('Tenant data sample:', {
      full_name: tenantData.full_name,
      email: tenantData.email,
      property_id: tenantData.property_id,
      lockin_fields: {
        months: tenantData.lockin_period_months,
        amount: tenantData.lockin_penalty_amount,
        type: tenantData.lockin_penalty_type
      }
    });

    // Create tenant
    const tenantId = await TenantModel.create(tenantData);
    console.log('Tenant created with ID:', tenantId);

    // Create credentials if password is provided
    if (body.password && (body.create_credentials === "true" || body.create_credentials === true)) {
      try {
        const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
        await TenantModel.createCredential({
          tenant_id: tenantId,
          email: body.email,
          password_hash,
        });
        console.log('Credentials created for new tenant:', tenantId);
      } catch (credErr) {
        console.error("Failed to create credentials:", credErr);
        // Continue even if credential creation fails
      }
    }

    return res.json({
      success: true,
      message: "Tenant created successfully",
      tenant_id: tenantId,
      additional_documents: additionalDocs
    });
  } catch (err) {
    console.error("TenantController.create error:", err);
    
    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        if (fileArray && fileArray.length > 0) {
          fileArray.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to create tenant: " + err.message
    });
  }
},



  // async update(req, res) {
  //   try {
  //     const id = req.params.id;
  //     const body = req.body || {};
  //     const files = req.files || {};

  //     console.log('Update tenant id:', id);
  //     console.log('Update tenant body:', body);
  //     console.log('Update tenant files:', Object.keys(files));

  //     // Get existing tenant to preserve existing files
  //     const existingTenant = await TenantModel.findById(id);
  //     if (!existingTenant) {
  //       // Clean up uploaded files if tenant not found
  //       if (req.files) {
  //         Object.values(req.files).forEach(fileArray => {
  //           if (fileArray && fileArray.length > 0) {
  //             fileArray.forEach(file => {
  //               if (file.path && fs.existsSync(file.path)) {
  //                 fs.unlinkSync(file.path);
  //               }
  //             });
  //           }
  //         });
  //       }
  //       return res.status(404).json({ success: false, message: "Tenant not found" });
  //     }

  //     // Handle file uploads - keep existing if new not provided
  //     const updateData = {};
      
  //     // ID Proof
  //     if (files.id_proof_file && files.id_proof_file[0]) {
  //       updateData.id_proof_url = `/uploads/id_proofs/${files.id_proof_file[0].filename}`;
  //       // Delete old file if exists
  //       if (existingTenant.id_proof_url) {
  //         const oldPath = existingTenant.id_proof_url.replace('/uploads/', 'uploads/');
  //         if (fs.existsSync(oldPath)) {
  //           fs.unlinkSync(oldPath);
  //         }
  //       }
  //     }
      
  //     // Address Proof
  //     if (files.address_proof_file && files.address_proof_file[0]) {
  //       updateData.address_proof_url = `/uploads/address_proofs/${files.address_proof_file[0].filename}`;
  //       if (existingTenant.address_proof_url) {
  //         const oldPath = existingTenant.address_proof_url.replace('/uploads/', 'uploads/');
  //         if (fs.existsSync(oldPath)) {
  //           fs.unlinkSync(oldPath);
  //         }
  //       }
  //     }
      
  //     // Photo
  //     if (files.photo_file && files.photo_file[0]) {
  //       updateData.photo_url = `/uploads/photos/${files.photo_file[0].filename}`;
  //       if (existingTenant.photo_url) {
  //         const oldPath = existingTenant.photo_url.replace('/uploads/', 'uploads/');
  //         if (fs.existsSync(oldPath)) {
  //           fs.unlinkSync(oldPath);
  //         }
  //       }
  //     }

  //     // Add other fields
  //     const fields = [
  //       'full_name', 'email', 'phone', 'country_code', 'gender', 'date_of_birth',
  //       'occupation_category', 'exact_occupation', 'occupation', 'address',
  //       'city', 'state', 'pincode', 'preferred_sharing', 'preferred_room_type',
  //       'preferred_property_id'
  //     ];

  //     fields.forEach(field => {
  //       if (body[field] !== undefined) {
  //         updateData[field] = body[field];
  //       }
  //     });

  //     if (typeof body.is_active !== "undefined") {
  //       updateData.is_active = body.is_active === 'true' || body.is_active === '1' || body.is_active === true;
  //     }
  //     if (typeof body.portal_access_enabled !== "undefined") {
  //       updateData.portal_access_enabled = body.portal_access_enabled === 'true' || body.portal_access_enabled === '1' || body.portal_access_enabled === true;
  //     }

  //     // Validate phone if provided
  //     if (body.phone) {
  //       const phoneRegex = /^[6-9]\d{9}$/;
  //       if (!phoneRegex.test(body.phone)) {
  //         return res.status(400).json({ success: false, message: "Invalid Indian mobile number" });
  //       }
  //     }

  //     // Update tenant
  //     const ok = await TenantModel.update(id, updateData);
  //     if (!ok) {
  //       return res.status(404).json({ success: false, message: "Tenant not found or no changes" });
  //     }

  //     // Update/create credentials if password is provided
  //     if (body.password && (body.update_credentials === "true" || body.update_credentials === true)) {
  //       try {
  //         const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
          
  //         // Check if credentials exist
  //         const credentials = await TenantModel.getCredentialsByTenantIds([id]);
  //         if (credentials && credentials.length > 0) {
  //           await TenantModel.updateCredential(id, { password_hash });
  //           console.log('Credentials updated for tenant:', id);
  //         } else {
  //           await TenantModel.createCredential({
  //             tenant_id: id,
  //             email: body.email || existingTenant.email,
  //             password_hash,
  //           });
  //           console.log('Credentials created for tenant:', id);
  //         }
  //       } catch (credErr) {
  //         console.error("Failed to update credentials:", credErr);
  //         // Continue even if credential update fails
  //       }
  //     }

  //     return res.json({ success: true, message: "Tenant updated successfully" });
  //   } catch (err) {
  //     console.error("TenantController.update error:", err);
      
  //     // Clean up uploaded files on error
  //     if (req.files) {
  //       Object.values(req.files).forEach(fileArray => {
  //         if (fileArray && fileArray.length > 0) {
  //           fileArray.forEach(file => {
  //             if (file.path && fs.existsSync(file.path)) {
  //               fs.unlinkSync(file.path);
  //             }
  //           });
  //         }
  //       });
  //     }
      
  //     return res.status(500).json({ success: false, message: "Failed to update tenant: " + err.message });
  //   }
  // },

//   async update(req, res) {
//   try {
//     const id = req.params.id;
//     const body = req.body || {};
//     const files = req.files || {};

//     console.log('Update tenant id:', id);
//     console.log('Update tenant body fields:', Object.keys(body));
//     console.log('Update tenant files:', Object.keys(files));

//     // Get existing tenant to preserve existing files
//     const existingTenant = await TenantModel.findById(id);
//     if (!existingTenant) {
//       // Clean up uploaded files if tenant not found
//       if (req.files) {
//         Object.values(req.files).forEach(fileArray => {
//           if (fileArray && fileArray.length > 0) {
//             fileArray.forEach(file => {
//               if (file.path && fs.existsSync(file.path)) {
//                 fs.unlinkSync(file.path);
//               }
//             });
//           }
//         });
//       }
//       return res.status(404).json({ success: false, message: "Tenant not found" });
//     }

//     // Handle file uploads - keep existing if new not provided
//     const updateData = {};
    
//     // Process main documents
//     const processMainDocument = (fieldName, folder, existingUrl) => {
//       if (files[fieldName] && files[fieldName][0]) {
//         const file = files[fieldName][0];
//         updateData[fieldName] = `/uploads/${folder}/${file.filename}`;
//         // Delete old file if exists
//         if (existingUrl) {
//           const oldPath = existingUrl.replace('/uploads/', 'uploads/');
//           if (fs.existsSync(oldPath)) {
//             try {
//               fs.unlinkSync(oldPath);
//             } catch (unlinkErr) {
//               console.error(`Failed to delete old ${fieldName}:`, unlinkErr);
//             }
//           }
//         }
//         return true;
//       }
//       return false;
//     };
    
//     processMainDocument('id_proof_url', 'id_proofs', existingTenant.id_proof_url);
//     processMainDocument('address_proof_url', 'address_proofs', existingTenant.address_proof_url);
//     processMainDocument('photo_url', 'photos', existingTenant.photo_url);
    
//     // Process additional documents
//     let additionalDocs = existingTenant.additional_documents || [];
//     Object.keys(files).forEach(field => {
//       if (field.startsWith('additional_doc_')) {
//         files[field].forEach(file => {
//           const newDoc = {
//             filename: file.originalname,
//             url: `/uploads/additional_docs/${file.filename}`,
//             uploaded_at: new Date().toISOString()
//           };
//           additionalDocs.push(newDoc);
//         });
//       }
//     });
    
//     // Only update additional_documents if we have new ones
//     if (additionalDocs.length > (existingTenant.additional_documents?.length || 0)) {
//       updateData.additional_documents = additionalDocs;
//     }
    
//     // Add other fields
//     const fields = [
//       'full_name', 'email', 'phone', 'country_code', 'gender', 'date_of_birth',
//       'occupation_category', 'exact_occupation', 'occupation', 'address',
//       'city', 'state', 'pincode', 'preferred_sharing', 'preferred_room_type',
//       'preferred_property_id',
//       // NEW EMERGENCY CONTACT FIELDS
//       'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'
//     ];

//     fields.forEach(field => {
//       if (body[field] !== undefined) {
//         updateData[field] = body[field];
//       }
//     });

//     // Handle boolean fields
//     if (typeof body.is_active !== "undefined") {
//       updateData.is_active = body.is_active === 'true' || body.is_active === '1' || body.is_active === true;
//     }
//     if (typeof body.portal_access_enabled !== "undefined") {
//       updateData.portal_access_enabled = body.portal_access_enabled === 'true' || body.portal_access_enabled === '1' || body.portal_access_enabled === true;
//     }

//     // Validate phone if provided
//     if (body.phone) {
//       const phoneRegex = /^[6-9]\d{9}$/;
//       if (!phoneRegex.test(body.phone)) {
//         return res.status(400).json({ success: false, message: "Invalid Indian mobile number" });
//       }
//     }
    
//     // Validate emergency contact phone if provided
//     if (body.emergency_contact_phone) {
//       const phoneRegex = /^[6-9]\d{9}$/;
//       if (!phoneRegex.test(body.emergency_contact_phone)) {
//         return res.status(400).json({ success: false, message: "Invalid emergency contact phone number" });
//       }
//     }

//     // Update tenant
//     const ok = await TenantModel.update(id, updateData);
//     if (!ok) {
//       return res.status(404).json({ success: false, message: "Tenant not found or no changes" });
//     }

//     // Update/create credentials if password is provided
//     if (body.password && (body.update_credentials === "true" || body.update_credentials === true)) {
//       try {
//         const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
        
//         // Check if credentials exist
//         const credentials = await TenantModel.getCredentialsByTenantIds([id]);
//         if (credentials && credentials.length > 0) {
//           await TenantModel.updateCredential(id, { password_hash });
//           console.log('Credentials updated for tenant:', id);
//         } else {
//           await TenantModel.createCredential({
//             tenant_id: id,
//             email: body.email || existingTenant.email,
//             password_hash,
//           });
//           console.log('Credentials created for tenant:', id);
//         }
//       } catch (credErr) {
//         console.error("Failed to update credentials:", credErr);
//         // Continue even if credential update fails
//       }
//     }

//     return res.json({ success: true, message: "Tenant updated successfully", additional_documents: additionalDocs });
//   } catch (err) {
//     console.error("TenantController.update error:", err);
    
//     // Clean up uploaded files on error
//     if (req.files) {
//       Object.values(req.files).forEach(fileArray => {
//         if (fileArray && fileArray.length > 0) {
//           fileArray.forEach(file => {
//             if (file.path && fs.existsSync(file.path)) {
//               fs.unlinkSync(file.path);
//             }
//           });
//         }
//       });
//     }
    
//     return res.status(500).json({ success: false, message: "Failed to update tenant: " + err.message });
//   }
// },

async update(req, res) {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const files = req.files || {};

    console.log('Update tenant id:', id);
    console.log('Update tenant body fields:', Object.keys(body));
    console.log('Update tenant files:', Object.keys(files));

    // Get existing tenant to preserve existing files
    const existingTenant = await TenantModel.findById(id);
    if (!existingTenant) {
      // Clean up uploaded files if tenant not found
      if (req.files) {
        Object.values(req.files).forEach(fileArray => {
          if (fileArray && fileArray.length > 0) {
            fileArray.forEach(file => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          }
        });
      }
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    // Handle file uploads - keep existing if new not provided
    const updateData = {};
    
    // Process main documents
    const processMainDocument = (fieldName, folder, existingUrl) => {
      if (files[fieldName] && files[fieldName][0]) {
        const file = files[fieldName][0];
        updateData[fieldName] = `/uploads/${folder}/${file.filename}`;
        // Delete old file if exists
        if (existingUrl) {
          const oldPath = existingUrl.replace('/uploads/', 'uploads/');
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch (unlinkErr) {
              console.error(`Failed to delete old ${fieldName}:`, unlinkErr);
            }
          }
        }
        return true;
      }
      return false;
    };
    
    processMainDocument('id_proof_url', 'id_proofs', existingTenant.id_proof_url);
    processMainDocument('address_proof_url', 'address_proofs', existingTenant.address_proof_url);
    processMainDocument('photo_url', 'photos', existingTenant.photo_url);
    
    // Process additional documents - FIXED TO PREVENT DUPLICATES
    let additionalDocs = existingTenant.additional_documents || [];
    
    // Track unique files by filename to prevent duplicates
    const uniqueFiles = new Map(); // key: filename, value: file object
    
    // Collect all files from different field patterns
    const fileFields = Object.keys(files);
    
    fileFields.forEach(field => {
      // Check if this field contains additional documents
      if (field.includes('additional_documents') || 
          field.includes('additional_docs') ||
          field.includes('additional')) {
        
        const fileArray = Array.isArray(files[field]) ? files[field] : [files[field]];
        
        fileArray.forEach(file => {
          if (file && file.filename && file.originalname) {
            // Use a combination of originalname and size to identify unique files
            const fileKey = `${file.originalname}_${file.size}`;
            
            if (!uniqueFiles.has(fileKey)) {
              uniqueFiles.set(fileKey, file);
              console.log(`Found unique additional file: ${file.originalname} (${file.size} bytes)`);
            } else {
              console.log(`Skipping duplicate file: ${file.originalname}`);
            }
          }
        });
      }
    });
    
    // Convert Map to array of unique files
    const uniqueFileArray = Array.from(uniqueFiles.values());
    
    console.log(`Found ${uniqueFileArray.length} unique additional files out of ${fileFields.length} file fields`);
    
    // Process unique files
    if (uniqueFileArray.length > 0) {
      const newDocs = uniqueFileArray.map(file => ({
        filename: file.originalname,
        url: `/uploads/additional_docs/${file.filename}`,
        uploaded_at: new Date().toISOString(),
        document_type: 'Additional',
        file_size: file.size,
        file_mimetype: file.mimetype
      }));
      
      // Remove any existing documents with the same filename
      const existingFilenames = new Set(additionalDocs.map(doc => doc.filename));
      const uniqueNewDocs = newDocs.filter(doc => !existingFilenames.has(doc.filename));
      
      // Combine existing and new documents
      additionalDocs = [...additionalDocs, ...uniqueNewDocs];
      updateData.additional_documents = additionalDocs;
      
      console.log(`Added ${uniqueNewDocs.length} new unique documents`);
      console.log('New documents:', uniqueNewDocs.map(d => d.filename));
    }
    
    // Check if additional_documents was sent as JSON in body
    if (body.additional_documents) {
      try {
        let parsedDocs = [];
        if (typeof body.additional_documents === 'string') {
          parsedDocs = JSON.parse(body.additional_documents);
        } else if (Array.isArray(body.additional_documents)) {
          parsedDocs = body.additional_documents;
        }
        
        if (Array.isArray(parsedDocs) && parsedDocs.length > 0) {
          // Merge with existing documents, removing duplicates
          const existingUrls = new Set(additionalDocs.map(doc => doc.url));
          const uniqueBodyDocs = parsedDocs.filter(doc => !existingUrls.has(doc.url));
          
          if (uniqueBodyDocs.length > 0) {
            additionalDocs = [...additionalDocs, ...uniqueBodyDocs];
            updateData.additional_documents = additionalDocs;
            console.log('Merged additional documents from body:', uniqueBodyDocs.length);
          }
        }
      } catch (e) {
        console.error('Error parsing additional_documents from body:', e);
      }
    }

    // Add lock-in and notice period fields
    const parseNumber = (value, defaultValue = 0) => {
      if (value === undefined || value === null || value === '') return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    // Add lock-in period fields if provided
    if (body.lockin_period_months !== undefined) {
      updateData.lockin_period_months = parseNumber(body.lockin_period_months);
    }
    if (body.lockin_penalty_amount !== undefined) {
      updateData.lockin_penalty_amount = parseNumber(body.lockin_penalty_amount);
    }
    if (body.lockin_penalty_type !== undefined) {
      updateData.lockin_penalty_type = body.lockin_penalty_type;
    }
    
    // Add notice period fields if provided
    if (body.notice_period_days !== undefined) {
      updateData.notice_period_days = parseNumber(body.notice_period_days);
    }
    if (body.notice_penalty_amount !== undefined) {
      updateData.notice_penalty_amount = parseNumber(body.notice_penalty_amount);
    }
    if (body.notice_penalty_type !== undefined) {
      updateData.notice_penalty_type = body.notice_penalty_type;
    }
    
    // Add property_id field
    if (body.property_id !== undefined) {
      updateData.property_id = body.property_id || null;
    }

    // Add other fields
    const fields = [
      'salutation', 'full_name', 'email', 'phone', 'country_code', 'gender', 'date_of_birth',
      'occupation_category', 'exact_occupation', 'occupation', 'address',
      'city', 'state', 'pincode', 'preferred_sharing', 'preferred_room_type',
      'preferred_property_id', 'check_in_date',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'
    ];

    console.log('Body received for update:', body);
console.log('Salutation:', body.salutation);
console.log('Check-in Date:', body.check_in_date);

    fields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Handle boolean fields
    if (typeof body.is_active !== "undefined") {
      updateData.is_active = body.is_active === 'true' || body.is_active === '1' || body.is_active === true;
    }
    if (typeof body.portal_access_enabled !== "undefined") {
      updateData.portal_access_enabled = body.portal_access_enabled === 'true' || body.portal_access_enabled === '1' || body.portal_access_enabled === true;
    }

    // Validate phone if provided
    if (body.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(body.phone)) {
        return res.status(400).json({ success: false, message: "Invalid Indian mobile number" });
      }
    }
    
    // Validate emergency contact phone if provided
    if (body.emergency_contact_phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(body.emergency_contact_phone)) {
        return res.status(400).json({ success: false, message: "Invalid emergency contact phone number" });
      }
    }

    // Log update data for debugging
    console.log('Final update data - Additional documents count:', 
      updateData.additional_documents ? updateData.additional_documents.length : 0);

    // Update tenant
    const ok = await TenantModel.update(id, updateData);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Tenant not found or no changes" });
    }

    // Update/create credentials if password is provided
    if (body.password && (body.update_credentials === "true" || body.update_credentials === true)) {
      try {
        const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
        
        // Check if credentials exist
        const credentials = await TenantModel.getCredentialsByTenantIds([id]);
        if (credentials && credentials.length > 0) {
          await TenantModel.updateCredential(id, { password_hash });
          console.log('Credentials updated for tenant:', id);
        } else {
          await TenantModel.createCredential({
            tenant_id: id,
            email: body.email || existingTenant.email,
            password_hash,
          });
          console.log('Credentials created for tenant:', id);
        }
      } catch (credErr) {
        console.error("Failed to update credentials:", credErr);
        // Continue even if credential update fails
      }
    }

    return res.json({ 
      success: true, 
      message: "Tenant updated successfully", 
      additional_documents: updateData.additional_documents || []
    });
  } catch (err) {
    console.error("TenantController.update error:", err);
    
    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        if (fileArray && fileArray.length > 0) {
          fileArray.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      });
    }
    
    return res.status(500).json({ success: false, message: "Failed to update tenant: " + err.message });
  }
},

  async remove(req, res) {
    try {
      const id = req.params.id;
      const deleted = await TenantModel.delete(id);
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "Tenant not found" });
      return res.json({ success: true, message: "Tenant deleted" });
    } catch (err) {
      console.error("TenantController.remove error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete tenant" });
    }
  },

  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || !ids.length)
        return res
          .status(400)
          .json({ success: false, message: "ids array required" });
      await TenantModel.bulkDelete(ids);
      return res.json({
        success: true,
        message: `${ids.length} tenants deleted`,
      });
    } catch (err) {
      console.error("TenantController.bulkDelete error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete tenants" });
    }
  },

  async bulkStatus(req, res) {
    try {
      const { ids, is_active } = req.body;
      if (!Array.isArray(ids) || !ids.length)
        return res
          .status(400)
          .json({ success: false, message: "ids array required" });
      await TenantModel.bulkUpdateStatus(ids, !!is_active);
      return res.json({
        success: true,
        message: `${ids.length} tenants status updated`,
      });
    } catch (err) {
      console.error("TenantController.bulkStatus error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update status" });
    }
  },

  async bulkPortalAccess(req, res) {
    try {
      const { ids, portal_access_enabled } = req.body;
      if (!Array.isArray(ids) || !ids.length)
        return res
          .status(400)
          .json({ success: false, message: "ids array required" });
      await TenantModel.bulkUpdatePortalAccess(ids, !!portal_access_enabled);
      return res.json({
        success: true,
        message: `${ids.length} tenants portal access updated`,
      });
    } catch (err) {
      console.error("TenantController.bulkPortalAccess error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update portal access" });
    }
  },

  // credentials endpoints
  async createCredential(req, res) {
    try {
      const { tenant_id, email, password } = req.body;
      if (!tenant_id || !email || !password)
        return res
          .status(400)
          .json({
            success: false,
            message: "tenant_id, email and password required",
          });

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const id = await TenantModel.createCredential({
        tenant_id,
        email,
        password_hash,
      });
      return res
        .status(201)
        .json({ success: true, message: "Credential created", id });
    } catch (err) {
      console.error("TenantController.createCredential error:", err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: "Credentials already exist for this tenant" });
      }
      return res
        .status(500)
        .json({ success: false, message: "Failed to create credential" });
    }
  },

  async resetCredential(req, res) {
    try {
      const tenant_id = req.params.tenantId;
      const { password } = req.body;
      if (!password)
        return res
          .status(400)
          .json({ success: false, message: "password required" });

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const ok = await TenantModel.updateCredential(tenant_id, {
        password_hash,
      });
      if (!ok)
        return res
          .status(404)
          .json({ success: false, message: "Credential not found for tenant" });
      return res.json({ success: true, message: "Password reset" });
    } catch (err) {
      console.error("TenantController.resetCredential error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to reset credential" });
    }
  },

  async getCredentialsByTenantIds(req, res) {
    try {
      const idsParam = req.query.ids || "";
      const ids = idsParam
        ? idsParam
            .split(",")
            .map((i) => parseInt(i, 10))
            .filter(Boolean)
        : [];
      const rows = await TenantModel.getCredentialsByTenantIds(ids);
      return res.json({ success: true, data: rows || [] });
    } catch (err) {
      console.error("TenantController.getCredentialsByTenantIds error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch credentials" });
    }
  },

  async getAvailableRooms(req, res) {
    try {
      const { gender, property_id } = req.query;
      console.log('getAvailableRooms query:', { gender, property_id });
      const rows = await TenantModel.getAvailableRooms(gender, property_id);
      return res.json({ success: true, data: rows || [] });
    } catch (err) {
      console.error("TenantController.getAvailableRooms error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch available rooms: " + err.message });
    }
  },

  async getAllProperties(req, res) {
    try {
      const rows = await TenantModel.getAllProperties();
      
      const properties = rows.map(property => ({
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city_id,
        state: property.state,
        fullAddress: `${property.address}, ${property.city_id}, ${property.state}`
      }));
      
      return res.json({ success: true, data: properties });
    } catch (err) {
      console.error("TenantController.getAllProperties error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch properties" });
    }
  },

  async exportToExcel(req, res) {
    try {
      const filters = {
        gender: req.query.gender,
        occupation_category: req.query.occupation_category,
        city: req.query.city,
        state: req.query.state,
        is_active: req.query.is_active !== undefined ? 
          (req.query.is_active === "true" || req.query.is_active === "1") : undefined,
        portal_access_enabled: req.query.portal_access_enabled !== undefined ?
          (req.query.portal_access_enabled === "true" || req.query.portal_access_enabled === "1") : undefined,
      };

      const data = await TenantModel.exportTenants(filters);

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: "No data to export" });
      }

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data);
      
      const wscols = [
        { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, 
        { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, 
        { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, 
        { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
        { wch: 20 }
      ];
      ws['!cols'] = wscols;
      
      xlsx.utils.book_append_sheet(wb, ws, "Tenants");

      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const date = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Disposition', `attachment; filename="tenants_${date}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buf);

    } catch (err) {
      console.error("TenantController.exportToExcel error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to export data: " + err.message });
    }
  },

  async uploadDocument(req, res) {
    try {
      const tenantId = req.params.tenantId;
      const files = req.files || {};
      
      console.log('Upload document for tenant:', tenantId);
      console.log('Files received:', Object.keys(files));

      // Check if tenant exists
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) {
        // Clean up uploaded files
        Object.values(files).forEach(fileArray => {
          if (fileArray && fileArray.length > 0) {
            fileArray.forEach(file => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          }
        });
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }

      const uploadedFiles = [];
      const updateData = {};

      // Process ID proof
      if (files.id_proof_file && files.id_proof_file[0]) {
        const file = files.id_proof_file[0];
        const fileUrl = `/uploads/id_proofs/${file.filename}`;
        updateData.id_proof_url = fileUrl;
        uploadedFiles.push({
          type: 'id_proof',
          url: fileUrl,
          filename: file.originalname,
          size: file.size
        });
      }

      // Process address proof
      if (files.address_proof_file && files.address_proof_file[0]) {
        const file = files.address_proof_file[0];
        const fileUrl = `/uploads/address_proofs/${file.filename}`;
        updateData.address_proof_url = fileUrl;
        uploadedFiles.push({
          type: 'address_proof',
          url: fileUrl,
          filename: file.originalname,
          size: file.size
        });
      }

      // Process photo
      if (files.photo_file && files.photo_file[0]) {
        const file = files.photo_file[0];
        const fileUrl = `/uploads/photos/${file.filename}`;
        updateData.photo_url = fileUrl;
        uploadedFiles.push({
          type: 'photo',
          url: fileUrl,
          filename: file.originalname,
          size: file.size
        });
      }

      // Update tenant if any main documents were uploaded
      if (Object.keys(updateData).length > 0) {
        await TenantModel.update(tenantId, updateData);
      }

      return res.json({
        success: true,
        message: "Documents uploaded successfully",
        uploaded_files: uploadedFiles
      });
    } catch (err) {
      console.error("TenantController.uploadDocument error:", err);
      
      // Clean up uploaded files on error
      if (req.files) {
        Object.values(req.files).forEach(fileArray => {
          if (fileArray && fileArray.length > 0) {
            fileArray.forEach(file => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          }
        });
      }
      
      return res.status(500).json({ success: false, message: "Failed to upload documents: " + err.message });
    }
  },

  async getRoomTypes(req, res) {
    try {
      const result = await TenantModel.getRoomTypes();
      return res.json({
        success: true,
        data: result
      });
    } catch (err) {
      console.error('TenantController.getRoomTypes error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch room types: ' + err.message
      });
    }
  },

  // NEW METHODS FOR FETCHING OPTIONS
  async getPreferredOptions(req, res) {
    try {
      const options = await TenantModel.getPreferredOptions();
      
      // Also get gender options from database or hardcode
      const genderOptions = ['Male', 'Female', 'Other'];
      
      return res.json({
        success: true,
        data: {
          ...options,
          genderOptions,
          countryCodes: ['+91', '+1', '+44', '+61', '+65'] // Add more as needed
        }
      });
    } catch (err) {
      console.error("TenantController.getPreferredOptions error:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch options: " + err.message 
      });
    }
  },

  async getSharingTypes(req, res) {
    try {
      const sharingTypes = await TenantModel.getPreferredSharingOptions();
      return res.json({
        success: true,
        data: sharingTypes
      });
    } catch (err) {
      console.error("TenantController.getSharingTypes error:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch sharing types: " + err.message 
      });
    }
  },

  async getRoomTypeOptions(req, res) {
    try {
      const roomTypes = await TenantModel.getPreferredRoomTypeOptions();
      return res.json({
        success: true,
        data: roomTypes
      });
    } catch (err) {
      console.error("TenantController.getRoomTypeOptions error:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch room types: " + err.message 
      });
    }
  },

  async getProperties(req, res) {
    try {
      const properties = await TenantModel.getPropertyOptions();
      return res.json({
        success: true,
        data: properties
      });
    } catch (err) {
      console.error("TenantController.getProperties error:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch properties: " + err.message 
      });
    }
  },

  async getOccupationalCategories(req, res) {
    try {
      const categories = await TenantModel.getOccupationalOptions();
      return res.json({
        success: true,
        data: categories
      });
    } catch (err) {
      console.error("TenantController.getOccupationalCategories error:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch occupational categories: " + err.message 
      });
    }
  },

  async getLocationOptions(req, res) {
    try {
      const [cities] = await pool.query(
        "SELECT DISTINCT city FROM tenants WHERE city IS NOT NULL AND city != '' ORDER BY city"
      );
      const [states] = await pool.query(
        "SELECT DISTINCT state FROM tenants WHERE state IS NOT NULL AND state != '' ORDER BY state"
      );
      
      return res.json({
        success: true,
        data: {
          cities: cities.map(row => row.city),
          states: states.map(row => row.state)
        }
      });
    } catch (err) {
      console.error("TenantController.getLocationOptions error:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch location options: " + err.message 
      });
    }
  },

  // Diagnostic endpoint
  async diagnostic(req, res) {
    try {
      // Check tenants table structure
      const [columns] = await pool.query('DESCRIBE tenants');
      
      // Check required fields
      const requiredColumns = ['full_name', 'email', 'phone'];
      const missingColumns = requiredColumns.filter(col => 
        !columns.find(c => c.Field === col)
      );
      
      // Check if all columns in model match
      const modelColumns = [
        'full_name', 'email', 'phone', 'country_code', 'gender', 'date_of_birth',
        'occupation_category', 'exact_occupation', 'occupation', 'portal_access_enabled',
        'is_active', 'id_proof_url', 'address_proof_url', 'photo_url', 'address',
        'city', 'state', 'pincode', 'preferred_sharing', 'preferred_room_type',
        'preferred_property_id', 'created_at', 'updated_at'
      ];
      
      const columnNames = columns.map(col => col.Field);
      const extraColumns = columnNames.filter(col => !modelColumns.includes(col));
      const missingInDB = modelColumns.filter(col => !columnNames.includes(col));
      
      return res.json({
        success: true,
        data: {
          totalColumns: columns.length,
          columnNames: columnNames,
          requiredColumns: {
            expected: requiredColumns,
            missing: missingColumns
          },
          schemaIssues: {
            extraColumns: extraColumns,
            missingColumns: missingInDB
          },
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (err) {
      console.error('Diagnostic error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Diagnostic failed: ' + err.message 
      });
    }
  },

  // Add this function to tenantController.js
async listWithAssignments(req, res) {
    try {
        const filters = req.query;
         const result = await TenantModel.findWithAssignments(filters);

         // Get bookings, payments and credentials as usual
    const tenantIds = result.rows.map(t => t.id);
    const bookings = tenantIds.length ? await TenantModel.getBookingsForTenantIds(tenantIds) : [];
    const payments = tenantIds.length ? await TenantModel.getPaymentsForTenantIds(tenantIds) : [];
    const credentials = tenantIds.length ? await TenantModel.getCredentialsByTenantIds(tenantIds) : [];

    // Attach data (same as existing list function)
    const bookingsMap = {};
    bookings.forEach((b) => {
      if (!bookingsMap[b.tenant_id]) bookingsMap[b.tenant_id] = [];
      bookingsMap[b.tenant_id].push({
        id: b.id,
        status: b.status,
        monthly_rent: Number(b.monthly_rent || 0),
        properties: { 
          name: b.property_name || null,
          city: b.property_city || null,
          state: b.property_state || null
        },
        room: {
          room_number: b.room_number,
          room_type: b.room_type,
          sharing_type: b.sharing_type,
          floor: b.floor
        }
      });
    });
        
        // Call your existing list function
        const tenants = await TenantModel.list(filters);
        
        // For each tenant, fetch bed assignment
        const tenantsWithAssignments = await Promise.all(
            tenants.map(async (tenant) => {
                try {
                    // Fetch bed assignment for this tenant
                    const assignments = await RoomModel.findTenantAssignment(tenant.id);
                    
                    return {
                        ...tenant,
                        current_assignment: assignments.length > 0 ? assignments[0] : null,
                        assignments: assignments // Include all assignments if needed
                    };
                } catch (error) {
                    console.error(`Error fetching assignment for tenant ${tenant.id}:`, error);
                    return tenant; // Return tenant without assignment on error
                }
            })
        );
        
        res.json({
            success: true,
            data: tenantsWithAssignments,
            count: tenantsWithAssignments.length
        });
        
    } catch (err) {
        console.error("TenantController.listWithAssignments error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to load tenants with assignments"
        });
    }
},

};

module.exports = TenantController;