// controllers/tenantController.js
const bcrypt = require("bcrypt");
const TenantModel = require("../models/tenantModel");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const { sendEmail } = require("../utils/emailService");

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
         const includeDeleted = req.query.include_deleted === "true"; 

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
         includeDeleted, 
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
        portal_access_enabled: t.portal_access_enabled === 1 || t.portal_access_enabled === true
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
    // Get property details if property_id exists
let propertyDetails = null;
if (tenant.property_id) {
  try {
    const [propRows] = await pool.query(
      'SELECT id, name, lockin_period_months, lockin_penalty_amount, lockin_penalty_type, notice_period_days, notice_penalty_amount, notice_penalty_type FROM properties WHERE id = ?',
      [tenant.property_id]
    );
    propertyDetails = propRows[0] || null;
  } catch (propErr) {
    console.error('Failed to fetch property details:', propErr);
  }
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





async create(req, res) {
  try {
    const body = req.body || {};
    const files = req.files || {};

    console.log("=== CREATE TENANT START ===");
    console.log("Body fields:", Object.keys(body));
    console.log("Files received:", Object.keys(files));

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

    processMainDocument("id_proof_url", "id_proofs");
    processMainDocument("address_proof_url", "address_proofs");
    processMainDocument("photo_url", "photos");

    // Process additional documents
    let additionalDocs = [];

    if (files["additional_documents[]"]) {
      const additionalFiles = Array.isArray(files["additional_documents[]"])
        ? files["additional_documents[]"]
        : [files["additional_documents[]"]];

      console.log(`Found ${additionalFiles.length} additional files`);

      additionalDocs = additionalFiles.map((file) => ({
        filename: file.originalname,
        url: `/uploads/additional_docs/${file.filename}`,
        uploaded_at: new Date().toISOString(),
        document_type: "Additional",
        file_size: file.size,
        file_mimetype: file.mimetype,
      }));

      console.log("Processed additional documents:", additionalDocs);
    }

    // Also check for other patterns
    Object.keys(files).forEach((field) => {
      if (
        field.startsWith("additional_documents") &&
        field !== "additional_documents[]"
      ) {
        const fileArray = Array.isArray(files[field])
          ? files[field]
          : [files[field]];

        fileArray.forEach((file) => {
          if (file && file.originalname) {
            // Check if this file already exists
            const exists = additionalDocs.some(
              (doc) => doc.filename === file.originalname,
            );
            if (!exists) {
              additionalDocs.push({
                filename: file.originalname,
                url: `/uploads/additional_docs/${file.filename}`,
                uploaded_at: new Date().toISOString(),
                document_type: "Additional",
                file_size: file.size,
                file_mimetype: file.mimetype,
              });
            }
          }
        });
      }
    });

    console.log("Uploaded file URLs:", uploadedFiles);
    console.log("Additional documents:", additionalDocs);

    // Parse numeric fields
    const parseNumber = (value, defaultValue = 0) => {
      if (value === undefined || value === null || value === "")
        return defaultValue;
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    // Parse integer fields
    const parseIntValue = (value, defaultValue = null) => {
      if (value === undefined || value === null || value === "")
        return defaultValue;
      const num = parseInt(value);
      return isNaN(num) ? defaultValue : num;
    };

    // Create a clean tenant data object with all fields
    const tenantData = {
      // Personal info
      salutation: body.salutation || null,
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      country_code: body.country_code || "+91",
      gender: body.gender,
      date_of_birth: body.date_of_birth || null,

      // Occupation fields - ALL of them
      occupation_category: body.occupation_category || null,
      exact_occupation: body.exact_occupation || null,
      occupation: body.occupation || null,
      organization: body.organization || null,
      years_of_experience: body.years_of_experience
        ? parseIntValue(body.years_of_experience)
        : null,
      monthly_income: body.monthly_income
        ? parseNumber(body.monthly_income)
        : null,
      course_duration: body.course_duration || null,
      student_id: body.student_id || null,
      employee_id: body.employee_id || null,
      portfolio_url: body.portfolio_url || null,
      work_mode: body.work_mode || null,
      shift_timing: body.shift_timing || null,

      // Status
      portal_access_enabled:
        body.portal_access_enabled === "true" ||
        body.portal_access_enabled === true ||
        false,
      is_active:
        body.is_active === undefined || body.is_active === ""
          ? true
          : body.is_active === "true" ||
            body.is_active === true ||
            body.is_active === "1",

      // Address
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      pincode: body.pincode || null,

      // Preferences
      preferred_sharing: body.preferred_sharing || null,
      preferred_room_type: body.preferred_room_type || null,
      preferred_property_id: body.preferred_property_id
        ? parseIntValue(body.preferred_property_id)
        : null,
      property_id: body.property_id ? parseIntValue(body.property_id) : null,
      check_in_date: body.check_in_date || null,

      // Emergency contacts
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      emergency_contact_relation: body.emergency_contact_relation || null,

      // Lock-in period fields
      lockin_period_months: body.lockin_period_months
        ? parseIntValue(body.lockin_period_months)
        : 0,
      lockin_penalty_amount: body.lockin_penalty_amount
        ? parseNumber(body.lockin_penalty_amount)
        : 0,
      lockin_penalty_type: body.lockin_penalty_type || "fixed",

      // Notice period fields
      notice_period_days: body.notice_period_days
        ? parseIntValue(body.notice_period_days)
        : 0,
      notice_penalty_amount: body.notice_penalty_amount
        ? parseNumber(body.notice_penalty_amount)
        : 0,
      notice_penalty_type: body.notice_penalty_type || "fixed",

      // Files
      ...uploadedFiles,
      additional_documents: additionalDocs,
    };

    // Validate required fields
    const required = ["full_name", "email", "phone"];
    const missing = required.filter((field) => !tenantData[field]);
    if (missing.length > 0) {
      // Clean up uploaded files
      if (req.files) {
        Object.values(req.files).forEach((fileArray) => {
          if (fileArray && fileArray.length > 0) {
            fileArray.forEach((file) => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tenantData.email)) {
      // Clean up uploaded files
      if (req.files) {
        Object.values(req.files).forEach((fileArray) => {
          if (fileArray && fileArray.length > 0) {
            fileArray.forEach((file) => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Validate phone (Indian format)
    if (tenantData.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(tenantData.phone.replace(/\D/g, ""))) {
        // Clean up uploaded files
        if (req.files) {
          Object.values(req.files).forEach((fileArray) => {
            if (fileArray && fileArray.length > 0) {
              fileArray.forEach((file) => {
                if (file.path && fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
                }
              });
            }
          });
        }

        return res.status(400).json({
          success: false,
          message:
            "Invalid Indian mobile number (must be 10 digits starting with 6-9)",
        });
      }
    }

    // Validate emergency contact phone if provided
    if (tenantData.emergency_contact_phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (
        !phoneRegex.test(tenantData.emergency_contact_phone.replace(/\D/g, ""))
      ) {
        // Clean up uploaded files
        if (req.files) {
          Object.values(req.files).forEach((fileArray) => {
            if (fileArray && fileArray.length > 0) {
              fileArray.forEach((file) => {
                if (file.path && fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
                }
              });
            }
          });
        }

        return res.status(400).json({
          success: false,
          message: "Invalid emergency contact phone number",
        });
      }
    }

    // Validate date of birth (must be 18+)
    if (tenantData.date_of_birth) {
      const dob = new Date(tenantData.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }

      if (age < 18) {
        // Clean up uploaded files
        if (req.files) {
          Object.values(req.files).forEach((fileArray) => {
            if (fileArray && fileArray.length > 0) {
              fileArray.forEach((file) => {
                if (file.path && fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
                }
              });
            }
          });
        }

        return res.status(400).json({
          success: false,
          message: "Tenant must be at least 18 years old",
        });
      }
    }

    // Validate check-in date (cannot be in the past)
    if (tenantData.check_in_date) {
      const checkInDate = new Date(tenantData.check_in_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        // Clean up uploaded files
        if (req.files) {
          Object.values(req.files).forEach((fileArray) => {
            if (fileArray && fileArray.length > 0) {
              fileArray.forEach((file) => {
                if (file.path && fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
                }
              });
            }
          });
        }

        return res.status(400).json({
          success: false,
          message: "Check-in date cannot be in the past",
        });
      }
    }

    console.log("Creating tenant with data keys:", Object.keys(tenantData));
    console.log("Tenant data sample:", {
      full_name: tenantData.full_name,
      email: tenantData.email,
      occupation_category: tenantData.occupation_category,
      exact_occupation: tenantData.exact_occupation,
      occupation: tenantData.occupation,
      organization: tenantData.organization,
      years_of_experience: tenantData.years_of_experience,
      monthly_income: tenantData.monthly_income,
      work_mode: tenantData.work_mode,
      property_id: tenantData.property_id,
      lockin_fields: {
        months: tenantData.lockin_period_months,
        amount: tenantData.lockin_penalty_amount,
        type: tenantData.lockin_penalty_type,
      },
      notice_fields: {
        days: tenantData.notice_period_days,
        amount: tenantData.notice_penalty_amount,
        type: tenantData.notice_penalty_type,
      },
    });

    // Check if tenant with same email or phone already exists
    const existingTenant = await TenantModel.findByEmailOrPhone(
      tenantData.email,
      tenantData.phone,
    );
    if (existingTenant) {
      // Clean up uploaded files
      if (req.files) {
        Object.values(req.files).forEach((fileArray) => {
          if (fileArray && fileArray.length > 0) {
            fileArray.forEach((file) => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: "Tenant with this email or phone already exists",
      });
    }

    // Create tenant
    const tenantId = await TenantModel.create(tenantData);
    console.log("Tenant created with ID:", tenantId);

    // Create credentials if password is provided
    if (
      body.password &&
      (body.create_credentials === "true" || body.create_credentials === true)
    ) {
      try {
        const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
        await TenantModel.createCredential({
          tenant_id: tenantId,
          email: body.email,
          password_hash,
        });
        console.log("Credentials created for new tenant:", tenantId);
      } catch (credErr) {
        console.error("Failed to create credentials:", credErr);
        // Continue even if credential creation fails
      }
    }

    // Send welcome email if credentials created
    if (
      body.password &&
      (body.create_credentials === "true" ||
        body.create_credentials === true ||
        tenantData.portal_access_enabled === true)
    ) {
      try {
        const portalUrl = "https://roomac.in/login";

        console.log("📧 Sending tenant email to:", tenantData.email);

        await sendEmail(
          tenantData.email,
          "Your ROOMAC Tenant Portal Login",
          `
      <h2>Welcome to ROOMAC</h2>

      <p>Hello ${tenantData.full_name},</p>

      <p>Your tenant portal account has been created.</p>

      <b>Login Details</b>

      <p>Email: ${tenantData.email}</p>
      <p>Password: ${body.password}</p>

      <p>Login here:</p>

      <a href="${portalUrl}">
      ${portalUrl}
      </a>

      <br/><br/>
      <p>Thank you,<br/>ROOMAC Team</p>
      `,
        );

        console.log("✅ Tenant credentials email sent");
      } catch (emailErr) {
        console.error("❌ Failed to send welcome email:", emailErr);
      }
    }
    return res.status(201).json({
      success: true,
      message: "Tenant created successfully",
      tenant_id: tenantId,
      additional_documents: additionalDocs,
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

// In tenantController.js - Replace the update method with this complete version

async update(req, res) {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const files = req.files || {};

    console.log('Update tenant id:', id);
    console.log('Update tenant body fields:', Object.keys(body));
    console.log('Update tenant body values:', {
      portal_access_enabled: body.portal_access_enabled,
      create_credentials: body.create_credentials,
      update_credentials: body.update_credentials,
      password: body.password ? '***' : undefined,
      work_mode: body.work_mode,
      shift_timing: body.shift_timing,
      occupation_category: body.occupation_category,
      exact_occupation: body.exact_occupation
    });

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
    const uniqueFiles = new Map();
    
    // Collect all files from different field patterns
    const fileFields = Object.keys(files);
    
    fileFields.forEach(field => {
      if (field.includes('additional_documents') || 
          field.includes('additional_docs') ||
          field.includes('additional')) {
        
        const fileArray = Array.isArray(files[field]) ? files[field] : [files[field]];
        
        fileArray.forEach(file => {
          if (file && file.filename && file.originalname) {
            const fileKey = `${file.originalname}_${file.size}`;
            
            if (!uniqueFiles.has(fileKey)) {
              uniqueFiles.set(fileKey, file);
              console.log(`Found unique additional file: ${file.originalname} (${file.size} bytes)`);
            }
          }
        });
      }
    });
    
    const uniqueFileArray = Array.from(uniqueFiles.values());
    
    if (uniqueFileArray.length > 0) {
      const newDocs = uniqueFileArray.map(file => ({
        filename: file.originalname,
        url: `/uploads/additional_docs/${file.filename}`,
        uploaded_at: new Date().toISOString(),
        document_type: 'Additional',
        file_size: file.size,
        file_mimetype: file.mimetype
      }));
      
      const existingFilenames = new Set(additionalDocs.map(doc => doc.filename));
      const uniqueNewDocs = newDocs.filter(doc => !existingFilenames.has(doc.filename));
      
      additionalDocs = [...additionalDocs, ...uniqueNewDocs];
      updateData.additional_documents = additionalDocs;
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
          const existingUrls = new Set(additionalDocs.map(doc => doc.url));
          const uniqueBodyDocs = parsedDocs.filter(doc => !existingUrls.has(doc.url));
          
          if (uniqueBodyDocs.length > 0) {
            additionalDocs = [...additionalDocs, ...uniqueBodyDocs];
            updateData.additional_documents = additionalDocs;
          }
        }
      } catch (e) {
        console.error('Error parsing additional_documents from body:', e);
      }
    }

    // Parse number fields
    const parseNumber = (value, defaultValue = 0) => {
      if (value === undefined || value === null || value === '') return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    const parseIntValue = (value, defaultValue = null) => {
      if (value === undefined || value === null || value === '') return defaultValue;
      const num = parseInt(value);
      return isNaN(num) ? defaultValue : num;
    };

    // Add lock-in period fields if provided
    if (body.lockin_period_months !== undefined) {
      updateData.lockin_period_months = parseIntValue(body.lockin_period_months) || 0;
    }
    if (body.lockin_penalty_amount !== undefined) {
      updateData.lockin_penalty_amount = parseNumber(body.lockin_penalty_amount) || 0;
    }
    if (body.lockin_penalty_type !== undefined) {
      updateData.lockin_penalty_type = body.lockin_penalty_type;
    }
    
    if (body.notice_period_days !== undefined) {
      updateData.notice_period_days = parseIntValue(body.notice_period_days) || 0;
    }
    if (body.notice_penalty_amount !== undefined) {
      updateData.notice_penalty_amount = parseNumber(body.notice_penalty_amount) || 0;
    }
    if (body.notice_penalty_type !== undefined) {
      updateData.notice_penalty_type = body.notice_penalty_type;
    }
    
    if (body.property_id !== undefined) {
      updateData.property_id = body.property_id || null;
    }

    // IMPORTANT: Handle portal_access_enabled explicitly
    if (body.portal_access_enabled !== undefined) {
      updateData.portal_access_enabled = body.portal_access_enabled === 'true' || 
                                         body.portal_access_enabled === true || 
                                         body.portal_access_enabled === '1';
      console.log('Setting portal_access_enabled to:', updateData.portal_access_enabled);
    }

    // Add other fields
    const fields = [
      'salutation', 'full_name', 'email', 'phone', 'country_code', 'gender', 'date_of_birth',
      'occupation_category', 'exact_occupation', 'occupation', 'organization',
      'years_of_experience', 'monthly_income', 'course_duration', 'student_id',
      'employee_id', 'portfolio_url', 'work_mode', 'shift_timing',
      'address', 'city', 'state', 'pincode', 'preferred_sharing', 'preferred_room_type',
      'preferred_property_id', 'check_in_date',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'
    ];

    fields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'years_of_experience') {
          updateData[field] = body[field] ? parseIntValue(body[field]) : null;
        } else if (field === 'monthly_income') {
          updateData[field] = body[field] ? parseNumber(body[field]) : null;
        } else {
          updateData[field] = body[field] === '' ? null : body[field];
        }
      }
    });

    // Handle is_active boolean
    if (typeof body.is_active !== "undefined") {
      updateData.is_active = body.is_active === 'true' || body.is_active === '1' || body.is_active === true;
    }

    // Validate phone if provided
    if (body.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(body.phone.replace(/\D/g, ''))) {
        return res.status(400).json({ success: false, message: "Invalid Indian mobile number" });
      }
    }
    
    if (body.emergency_contact_phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(body.emergency_contact_phone.replace(/\D/g, ''))) {
        return res.status(400).json({ success: false, message: "Invalid emergency contact phone number" });
      }
    }

    console.log('Final update data:', {
      portal_access_enabled: updateData.portal_access_enabled,
      work_mode: updateData.work_mode,
      shift_timing: updateData.shift_timing,
      organization: updateData.organization
    });

    // Update tenant
    const ok = await TenantModel.update(id, updateData);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Tenant not found or no changes" });
    }

    // Handle credentials based on portal access
    const shouldHaveCredentials = updateData.portal_access_enabled === true || 
                                 body.create_credentials === "true" || 
                                 body.update_credentials === "true";

    console.log('Should have credentials:', shouldHaveCredentials);
    console.log('Password provided:', body.password ? 'Yes' : 'No');

    if (shouldHaveCredentials && body.password) {
      try {
        const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
        
        // Check if credentials exist
        const credentials = await TenantModel.getCredentialsByTenantIds([id]);
        
        if (credentials && credentials.length > 0) {
          // Update existing credentials
          await TenantModel.updateCredential(id, { password_hash });
          console.log('Credentials updated for tenant:', id);
        } else {
          // Create new credentials
          await TenantModel.createCredential({
            tenant_id: id,
            email: body.email || existingTenant.email,
            password_hash,
          });
          console.log('Credentials created for tenant:', id);
        }
      } catch (credErr) {
        console.error("Failed to update credentials:", credErr);
      }
    } else if (shouldHaveCredentials && !body.password) {
      console.log('Portal access enabled but no password provided - credentials not updated');
    }

    // Fetch the updated tenant to return
    const updatedTenant = await TenantModel.findById(id);

    return res.json({ 
      success: true, 
      message: "Tenant updated successfully", 
      data: updatedTenant,
      additional_documents: updateData.additional_documents || []
    });
  } catch (err) {
    console.error("TenantController.update error:", err);
    
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

// Soft delete tenant
async softDelete(req, res) {
  try {
    const id = req.params.id;
    
    // Check if tenant exists
    const tenant = await TenantModel.findById(id);
    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: "Tenant not found" 
      });
    }

    const deleted = await TenantModel.softDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    return res.json({
      success: true,
      message: "Tenant moved to trash successfully",
    });
  } catch (err) {
    console.error("TenantController.softDelete error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to soft delete tenant",
    });
  }
},

// Restore tenant
async restore(req, res) {
  try {
    const id = req.params.id;
    
    const restored = await TenantModel.restore(id);

    if (!restored) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    return res.json({
      success: true,
      message: "Tenant restored successfully",
    });
  } catch (err) {
    console.error("TenantController.restore error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to restore tenant",
    });
  }
},

// Get deleted tenants
async getDeleted(req, res) {
  try {
    const tenants = await TenantModel.getDeletedTenants();
    return res.json({
      success: true,
      data: tenants,
    });
  } catch (err) {
    console.error("TenantController.getDeleted error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch deleted tenants",
    });
  }
},


async remove(req, res) {
  try {
    const id = req.params.id;

    const deleted = await TenantModel.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    return res.json({
      success: true,
      message: "Tenant deleted successfully",
    });

  } catch (err) {
    console.error("TenantController.remove error:", err);

    // Foreign key constraint check
    if (
      err.code === "ER_ROW_IS_REFERENCED_2" ||
      err.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This tenant cannot be deleted because related records exist (payments, bookings, etc).",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete tenant",
    });
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


 async import(req, res) {
    try {
      console.log("📥 Tenant import request received");
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      console.log("📁 File received:", req.file.originalname);

      // Read Excel file
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      console.log(`📊 Found ${data.length} rows in Excel`);

      const created = [];
      const errors = [];

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // +2 for header row

        console.log(`🔍 Processing row ${rowNum}:`, row);

        try {
          // Validate required fields
          const fullName = row['Full Name'] || row['full_name'] || row['FULL NAME'];
          if (!fullName) {
            errors.push(`Row ${rowNum}: Full Name is required`);
            continue;
          }

          const email = row['Email'] || row['email'] || row['EMAIL'];
          if (!email) {
            errors.push(`Row ${rowNum}: Email is required`);
            continue;
          }

          const phone = row['Phone'] || row['phone'] || row['PHONE'];
          if (!phone) {
            errors.push(`Row ${rowNum}: Phone is required`);
            continue;
          }

          // Validate phone number (Indian format)
          const phoneStr = phone.toString().replace(/\D/g, '');
          if (!/^[6-9]\d{9}$/.test(phoneStr)) {
            errors.push(`Row ${rowNum}: Invalid Indian mobile number (must be 10 digits starting with 6-9)`);
            continue;
          }

          const gender = row['Gender'] || row['gender'] || row['GENDER'];
          if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
            errors.push(`Row ${rowNum}: Gender is required (Male/Female/Other)`);
            continue;
          }

          const address = row['Address'] || row['address'] || row['ADDRESS'];
          if (!address) {
            errors.push(`Row ${rowNum}: Address is required`);
            continue;
          }

          const city = row['City'] || row['city'] || row['CITY'];
          if (!city) {
            errors.push(`Row ${rowNum}: City is required`);
            continue;
          }

          const state = row['State'] || row['state'] || row['STATE'];
          if (!state) {
            errors.push(`Row ${rowNum}: State is required`);
            continue;
          }

          // Parse boolean fields
          const portalAccess = (row['Portal Access'] || row['portal_access'] || 'Yes').toString().toLowerCase();
          const portalAccessEnabled = portalAccess === 'yes' || portalAccess === 'true' || portalAccess === '1';

          const status = (row['Status'] || row['status'] || 'Active').toString().toLowerCase();
          const isActive = status === 'active' || status === 'yes' || status === '1';

          // Parse lock-in period
          const lockinPeriodMonths = parseInt(row['Lock-in Period (months)'] || row['lockin_period_months'] || 0);
          const lockinPenaltyAmount = parseFloat(row['Lock-in Penalty Amount'] || row['lockin_penalty_amount'] || 0);
          const lockinPenaltyType = (row['Lock-in Penalty Type'] || row['lockin_penalty_type'] || 'fixed').toString().toLowerCase();

          // Parse notice period
          const noticePeriodDays = parseInt(row['Notice Period (days)'] || row['notice_period_days'] || 0);
          const noticePenaltyAmount = parseFloat(row['Notice Penalty Amount'] || row['notice_penalty_amount'] || 0);
          const noticePenaltyType = (row['Notice Penalty Type'] || row['notice_penalty_type'] || 'fixed').toString().toLowerCase();

          // Parse preferred property ID
          let preferredPropertyId = null;
          const propId = row['Preferred Property ID'] || row['preferred_property_id'] || row['Preferred Property'];
          if (propId) {
            preferredPropertyId = parseInt(propId);
          }

          // Prepare tenant data
          const tenantData = {
            salutation: row['Salutation'] || row['salutation'] || null,
            full_name: fullName.toString().trim(),
            email: email.toString().toLowerCase().trim(),
            country_code: row['Country Code'] || row['country_code'] || '+91',
            phone: phoneStr,
            gender: gender,
            date_of_birth: row['Date of Birth'] || row['date_of_birth'] || null,
            occupation_category: row['Occupation Category'] || row['occupation_category'] || null,
            exact_occupation: row['Exact Occupation'] || row['exact_occupation'] || null,
            address: address.toString().trim(),
            city: city.toString().trim(),
            state: state.toString().trim(),
            pincode: row['Pincode'] || row['pincode'] || null,
            emergency_contact_name: row['Emergency Contact Name'] || row['emergency_contact_name'] || null,
            emergency_contact_phone: row['Emergency Contact Phone'] || row['emergency_contact_phone'] || null,
            emergency_contact_relation: row['Emergency Contact Relation'] || row['emergency_contact_relation'] || null,
            preferred_sharing: row['Preferred Sharing'] || row['preferred_sharing'] || null,
            preferred_room_type: row['Preferred Room Type'] || row['preferred_room_type'] || null,
            preferred_property_id: preferredPropertyId,
            check_in_date: row['Check-in Date'] || row['check_in_date'] || null,
            portal_access_enabled: portalAccessEnabled,
            is_active: isActive,
            lockin_period_months: lockinPeriodMonths,
            lockin_penalty_amount: lockinPenaltyAmount,
            lockin_penalty_type: lockinPenaltyType,
            notice_period_days: noticePeriodDays,
            notice_penalty_amount: noticePenaltyAmount,
            notice_penalty_type: noticePenaltyType,
            additional_documents: []
          };

          console.log(`✅ Creating tenant:`, tenantData.full_name);

          // Create tenant
          const tenantId = await TenantModel.create(tenantData);

          // Create default password for portal access
          if (portalAccessEnabled) {
            try {
              const defaultPassword = phoneStr.slice(-6); // Last 6 digits of phone
              const password_hash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
              
              await TenantModel.createCredential({
                tenant_id: tenantId,
                email: tenantData.email,
                password_hash,
              });
              
              console.log(`🔑 Created login credentials for tenant ${tenantId}`);
            } catch (credErr) {
              console.error(`Failed to create credentials for tenant ${tenantId}:`, credErr);
              // Don't fail the import, just log the error
            }
          }

          created.push({
            id: tenantId,
            name: tenantData.full_name,
            email: tenantData.email
          });

        } catch (err) {
          console.error(`❌ Error processing row ${rowNum}:`, err);
          errors.push(`Row ${rowNum}: ${err.message}`);
        }
      }

      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
        console.log("✅ Temporary file deleted");
      } catch (err) {
        console.error("Error deleting temp file:", err);
      }

      console.log(`📊 Import complete: ${created.length} created, ${errors.length} errors`);

      return res.json({
        success: true,
        message: `Successfully imported ${created.length} tenants`,
        count: created.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error("❌ Import error:", error);
      
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }

      return res.status(500).json({
        success: false,
        message: "Failed to import tenants",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

};

module.exports = TenantController;