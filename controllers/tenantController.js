// controllers/tenantController.js
const bcrypt = require("bcrypt");
const TenantModel = require("../models/tenantModel");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const { sendEmail } = require("../utils/emailService");
const { getTemplate, replaceVariables } = require("../utils/templateService");

const SALT_ROUNDS = 10;

// controllers/tenantController.js - Add this helper function

// Function to generate next couple ID
const generateNextCoupleId = async () => {
  // Query to find the highest couple_id number
  const [result] = await pool.query(
    `SELECT couple_id FROM tenants 
     WHERE couple_id IS NOT NULL 
     AND couple_id REGEXP '^C[0-9]+$'
     ORDER BY CAST(SUBSTRING(couple_id, 2) AS UNSIGNED) DESC 
     LIMIT 1`,
  );

  let nextNumber = 1;

  if (result.length > 0 && result[0].couple_id) {
    const currentNumber = parseInt(result[0].couple_id.substring(1));
    if (!isNaN(currentNumber)) {
      nextNumber = currentNumber + 1;
    }
  }

  // Format as C001, C002, C003, etc. (3 digits with leading zeros)
  return `C${nextNumber.toString().padStart(3, "0")}`;
};

// Helper function to check if tenant has any payments
const hasTenantPayments = async (tenantId) => {
  try {
    const [payments] = await pool.query(
      `SELECT id FROM payments 
       WHERE tenant_id = ? 
       AND status IN ('approved', 'pending', 'paid')
       LIMIT 1`,
      [tenantId]
    );
    return payments.length > 0;
  } catch (err) {
    console.error("Error checking tenant payments:", err);
    return false;
  }
}

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
      const is_active =
        req.query.is_active !== undefined
          ? req.query.is_active === "true" || req.query.is_active === "1"
          : undefined;
      const portal_access_enabled =
        req.query.portal_access_enabled !== undefined
          ? req.query.portal_access_enabled === "true" ||
            req.query.portal_access_enabled === "1"
          : undefined;
      const has_credentials =
        req.query.has_credentials !== undefined
          ? req.query.has_credentials === "true" ||
            req.query.has_credentials === "1"
          : undefined;
      const includeDeleted = req.query.include_deleted === "true";

      // NEW: Vacate status filter
      const vacate_status = req.query.vacate_status || undefined; // 'vacated', 'active', 'all'

       let result; // <-- DECLARE result HERE

    if (includeDeleted && vacate_status === "vacated") {
      result = await TenantModel.findDeletedVacatedTenants({
        search,
        page,
        pageSize,
        gender,
        occupation_category,
        city,
        state,
      });
    } else {
      // Use regular findAll for other cases
      result = await TenantModel.findAll({
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
        vacate_status,
      });
    }
      const tenantRows = result.rows;

      // get bookings, payments and credentials
      const tenantIds = tenantRows.map((t) => t.id);
      const bookings = tenantIds.length
        ? await TenantModel.getBookingsForTenantIds(tenantIds)
        : [];
      const payments = tenantIds.length
        ? await TenantModel.getPaymentsForTenantIds(tenantIds)
        : [];
      const credentials = tenantIds.length
        ? await TenantModel.getCredentialsByTenantIds(tenantIds)
        : [];

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
            state: b.property_state || null,
          },
          room: {
            room_number: b.room_number,
            room_type: b.room_type,
            sharing_type: b.sharing_type,
            floor: b.floor,
          },
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
          created_at: p.created_at,
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
        portal_access_enabled:
          t.portal_access_enabled === 1 || t.portal_access_enabled === true,
      }));

      return res.json({
        success: true,
        data: finalRows,
        meta: {
          total: result.total,
          page,
          pageSize,
          filters: {
            vacate_status, // Return applied filter
          },
        },
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
    // Use getTenantWithPartner instead of findById
    const tenant = await TenantModel.getTenantWithPartner(id);

    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }

    // Get property details if property_id exists
    let propertyDetails = null;
    if (tenant.property_id) {
      try {
        const [propRows] = await pool.query(
          "SELECT id, name, lockin_period_months, lockin_penalty_amount, lockin_penalty_type, notice_period_days, notice_penalty_amount, notice_penalty_type FROM properties WHERE id = ?",
          [tenant.property_id],
        );
        propertyDetails = propRows[0] || null;
      } catch (propErr) {
        console.error("Failed to fetch property details:", propErr);
      }
    }

    const bookings = await TenantModel.getBookingsForTenantIds([tenant.id]);
    const payments = await TenantModel.getPaymentsForTenantIds([tenant.id]);
    const credentials = await TenantModel.getCredentialsByTenantIds([tenant.id]);
    const vacateRecords = await TenantModel.getVacateRecordsByTenantId(tenant.id);
    const hasVacated = vacateRecords.length > 0;

    const formattedBookings = bookings.map((b) => ({
      id: b.id,
      status: b.status,
      monthly_rent: Number(b.monthly_rent || 0),
      properties: {
        name: b.property_name || null,
        city: b.property_city || null,
        state: b.property_state || null,
      },
      room: {
        room_number: b.room_number,
        room_type: b.room_type,
        sharing_type: b.sharing_type,
        floor: b.floor,
      },
    }));

    return res.json({
      success: true,
      data: {
        ...tenant,
        property_details: propertyDetails,
        bookings: formattedBookings || [],
        payments: payments || [],
        has_credentials: credentials && credentials.length ? true : false,
        credential_email: credentials && credentials[0] ? credentials[0].email : null,
        has_vacated: hasVacated,
        vacate_records: vacateRecords,
      },
    });
  } catch (err) {
    console.error("TenantController.getById error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch tenant" });
  }
},

  async checkExistence(req, res) {
    try {
      const { email, phone } = req.query;

      if (!email && !phone) {
        return res.status(400).json({
          success: false,
          message: "Either email or phone is required",
        });
      }

      let matchedField = null;
      let tenant = null;

      // Check by email first
      if (email) {
        const [emailTenants] = await pool.query(
          `SELECT 
          t.id, 
          t.full_name, 
          t.email, 
          t.phone, 
          t.gender,
          t.is_active,
          ba.id as assignment_id,
          ba.room_id,
          ba.bed_number,
          r.room_number as assigned_room,
          p.name as property_name
         FROM tenants t
         LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = FALSE
         LEFT JOIN rooms r ON ba.room_id = r.id
         LEFT JOIN properties p ON r.property_id = p.id
         WHERE t.email = ? AND t.deleted_at IS NULL`,
          [email],
        );

        if (emailTenants.length > 0) {
          tenant = emailTenants[0];
          matchedField = "email";
        }
      }

      // If not found by email, check by phone
      if (!tenant && phone) {
        const [phoneTenants] = await pool.query(
          `SELECT 
          t.id, 
          t.full_name, 
          t.email, 
          t.phone, 
          t.gender,
          t.is_active,
          ba.id as assignment_id,
          ba.room_id,
          ba.bed_number,
          r.room_number as assigned_room,
          p.name as property_name
         FROM tenants t
         LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = FALSE
         LEFT JOIN rooms r ON ba.room_id = r.id
         LEFT JOIN properties p ON r.property_id = p.id
         WHERE t.phone = ? AND t.deleted_at IS NULL`,
          [phone],
        );

        if (phoneTenants.length > 0) {
          tenant = phoneTenants[0];
          matchedField = "phone";
        }
      }

      if (tenant) {
        // Check if tenant has active assignment
        const hasActiveAssignment = tenant.assignment_id !== null;

        return res.json({
          success: true,
          exists: true,
          matched_field: matchedField,
          tenant: {
            id: tenant.id,
            full_name: tenant.full_name,
            email: tenant.email,
            phone: tenant.phone,
            gender: tenant.gender,
            is_active: tenant.is_active === 1,
            has_active_assignment: hasActiveAssignment,
            assigned_room: tenant.assigned_room || null,
            assigned_bed: tenant.bed_number || null,
            property_name: tenant.property_name || null,
          },
        });
      }

      return res.json({
        success: true,
        exists: false,
        tenant: null,
      });
    } catch (error) {
      console.error("Error checking tenant existence:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check tenant existence",
      });
    }
  },

async create(req, res) {
  try {
    const body = req.body || {};
    const files = req.files || {};

    // Process uploaded files
    const uploadedFiles = {};

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

      additionalDocs = additionalFiles.map((file) => ({
        filename: file.originalname,
        url: `/uploads/additional_docs/${file.filename}`,
        uploaded_at: new Date().toISOString(),
        document_type: "Additional",
        file_size: file.size,
        file_mimetype: file.mimetype,
      }));
    }

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

    // Parse numeric fields
    const parseNumber = (value, defaultValue = 0) => {
      if (value === undefined || value === null || value === "")
        return defaultValue;
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    const parseIntValue = (value, defaultValue = null) => {
      if (value === undefined || value === null || value === "")
        return defaultValue;
      const num = parseInt(value);
      return isNaN(num) ? defaultValue : num;
    };


    // Check if this is a couple booking (partner_full_name exists in request)
    const isCoupleBooking = body.partner_full_name && body.partner_full_name.trim() !== "";

    // If couple booking, create two separate tenant records
    if (isCoupleBooking) {
      // Primary tenant data
      // Primary tenant data (remove property_name)
const primaryTenantData = {
  salutation: body.salutation || null,
  full_name: body.full_name,
  email: body.email,
  phone: body.phone,
  country_code: body.country_code || "+91",
  gender: body.gender,
  date_of_birth: body.date_of_birth || null,
  occupation_category: body.occupation_category || null,
  exact_occupation: body.exact_occupation || null,
  occupation: body.occupation || null,
  organization: body.organization || null,
  years_of_experience: body.years_of_experience ? parseIntValue(body.years_of_experience) : null,
  monthly_income: body.monthly_income ? parseNumber(body.monthly_income) : null,
  course_duration: body.course_duration || null,
  student_id: body.student_id || null,
  employee_id: body.employee_id || null,
  portfolio_url: body.portfolio_url || null,
  work_mode: body.work_mode || null,
  shift_timing: body.shift_timing || null,
  portal_access_enabled: body.portal_access_enabled === "true" || body.portal_access_enabled === true || false,
  is_active: body.is_active === undefined || body.is_active === "" ? true : body.is_active === "true" || body.is_active === true || body.is_active === "1",
  address: body.address || null,
  city: body.city || null,
  state: body.state || null,
  pincode: body.pincode || null,
  preferred_sharing: body.preferred_sharing || null,
  preferred_room_type: body.preferred_room_type || null,
  preferred_property_id: body.preferred_property_id ? parseIntValue(body.preferred_property_id) : null,
  property_id: body.property_id ? parseIntValue(body.property_id) : null,
  check_in_date: body.check_in_date || null,
  emergency_contact_name: body.emergency_contact_name || null,
  emergency_contact_phone: body.emergency_contact_phone || null,
  emergency_contact_relation: body.emergency_contact_relation || null,
  emergency_contact_email: body.emergency_contact_email || null,
  lockin_period_months: body.lockin_period_months ? parseIntValue(body.lockin_period_months) : 0,
  lockin_penalty_amount: body.lockin_penalty_amount ? parseNumber(body.lockin_penalty_amount) : 0,
  lockin_penalty_type: body.lockin_penalty_type || "fixed",
  notice_period_days: body.notice_period_days ? parseIntValue(body.notice_period_days) : 0,
  notice_penalty_amount: body.notice_penalty_amount ? parseNumber(body.notice_penalty_amount) : 0,
  notice_penalty_type: body.notice_penalty_type || "fixed",
  aadhar_number: body.aadhar_number || null,
  pan_number: body.pan_number || null,
  id_proof_type: body.id_proof_type || null,
  address_proof_type: body.address_proof_type || null,
  id_proof_number: body.id_proof_number || null,
  address_proof_number: body.address_proof_number || null,
  id_proof_url: uploadedFiles.id_proof_url || null,
  address_proof_url: uploadedFiles.address_proof_url || null,
  photo_url: uploadedFiles.photo_url || null,
  additional_documents: additionalDocs,
  // property_name: propertyName,  // ← REMOVE THIS LINE
  is_primary_tenant: true,
};

      // Partner tenant data
      // Prepare partner tenant data - COPY relevant fields from primary tenant
const partnerTenantData = {
  // Personal info (from partner form)
  salutation: body.partner_salutation || null,
  full_name: body.partner_full_name,
  email: body.partner_email || null,
  phone: body.partner_phone || null,
  country_code: body.partner_country_code || "+91",
  gender: body.partner_gender || null,
  date_of_birth: body.partner_date_of_birth || null,
  
  // Occupation fields (from partner form)
  occupation_category: body.partner_occupation_category || null,
  occupation: body.partner_occupation || null,
  organization: body.partner_organization || null,
  
  // Address - COPY FROM PRIMARY TENANT (same address)
  address: body.address || null,  // ← Same as primary tenant
  city: body.city || null,        // ← Same as primary tenant
  state: body.state || null,      // ← Same as primary tenant
  pincode: body.pincode || null,  // ← Same as primary tenant
  
  // Property Assignment - COPY FROM PRIMARY TENANT
  property_id: body.property_id ? parseIntValue(body.property_id) : null,  // ← Same property
  check_in_date: body.check_in_date || null,  // ← Same check-in date
  
  // Rental Terms - COPY FROM PRIMARY TENANT
  lockin_period_months: body.lockin_period_months ? parseIntValue(body.lockin_period_months) : 0,
  lockin_penalty_amount: body.lockin_penalty_amount ? parseNumber(body.lockin_penalty_amount) : 0,
  lockin_penalty_type: body.lockin_penalty_type || "fixed",
  notice_period_days: body.notice_period_days ? parseIntValue(body.notice_period_days) : 0,
  notice_penalty_amount: body.notice_penalty_amount ? parseNumber(body.notice_penalty_amount) : 0,
  notice_penalty_type: body.notice_penalty_type || "fixed",
  
  // Status
  portal_access_enabled: false,  // Partners don't get portal access by default
  is_active: true,
  
  // Emergency Contact (optional - can be same or different)
  emergency_contact_name: body.emergency_contact_name || null,
  emergency_contact_phone: body.emergency_contact_phone || null,
  emergency_contact_relation: body.emergency_contact_relation || null,
  emergency_contact_email: body.emergency_contact_email || null,
  
  // Documents (separate for partner)
  id_proof_url: null,
  address_proof_url: null,
  photo_url: null,
  id_proof_type: body.partner_id_proof_type || null,
  id_proof_number: body.partner_id_proof_number || null,
  address_proof_type: body.partner_address_proof_type || null,
  address_proof_number: body.partner_address_proof_number || null,
  is_primary_tenant: false,
};

      // Handle partner document uploads if any
      if (files.partner_id_proof_url && files.partner_id_proof_url[0]) {
        partnerTenantData.id_proof_url = `/uploads/partner_id_proofs/${files.partner_id_proof_url[0].filename}`;
      }
      if (files.partner_address_proof_url && files.partner_address_proof_url[0]) {
        partnerTenantData.address_proof_url = `/uploads/partner_address_proofs/${files.partner_address_proof_url[0].filename}`;
      }
      if (files.partner_photo_url && files.partner_photo_url[0]) {
        partnerTenantData.photo_url = `/uploads/partner_photos/${files.partner_photo_url[0].filename}`;
      }

      // Create both tenants with couple linking
      const coupleResult = await TenantModel.createCoupleTenants(primaryTenantData, partnerTenantData);

      // Create credentials for primary tenant if password provided
      if (body.password && (body.create_credentials === "true" || body.create_credentials === true)) {
        try {
          const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
          await TenantModel.createCredential({
            tenant_id: coupleResult.primary_tenant_id,
            email: body.email,
            password_hash,
          });
        } catch (credErr) {
          console.error("Failed to create credentials:", credErr);
        }
      }

      // Send welcome email
      if (body.password && (body.create_credentials === "true" || body.create_credentials === true || primaryTenantData.portal_access_enabled === true)) {
        try {
          const template = await getTemplate("credentials", "email");
          const emailSubject = replaceVariables(template.subject, { property_name: propertyName });
          const emailBody = replaceVariables(template.content, {
            tenant_name: primaryTenantData.full_name,
            property_name: propertyName,
            email: body.email,
            password: body.password,
            account_status: "created",
            login_url: "https://roomac.in/login",
          });
          await sendEmail(body.email, emailSubject || "Welcome to Roomac", emailBody);
        } catch (emailErr) {
          console.error("Failed to send welcome email:", emailErr);
        }
      }

      return res.status(201).json({
        success: true,
        message: "Couple tenants created successfully",
        tenant_id: coupleResult.primary_tenant_id,
        partner_tenant_id: coupleResult.partner_tenant_id,
        couple_id: coupleResult.couple_id,
        additional_documents: additionalDocs,
      });
    }

    // ========== NON-COUPLE BOOKING (Single Tenant) ==========
    const tenantData = {
      salutation: body.salutation || null,
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      country_code: body.country_code || "+91",
      gender: body.gender,
      date_of_birth: body.date_of_birth || null,
      occupation_category: body.occupation_category || null,
      exact_occupation: body.exact_occupation || null,
      occupation: body.occupation || null,
      organization: body.organization || null,
      years_of_experience: body.years_of_experience ? parseIntValue(body.years_of_experience) : null,
      monthly_income: body.monthly_income ? parseNumber(body.monthly_income) : null,
      course_duration: body.course_duration || null,
      student_id: body.student_id || null,
      employee_id: body.employee_id || null,
      portfolio_url: body.portfolio_url || null,
      work_mode: body.work_mode || null,
      shift_timing: body.shift_timing || null,
      portal_access_enabled: body.portal_access_enabled === "true" || body.portal_access_enabled === true || false,
      is_active: body.is_active === undefined || body.is_active === "" ? true : body.is_active === "true" || body.is_active === true || body.is_active === "1",
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      pincode: body.pincode || null,
      preferred_sharing: body.preferred_sharing || null,
      preferred_room_type: body.preferred_room_type || null,
      preferred_property_id: body.preferred_property_id ? parseIntValue(body.preferred_property_id) : null,
      property_id: body.property_id ? parseIntValue(body.property_id) : null,
      property_name: propertyName || null,
      check_in_date: body.check_in_date || null,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      emergency_contact_relation: body.emergency_contact_relation || null,
      emergency_contact_email: body.emergency_contact_email || null,
      lockin_period_months: body.lockin_period_months ? parseIntValue(body.lockin_period_months) : 0,
      lockin_penalty_amount: body.lockin_penalty_amount ? parseNumber(body.lockin_penalty_amount) : 0,
      lockin_penalty_type: body.lockin_penalty_type || "fixed",
      notice_period_days: body.notice_period_days ? parseIntValue(body.notice_period_days) : 0,
      notice_penalty_amount: body.notice_penalty_amount ? parseNumber(body.notice_penalty_amount) : 0,
      notice_penalty_type: body.notice_penalty_type || "fixed",
      aadhar_number: body.aadhar_number || null,
      pan_number: body.pan_number || null,
      id_proof_type: body.id_proof_type || null,
      address_proof_type: body.address_proof_type || null,
      id_proof_number: body.id_proof_number || null,
      address_proof_number: body.address_proof_number || null,
      ...uploadedFiles,
      additional_documents: additionalDocs,
      is_couple_booking: false,
      is_primary_tenant: false
    };

    // Validate required fields
    const required = ["full_name", "email", "phone"];
    const missing = required.filter((field) => !tenantData[field]);
    if (missing.length > 0) {
      if (req.files) {
        Object.values(req.files).forEach((fileArray) => {
          if (fileArray && fileArray.length > 0) {
            fileArray.forEach((file) => {
              if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
            });
          }
        });
      }
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // Check for existing tenant
    const existingTenant = await TenantModel.findByEmailOrPhone(
      tenantData.email,
      tenantData.phone,
      true
    );

    if (existingTenant) {
      if (existingTenant.deleted_at) {
        await TenantModel.restore(existingTenant.id);
        const updateData = { ...tenantData };
        delete updateData.id_proof_url;
        delete updateData.address_proof_url;
        delete updateData.photo_url;
        await TenantModel.update(existingTenant.id, updateData);
        
        if (body.password && (body.create_credentials === "true" || body.create_credentials === true)) {
          const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
          await TenantModel.createCredential({
            tenant_id: existingTenant.id,
            email: body.email,
            password_hash,
          });
        }
        
        return res.status(200).json({
          success: true,
          message: "Existing deleted tenant restored and updated successfully",
          tenant_id: existingTenant.id,
          restored: true,
        });
      } else {
        if (req.files) {
          Object.values(req.files).forEach((fileArray) => {
            if (fileArray && fileArray.length > 0) {
              fileArray.forEach((file) => {
                if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
              });
            }
          });
        }
        return res.status(400).json({
          success: false,
          message: "Tenant with this email or phone already exists",
        });
      }
    }

    // Create single tenant
    const tenantId = await TenantModel.create(tenantData);

    if (body.password && (body.create_credentials === "true" || body.create_credentials === true)) {
      const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
      await TenantModel.createCredential({
        tenant_id: tenantId,
        email: body.email,
        password_hash,
      });
    }

    if (body.password && (body.create_credentials === "true" || body.create_credentials === true || tenantData.portal_access_enabled === true)) {
      try {
        const template = await getTemplate("credentials", "email");
        const emailSubject = replaceVariables(template.subject, { property_name: propertyName });
        const emailBody = replaceVariables(template.content, {
          tenant_name: tenantData.full_name,
          property_name: propertyName,
          email: body.email,
          password: body.password,
          account_status: "created",
          login_url: "https://roomac.in/login",
        });
        await sendEmail(body.email, emailSubject || "Welcome to Roomac", emailBody);
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr);
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
    if (req.files) {
      Object.values(req.files).forEach((fileArray) => {
        if (fileArray && fileArray.length > 0) {
          fileArray.forEach((file) => {
            if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
          });
        }
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create tenant: " + err.message,
    });
  }
},

async sendCredentials(req, res) {
  try {
    const tenantId = req.params.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Get tenant details
    const tenant = await TenantModel.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // Get property name
    let propertyName = "Roomac";
    if (tenant.property_id) {
      const [[property]] = await pool.query(
        "SELECT name FROM properties WHERE id = ?",
        [tenant.property_id]
      );
      if (property && property.name) {
        propertyName = property.name;
      }
    }

    // Get company address from settings
    const [settings] = await pool.query(
      "SELECT value FROM app_settings WHERE setting_key = 'site_name'"
    );
    const companyAddress = settings.length > 0 ? settings[0].value : "Your Address Here";

    // Hash the password
    const bcrypt = require("bcrypt");
    const SALT_ROUNDS = 10;
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Check if credentials already exist
    const credentials = await TenantModel.getCredentialsByTenantIds([tenantId]);
    const hasCredentials = credentials && credentials.length > 0;

    // Save/Update credentials in database
    if (!hasCredentials) {
      // Create new credentials
      await TenantModel.createCredential({
        tenant_id: tenantId,
        email: tenant.email,
        password_hash,
      });
      console.log(`✅ Credentials created for tenant ${tenantId}`);
    } else {
      // Update existing credentials
      await TenantModel.updateCredential(tenantId, {
        password_hash,
        email: tenant.email,
      });
      console.log(`✅ Credentials updated for tenant ${tenantId}`);
    }

    // Also update portal_access_enabled in tenants table
    await pool.query(
      "UPDATE tenants SET portal_access_enabled = 1 WHERE id = ?",
      [tenantId]
    );

    // Get email template for credentials
    const template = await getTemplate("credentials", "email");

    // Replace variables in subject
    const emailSubject = replaceVariables(template.subject, {
      tenant_name: tenant.full_name,
      property_name: propertyName,
      account_status: hasCredentials ? "updated" : "created",
      email: tenant.email,
      password: password,
      year: new Date().getFullYear(),
      company_address: companyAddress,
      login_link: "https://roomac.in/login"
    });

    // Replace variables in content
    const emailBody = replaceVariables(template.content, {
      tenant_name: tenant.full_name,
      property_name: propertyName,
      account_status: hasCredentials ? "updated" : "created",
      email: tenant.email,
      password: password,
      year: new Date().getFullYear(),
      company_address: companyAddress,
      login_link: "https://roomac.in/login"
    });

    // Send email
    await sendEmail(
      tenant.email,
      emailSubject || "Your Roomac Account is Ready",
      emailBody
    );

    console.log(`✅ Credentials email sent to ${tenant.email}`);

    return res.json({
      success: true,
      message: "Credentials saved and email sent successfully",
      data: {
        email: tenant.email,
        has_credentials: true,
      },
    });
  } catch (error) {
    console.error("Error sending credentials email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send credentials email: " + error.message,
    });
  }
},

async update(req, res) {
  let connection; 
  try {
    const requestedId = req.params.id;
    const body = req.body || {};
    const files = req.files || {};

    // First, get the tenant with partner details to understand which tenant we're editing
    const tenantWithPartner = await TenantModel.getTenantWithPartner(requestedId);
    
    // Determine which tenant ID we should actually update
    let actualTenantId = requestedId;
    let isUpdatingPrimary = false;
    let isUpdatingPartner = false;
    
    if (tenantWithPartner && tenantWithPartner.is_couple_booking) {
      // Check if the form is updating the partner section vs main section
      const hasPartnerData = body.partner_full_name || body.partner_phone || body.partner_email;
      
      // The tenant we're actually editing (the one we clicked Edit on)
      const isEditingPrimary = tenantWithPartner.is_editing_primary === true;
      const isEditingPartner = tenantWithPartner.is_editing_partner === true;
      
      console.log('isEditingPrimary:', isEditingPrimary);
      console.log('isEditingPartner:', isEditingPartner);
      console.log('hasPartnerData:', hasPartnerData);
      
      if (isEditingPrimary) {
        // We clicked Edit on PRIMARY tenant
        if (hasPartnerData) {
          // User modified partner section -> update the PARTNER tenant
          actualTenantId = tenantWithPartner.partner_id;
          isUpdatingPartner = true;
          console.log('Editing PRIMARY, updating PARTNER tenant:', actualTenantId);
        } else {
          // User modified main section -> update the PRIMARY tenant
          actualTenantId = tenantWithPartner.id;
          isUpdatingPrimary = true;
          console.log('Editing PRIMARY, updating PRIMARY tenant:', actualTenantId);
        }
      } else if (isEditingPartner) {
        // We clicked Edit on PARTNER tenant
        if (hasPartnerData) {
          // User modified partner section -> update the PRIMARY tenant (because partner section holds primary data)
          actualTenantId = tenantWithPartner.id;
          isUpdatingPrimary = true;
          console.log('Editing PARTNER, updating PRIMARY tenant:', actualTenantId);
        } else {
          // User modified main section -> update the PARTNER tenant (because main section holds partner data when editing partner)
          actualTenantId = tenantWithPartner.partner_id;
          isUpdatingPartner = true;
          console.log('Editing PARTNER, updating PARTNER tenant:', actualTenantId);
        }
      } else {
        // Fallback: use the requested ID
        actualTenantId = requestedId;
        console.log('Fallback, updating tenant:', actualTenantId);
      }
    }

    // Get existing tenant using the determined actualTenantId
    const existingTenant = await TenantModel.findById(actualTenantId);
    if (!existingTenant) {
      if (req.files) {
        Object.values(req.files).forEach((fileArray) => {
          if (fileArray && fileArray.length > 0) {
            fileArray.forEach((file) => {
              if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
            });
          }
        });
      }
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if check-in date is being changed
    const oldCheckInDate = existingTenant.check_in_date;
    const newCheckInDate = body.check_in_date;
    const isCheckInDateChanging = oldCheckInDate !== newCheckInDate && newCheckInDate;

    if (isCheckInDateChanging) {
      const hasPayments = await hasTenantPayments(actualTenantId);
      if (hasPayments) {
        await connection.rollback();
        connection.release();
        if (req.files) {
          Object.values(req.files).forEach((fileArray) => {
            if (fileArray && fileArray.length > 0) {
              fileArray.forEach((file) => {
                if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
              });
            }
          });
        }
        return res.status(400).json({
          success: false,
          message: "Cannot change check-in date. Tenant has existing payment transactions.",
          hasPayments: true,
          paymentsExist: true
        });
      }
    }

    // Handle file uploads
    const updateData = {};

    // Process main documents
    const processMainDocument = (fieldName, folder, existingUrl) => {
      if (files[fieldName] && files[fieldName][0]) {
        const file = files[fieldName][0];
        updateData[fieldName] = `/uploads/${folder}/${file.filename}`;
        if (existingUrl) {
          const oldPath = existingUrl.replace("/uploads/", "uploads/");
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (unlinkErr) {}
          }
        }
        return true;
      }
      return false;
    };

    processMainDocument("id_proof_url", "id_proofs", existingTenant.id_proof_url);
    processMainDocument("address_proof_url", "address_proofs", existingTenant.address_proof_url);
    processMainDocument("photo_url", "photos", existingTenant.photo_url);

    // Process partner documents
    const processPartnerDocument = (fieldName, folder, existingUrl) => {
      if (files[fieldName] && files[fieldName][0]) {
        const file = files[fieldName][0];
        updateData[fieldName] = `/uploads/${folder}/${file.filename}`;
        if (existingUrl) {
          const oldPath = existingUrl.replace("/uploads/", "uploads/");
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (unlinkErr) {}
          }
        }
        return true;
      }
      return false;
    };

    processPartnerDocument("partner_id_proof_url", "partner_id_proofs", existingTenant.partner_id_proof_url);
    processPartnerDocument("partner_address_proof_url", "partner_address_proofs", existingTenant.partner_address_proof_url);
    processPartnerDocument("partner_photo_url", "partner_photos", existingTenant.partner_photo_url);

    // Process additional documents
    let additionalDocs = existingTenant.additional_documents || [];
    const uniqueFiles = new Map();
    const fileFields = Object.keys(files);

    fileFields.forEach((field) => {
      if (field.includes("additional_documents") || field.includes("additional_docs") || field.includes("additional")) {
        const fileArray = Array.isArray(files[field]) ? files[field] : [files[field]];
        fileArray.forEach((file) => {
          if (file && file.filename && file.originalname) {
            const fileKey = `${file.originalname}_${file.size}`;
            if (!uniqueFiles.has(fileKey)) {
              uniqueFiles.set(fileKey, file);
            }
          }
        });
      }
    });

    const uniqueFileArray = Array.from(uniqueFiles.values());
    if (uniqueFileArray.length > 0) {
      const newDocs = uniqueFileArray.map((file) => ({
        filename: file.originalname,
        url: `/uploads/additional_docs/${file.filename}`,
        uploaded_at: new Date().toISOString(),
        document_type: "Additional",
        file_size: file.size,
        file_mimetype: file.mimetype,
      }));
      const existingFilenames = new Set(additionalDocs.map((doc) => doc.filename));
      const uniqueNewDocs = newDocs.filter((doc) => !existingFilenames.has(doc.filename));
      additionalDocs = [...additionalDocs, ...uniqueNewDocs];
      updateData.additional_documents = additionalDocs;
    }

    // Parse number fields
    const parseNumber = (value, defaultValue = 0) => {
      if (value === undefined || value === null || value === "") return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    const parseIntValue = (value, defaultValue = null) => {
      if (value === undefined || value === null || value === "") return defaultValue;
      const num = parseInt(value);
      return isNaN(num) ? defaultValue : num;
    };

    // Add lock-in period fields
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
    if (body.portal_access_enabled !== undefined) {
      updateData.portal_access_enabled = body.portal_access_enabled === "true" || body.portal_access_enabled === true || body.portal_access_enabled === "1";
    }
    

    // Independent fields (personal info for current tenant)
    const independentFields = [
      "salutation", "full_name", "email", "phone", "country_code", "gender", "date_of_birth",
      "occupation_category", "exact_occupation", "occupation", "organization",
      "years_of_experience", "monthly_income", "course_duration", "student_id",
      "employee_id", "portfolio_url", "work_mode", "shift_timing",
      "address", "city", "state", "pincode",
      "preferred_sharing", "preferred_room_type", "preferred_property_id",
      "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation", "emergency_contact_email",
      "aadhar_number", "pan_number", "id_proof_type", "address_proof_type", "id_proof_number", "address_proof_number",
      "is_active"
    ];

    independentFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] === "" ? null : body[field];
      }
    });

    // Handle check-in date change
    if (isCheckInDateChanging) {
      await connection.execute('DELETE FROM monthly_rent WHERE tenant_id = ?', [actualTenantId]);
      updateData.check_in_date = newCheckInDate;
    }

    // Update current tenant
    const ok = await TenantModel.update(actualTenantId, updateData);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Tenant not found or no changes" });
    }

    await connection.commit();
    connection.release();

    // Fetch updated tenant using the original requested ID (so the response shows the correct swapped data)
    const updatedTenant = await TenantModel.getTenantWithPartner(requestedId);

    return res.json({
      success: true,
      message: "Tenant updated successfully",
      data: updatedTenant,
      additional_documents: updateData.additional_documents || [],
    });
    
  } catch (err) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("TenantController.update error:", err);
    if (req.files) {
      Object.values(req.files).forEach((fileArray) => {
        if (fileArray && fileArray.length > 0) {
          fileArray.forEach((file) => {
            if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
          });
        }
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update tenant: " + err.message,
    });
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
          message: "Tenant not found",
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

      if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({
          success: false,
          message: "ids array required",
        });
      }

      await TenantModel.bulkDelete(ids);

      return res.json({
        success: true,
        message: `${ids.length} tenants deleted successfully`,
      });
    } catch (err) {
      console.error("TenantController.bulkDelete error:", err);

      // Foreign key constraint handling
      if (
        err.code === "ER_ROW_IS_REFERENCED_2" ||
        err.code === "ER_ROW_IS_REFERENCED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Some tenants cannot be deleted because related records exist (payments, bookings, etc).",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to delete tenants",
      });
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
        return res.status(400).json({
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
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          success: false,
          message: "Credentials already exist for this tenant",
        });
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
      const [[userCred]] = await pool.query(
        `select * from tenant_credentials where tenant_id = ?`,
        [tenant_id],
      );
      const ok = await TenantModel.updateCredential(tenant_id, {
        password_hash,
        email: userCred.email,
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
      const rows = await TenantModel.getAvailableRooms(gender, property_id);
      return res.json({ success: true, data: rows || [] });
    } catch (err) {
      console.error("TenantController.getAvailableRooms error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch available rooms: " + err.message,
      });
    }
  },

  async getAllProperties(req, res) {
    try {
      const rows = await TenantModel.getAllProperties();

      const properties = rows.map((property) => ({
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city_id,
        state: property.state,
        fullAddress: `${property.address}, ${property.city_id}, ${property.state}`,
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
        is_active:
          req.query.is_active !== undefined
            ? req.query.is_active === "true" || req.query.is_active === "1"
            : undefined,
        portal_access_enabled:
          req.query.portal_access_enabled !== undefined
            ? req.query.portal_access_enabled === "true" ||
              req.query.portal_access_enabled === "1"
            : undefined,
      };

      const data = await TenantModel.exportTenants(filters);

      if (!data || data.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "No data to export" });
      }

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data);

      const wscols = [
        { wch: 10 },
        { wch: 25 },
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 10 },
        { wch: 20 },
        { wch: 25 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
      ];
      ws["!cols"] = wscols;

      xlsx.utils.book_append_sheet(wb, ws, "Tenants");

      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      const date = new Date().toISOString().split("T")[0];
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="tenants_${date}.xlsx"`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buf);
    } catch (err) {
      console.error("TenantController.exportToExcel error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to export data: " + err.message,
      });
    }
  },

  async uploadDocument(req, res) {
    try {
      const tenantId = req.params.tenantId;
      const files = req.files || {};

      // Check if tenant exists
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) {
        // Clean up uploaded files
        Object.values(files).forEach((fileArray) => {
          if (fileArray && fileArray.length > 0) {
            fileArray.forEach((file) => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          }
        });
        return res
          .status(404)
          .json({ success: false, message: "Tenant not found" });
      }

      const uploadedFiles = [];
      const updateData = {};

      // Process ID proof
      if (files.id_proof_file && files.id_proof_file[0]) {
        const file = files.id_proof_file[0];
        const fileUrl = `/uploads/id_proofs/${file.filename}`;
        updateData.id_proof_url = fileUrl;
        uploadedFiles.push({
          type: "id_proof",
          url: fileUrl,
          filename: file.originalname,
          size: file.size,
        });
      }

      // Process address proof
      if (files.address_proof_file && files.address_proof_file[0]) {
        const file = files.address_proof_file[0];
        const fileUrl = `/uploads/address_proofs/${file.filename}`;
        updateData.address_proof_url = fileUrl;
        uploadedFiles.push({
          type: "address_proof",
          url: fileUrl,
          filename: file.originalname,
          size: file.size,
        });
      }

      // Process photo
      if (files.photo_file && files.photo_file[0]) {
        const file = files.photo_file[0];
        const fileUrl = `/uploads/photos/${file.filename}`;
        updateData.photo_url = fileUrl;
        uploadedFiles.push({
          type: "photo",
          url: fileUrl,
          filename: file.originalname,
          size: file.size,
        });
      }

      // Update tenant if any main documents were uploaded
      if (Object.keys(updateData).length > 0) {
        await TenantModel.update(tenantId, updateData);
      }

      return res.json({
        success: true,
        message: "Documents uploaded successfully",
        uploaded_files: uploadedFiles,
      });
    } catch (err) {
      console.error("TenantController.uploadDocument error:", err);

      // Clean up uploaded files on error
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

      return res.status(500).json({
        success: false,
        message: "Failed to upload documents: " + err.message,
      });
    }
  },

  async getRoomTypes(req, res) {
    try {
      const result = await TenantModel.getRoomTypes();
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error("TenantController.getRoomTypes error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch room types: " + err.message,
      });
    }
  },

  // NEW METHODS FOR FETCHING OPTIONS
  async getPreferredOptions(req, res) {
    try {
      const options = await TenantModel.getPreferredOptions();

      // Also get gender options from database or hardcode
      const genderOptions = ["Male", "Female", "Other"];

      return res.json({
        success: true,
        data: {
          ...options,
          genderOptions,
          countryCodes: ["+91", "+1", "+44", "+61", "+65"], // Add more as needed
        },
      });
    } catch (err) {
      console.error("TenantController.getPreferredOptions error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch options: " + err.message,
      });
    }
  },

  async getSharingTypes(req, res) {
    try {
      const sharingTypes = await TenantModel.getPreferredSharingOptions();
      return res.json({
        success: true,
        data: sharingTypes,
      });
    } catch (err) {
      console.error("TenantController.getSharingTypes error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch sharing types: " + err.message,
      });
    }
  },

  async getRoomTypeOptions(req, res) {
    try {
      const roomTypes = await TenantModel.getPreferredRoomTypeOptions();
      return res.json({
        success: true,
        data: roomTypes,
      });
    } catch (err) {
      console.error("TenantController.getRoomTypeOptions error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch room types: " + err.message,
      });
    }
  },

  async getProperties(req, res) {
    try {
      const properties = await TenantModel.getPropertyOptions();
      return res.json({
        success: true,
        data: properties,
      });
    } catch (err) {
      console.error("TenantController.getProperties error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch properties: " + err.message,
      });
    }
  },

  async getOccupationalCategories(req, res) {
    try {
      const categories = await TenantModel.getOccupationalOptions();
      return res.json({
        success: true,
        data: categories,
      });
    } catch (err) {
      console.error("TenantController.getOccupationalCategories error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch occupational categories: " + err.message,
      });
    }
  },

  async getLocationOptions(req, res) {
    try {
      const [cities] = await pool.query(
        "SELECT DISTINCT city FROM tenants WHERE city IS NOT NULL AND city != '' ORDER BY city",
      );
      const [states] = await pool.query(
        "SELECT DISTINCT state FROM tenants WHERE state IS NOT NULL AND state != '' ORDER BY state",
      );

      return res.json({
        success: true,
        data: {
          cities: cities.map((row) => row.city),
          states: states.map((row) => row.state),
        },
      });
    } catch (err) {
      console.error("TenantController.getLocationOptions error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch location options: " + err.message,
      });
    }
  },

  // Diagnostic endpoint
  async diagnostic(req, res) {
    try {
      // Check tenants table structure
      const [columns] = await pool.query("DESCRIBE tenants");

      // Check required fields
      const requiredColumns = ["full_name", "email", "phone"];
      const missingColumns = requiredColumns.filter(
        (col) => !columns.find((c) => c.Field === col),
      );

      // Check if all columns in model match
      const modelColumns = [
        "full_name",
        "email",
        "phone",
        "country_code",
        "gender",
        "date_of_birth",
        "occupation_category",
        "exact_occupation",
        "occupation",
        "portal_access_enabled",
        "is_active",
        "id_proof_url",
        "address_proof_url",
        "photo_url",
        "address",
        "city",
        "state",
        "pincode",
        "preferred_sharing",
        "preferred_room_type",
        "preferred_property_id",
        "created_at",
        "updated_at",
      ];

      const columnNames = columns.map((col) => col.Field);
      const extraColumns = columnNames.filter(
        (col) => !modelColumns.includes(col),
      );
      const missingInDB = modelColumns.filter(
        (col) => !columnNames.includes(col),
      );

      return res.json({
        success: true,
        data: {
          totalColumns: columns.length,
          columnNames: columnNames,
          requiredColumns: {
            expected: requiredColumns,
            missing: missingColumns,
          },
          schemaIssues: {
            extraColumns: extraColumns,
            missingColumns: missingInDB,
          },
          environment: process.env.NODE_ENV || "development",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("Diagnostic error:", err);
      return res.status(500).json({
        success: false,
        message: "Diagnostic failed: " + err.message,
      });
    }
  },

  // Add this function to tenantController.js
  async listWithAssignments(req, res) {
    try {
      const filters = req.query;
      const result = await TenantModel.findWithAssignments(filters);

      // Get bookings, payments and credentials as usual
      const tenantIds = result.rows.map((t) => t.id);
      const bookings = tenantIds.length
        ? await TenantModel.getBookingsForTenantIds(tenantIds)
        : [];
      const payments = tenantIds.length
        ? await TenantModel.getPaymentsForTenantIds(tenantIds)
        : [];
      const credentials = tenantIds.length
        ? await TenantModel.getCredentialsByTenantIds(tenantIds)
        : [];

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
            state: b.property_state || null,
          },
          room: {
            room_number: b.room_number,
            room_type: b.room_type,
            sharing_type: b.sharing_type,
            floor: b.floor,
          },
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
              current_assignment:
                assignments.length > 0 ? assignments[0] : null,
              assignments: assignments, // Include all assignments if needed
            };
          } catch (error) {
            console.error(
              `Error fetching assignment for tenant ${tenant.id}:`,
              error,
            );
            return tenant; // Return tenant without assignment on error
          }
        }),
      );

      res.json({
        success: true,
        data: tenantsWithAssignments,
        count: tenantsWithAssignments.length,
      });
    } catch (err) {
      console.error("TenantController.listWithAssignments error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to load tenants with assignments",
      });
    }
  },

  async import(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      // Read Excel file
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      const created = [];
      const errors = [];

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // +2 for header row

        try {
          // Validate required fields
          const fullName =
            row["Full Name"] || row["full_name"] || row["FULL NAME"];
          if (!fullName) {
            errors.push(`Row ${rowNum}: Full Name is required`);
            continue;
          }

          const email = row["Email"] || row["email"] || row["EMAIL"];
          if (!email) {
            errors.push(`Row ${rowNum}: Email is required`);
            continue;
          }

          const phone = row["Phone"] || row["phone"] || row["PHONE"];
          if (!phone) {
            errors.push(`Row ${rowNum}: Phone is required`);
            continue;
          }

          // Validate phone number
          let phoneStr = phone.toString().replace(/\D/g, "");
          const countryCode =
            row["Country Code"] || row["country_code"] || "+91";

          // Remove country code from phone if present
          if (phoneStr.startsWith(countryCode.replace("+", ""))) {
            phoneStr = phoneStr.slice(countryCode.replace("+", "").length);
          }

          if (!/^[6-9]\d{9}$/.test(phoneStr)) {
            errors.push(
              `Row ${rowNum}: Invalid Indian mobile number (must be 10 digits starting with 6-9)`,
            );
            continue;
          }

          const gender = row["Gender"] || row["gender"] || row["GENDER"];
          if (
            !gender ||
            !["Male", "Female", "Other", "Prefer not to say"].includes(gender)
          ) {
            errors.push(
              `Row ${rowNum}: Gender is required (Male/Female/Other/Prefer not to say)`,
            );
            continue;
          }

          const address = row["Address"] || row["address"] || row["ADDRESS"];
          if (!address) {
            errors.push(`Row ${rowNum}: Address is required`);
            continue;
          }

          const city = row["City"] || row["city"] || row["CITY"];
          if (!city) {
            errors.push(`Row ${rowNum}: City is required`);
            continue;
          }

          const state = row["State"] || row["state"] || row["STATE"];
          if (!state) {
            errors.push(`Row ${rowNum}: State is required`);
            continue;
          }

          // Parse boolean fields
          const portalAccess = (
            row["Portal Access"] ||
            row["portal_access"] ||
            "Yes"
          )
            .toString()
            .toLowerCase();
          const portalAccessEnabled =
            portalAccess === "yes" ||
            portalAccess === "true" ||
            portalAccess === "1";

          const status = (row["Status"] || row["status"] || "Active")
            .toString()
            .toLowerCase();
          const isActive =
            status === "active" || status === "yes" || status === "1";

          // Parse lock-in period
          const lockinPeriodMonths = parseInt(
            row["Lock-in Period (months)"] || row["lockin_period_months"] || 0,
          );
          const lockinPenaltyAmount = parseFloat(
            row["Lock-in Penalty Amount"] || row["lockin_penalty_amount"] || 0,
          );
          const lockinPenaltyType = (
            row["Lock-in Penalty Type"] ||
            row["lockin_penalty_type"] ||
            "fixed"
          )
            .toString()
            .toLowerCase();

          // Parse notice period
          const noticePeriodDays = parseInt(
            row["Notice Period (days)"] || row["notice_period_days"] || 0,
          );
          const noticePenaltyAmount = parseFloat(
            row["Notice Penalty Amount"] || row["notice_penalty_amount"] || 0,
          );
          const noticePenaltyType = (
            row["Notice Penalty Type"] ||
            row["notice_penalty_type"] ||
            "fixed"
          )
            .toString()
            .toLowerCase();

          // Parse preferred property ID
          let preferredPropertyId = null;
          const propId =
            row["Preferred Property ID"] ||
            row["preferred_property_id"] ||
            row["Preferred Property"];
          if (propId) {
            preferredPropertyId = parseInt(propId);
          }

          // Parse numeric fields
          const yearsOfExperience = row["Years of Experience"]
            ? parseInt(row["Years of Experience"])
            : null;
          const monthlyIncome = row["Monthly Income"]
            ? parseFloat(row["Monthly Income"])
            : null;

          // Parse partner information
          const isCoupleBooking = (
            row["Is Couple Booking"] ||
            row["is_couple_booking"] ||
            "No"
          )
            .toString()
            .toLowerCase();
          const isCouple =
            isCoupleBooking === "yes" ||
            isCoupleBooking === "true" ||
            isCoupleBooking === "1";

          let partnerData = null;
          if (isCouple) {
            const partnerPhone = row["Partner Phone"] || row["partner_phone"];
            let partnerPhoneStr = partnerPhone
              ? partnerPhone.toString().replace(/\D/g, "")
              : null;

            if (partnerPhoneStr) {
              const partnerCountryCode =
                row["Partner Country Code"] ||
                row["partner_country_code"] ||
                "+91";
              if (
                partnerPhoneStr.startsWith(partnerCountryCode.replace("+", ""))
              ) {
                partnerPhoneStr = partnerPhoneStr.slice(
                  partnerCountryCode.replace("+", "").length,
                );
              }
            }

            partnerData = {
              full_name:
                row["Partner Full Name"] || row["partner_full_name"] || null,
              phone: partnerPhoneStr,
              country_code:
                row["Partner Country Code"] ||
                row["partner_country_code"] ||
                "+91",
              email: row["Partner Email"] || row["partner_email"] || null,
              gender: row["Partner Gender"] || row["partner_gender"] || null,
              date_of_birth:
                row["Partner Date of Birth"] ||
                row["partner_date_of_birth"] ||
                null,
              occupation:
                row["Partner Occupation"] || row["partner_occupation"] || null,
              organization:
                row["Partner Organization"] ||
                row["partner_organization"] ||
                null,
              relationship:
                row["Partner Relationship"] ||
                row["partner_relationship"] ||
                null,
              address: row["Partner Address"] || row["partner_address"] || null,
              city: row["Partner City"] || row["partner_city"] || null,
              state: row["Partner State"] || row["partner_state"] || null,
              pincode: row["Partner Pincode"] || row["partner_pincode"] || null,
              id_proof_url:
                row["Partner ID Proof URL"] ||
                row["partner_id_proof_url"] ||
                null,
              id_proof_type:
                row["Partner ID Proof Type"] ||
                row["partner_id_proof_type"] ||
                null,
              address_proof_url:
                row["Partner Address Proof URL"] ||
                row["partner_address_proof_url"] ||
                null,
              address_proof_type:
                row["Partner Address Proof Type"] ||
                row["partner_address_proof_type"] ||
                null,
              photo_url:
                row["Partner Photo URL"] || row["partner_photo_url"] || null,
            };
          }

          // Parse additional documents
          let additionalDocs = [];
          const additionalDocsStr =
            row["Additional Documents"] || row["additional_documents"];
          if (additionalDocsStr) {
            try {
              additionalDocs =
                typeof additionalDocsStr === "string"
                  ? JSON.parse(additionalDocsStr)
                  : additionalDocsStr;
            } catch (e) {
              console.warn(
                `Row ${rowNum}: Invalid JSON in Additional Documents`,
              );
            }
          }

          // Prepare tenant data
          const tenantData = {
            // Personal Information
            salutation: row["Salutation"] || row["salutation"] || null,
            full_name: fullName.toString().trim(),
            email: email.toString().toLowerCase().trim(),
            country_code: countryCode,
            phone: phoneStr,
            gender: gender,
            date_of_birth: row["Date of Birth"] || row["date_of_birth"] || null,

            // Occupation Details
            occupation_category:
              row["Occupation Category"] || row["occupation_category"] || null,
            exact_occupation:
              row["Exact Occupation"] || row["exact_occupation"] || null,
            occupation: row["Occupation"] || row["occupation"] || null,
            organization: row["Organization"] || row["organization"] || null,
            years_of_experience: yearsOfExperience,
            monthly_income: monthlyIncome,
            course_duration:
              row["Course Duration"] || row["course_duration"] || null,
            student_id: row["Student ID"] || row["student_id"] || null,
            employee_id: row["Employee ID"] || row["employee_id"] || null,
            portfolio_url: row["Portfolio URL"] || row["portfolio_url"] || null,
            work_mode: row["Work Mode"] || row["work_mode"] || null,
            shift_timing: row["Shift Timing"] || row["shift_timing"] || null,

            // Address Information
            address: address.toString().trim(),
            city: city.toString().trim(),
            state: state.toString().trim(),
            pincode: row["Pincode"] || row["pincode"] || null,

            // Emergency Contact
            emergency_contact_name:
              row["Emergency Contact Name"] ||
              row["emergency_contact_name"] ||
              null,
            emergency_contact_phone:
              row["Emergency Contact Phone"] ||
              row["emergency_contact_phone"] ||
              null,
            emergency_contact_relation:
              row["Emergency Contact Relation"] ||
              row["emergency_contact_relation"] ||
              null,

            // Room Preferences
            preferred_sharing:
              row["Preferred Sharing"] || row["preferred_sharing"] || null,
            preferred_room_type:
              row["Preferred Room Type"] || row["preferred_room_type"] || null,
            preferred_property_id: preferredPropertyId,

            // Booking Details
            check_in_date: row["Check-in Date"] || row["check_in_date"] || null,

            // Account Settings
            portal_access_enabled: portalAccessEnabled,
            is_active: isActive,

            // Document URLs
            id_proof_url: row["ID Proof URL"] || row["id_proof_url"] || null,
            address_proof_url:
              row["Address Proof URL"] || row["address_proof_url"] || null,
            photo_url: row["Photo URL"] || row["photo_url"] || null,
            aadhar_number: row["Aadhar Number"] || row["aadhar_number"] || null,
            pan_number: row["PAN Number"] || row["pan_number"] || null,
            id_proof_type: row["ID Proof Type"] || row["id_proof_type"] || null,
            address_proof_type:
              row["Address Proof Type"] || row["address_proof_type"] || null,

            // Lock-in Period Details
            lockin_period_months: lockinPeriodMonths,
            lockin_penalty_amount: lockinPenaltyAmount,
            lockin_penalty_type: lockinPenaltyType,

            // Notice Period Details
            notice_period_days: noticePeriodDays,
            notice_penalty_amount: noticePenaltyAmount,
            notice_penalty_type: noticePenaltyType,

            // Additional Data
            additional_documents: additionalDocs,

            // Partner Information
            is_couple_booking: isCouple,
            partner_data: partnerData,
          };

          // Create tenant
          const tenantId = await TenantModel.create(tenantData);

          // Create partner tenant if couple booking
          let partnerTenantId = null;
          if (isCouple && partnerData && partnerData.full_name) {
            try {
              const partnerTenantData = {
                ...partnerData,
                is_partner: true,
                couple_id: tenantId,
                portal_access_enabled: false, // Partners don't get separate portal access
                is_active: true,
              };
              partnerTenantId = await TenantModel.create(partnerTenantData);

              // Update the original tenant with couple_id
              await TenantModel.update(tenantId, {
                couple_id: partnerTenantId,
              });
            } catch (partnerErr) {
              console.error(
                `Failed to create partner for tenant ${tenantId}:`,
                partnerErr,
              );
              errors.push(
                `Row ${rowNum}: Failed to create partner record - ${partnerErr.message}`,
              );
            }
          }

          // Create default password for portal access
          if (portalAccessEnabled) {
            try {
              const defaultPassword = phoneStr.slice(-6); // Last 6 digits of phone
              const password_hash = await bcrypt.hash(
                defaultPassword,
                SALT_ROUNDS,
              );

              await TenantModel.createCredential({
                tenant_id: tenantId,
                email: tenantData.email,
                password_hash,
              });
            } catch (credErr) {
              console.error(
                `Failed to create credentials for tenant ${tenantId}:`,
                credErr,
              );
              // Don't fail the import, just log the error
            }
          }

          created.push({
            id: tenantId,
            name: tenantData.full_name,
            email: tenantData.email,
            is_couple: isCouple,
            partner_id: partnerTenantId,
          });
        } catch (err) {
          console.error(`❌ Error processing row ${rowNum}:`, err);
          errors.push(`Row ${rowNum}: ${err.message}`);
        }
      }

      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Error deleting temp file:", err);
      }

      return res.json({
        success: true,
        message: `Successfully imported ${created.length} tenants`,
        count: created.length,
        errors: errors.length > 0 ? errors : undefined,
        created: created,
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
  

async sendBirthdayWishes(req, res) {
  try {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayDate = `${month}-${day}`;
    
    console.log(`🎂 Running birthday cron job for ${today.toLocaleDateString()}`);
    
    // 🎯 Get today's birthday tenants
    const [tenants] = await pool.query(`
      SELECT id, full_name, email, property_id
      FROM tenants
      WHERE DATE_FORMAT(date_of_birth, '%m-%d') = ?
      AND is_active = 1
      AND deleted_at IS NULL
      AND email IS NOT NULL
      AND email != ''
    `, [todayDate]);
    
    console.log(`🎂 Found ${tenants.length} tenants with birthday today`);
    
    let sent = 0;
    let failed = 0;
    
    for (const tenant of tenants) {
      try {
        let propertyName = "Roomac"; // default value
        
        if (tenant.property_id) {
          const [[property]] = await pool.query(
            "SELECT name FROM properties WHERE id = ?",
            [tenant.property_id]
          );
          if (property && property.name) {
            propertyName = property.name;
          }
        }
        
        // Get company address from settings
        const [settings] = await pool.query(
          "SELECT value FROM app_settings WHERE setting_key = 'company_address'"
        );
        const companyAddress = settings.length > 0 ? settings[0].value : "Your Address Here";
        
        // Get birthday template - category = 'birthday'
        const template = await getTemplate("birthday", "email");
        
        // Replace variables (only tenant_name, year, company_address as per your template)
        const emailSubject = replaceVariables(template.subject, {
          tenant_name: tenant.full_name,
          year: new Date().getFullYear(),
          company_address: companyAddress
        });
        
        const emailBody = replaceVariables(template.content, {
          tenant_name: tenant.full_name,
          year: new Date().getFullYear(),
          company_address: companyAddress
        });
        
        // Send email
        await sendEmail(
          tenant.email,
          emailSubject || "Happy Birthday! 🎉",
          emailBody
        );
        
        console.log(`🎉 Birthday email sent to ${tenant.email} (${tenant.full_name})`);
        sent++;
        
      } catch (error) {
        console.error(`❌ Failed to send birthday email to tenant ${tenant.id}:`, error.message);
        failed++;
      }
    }
    
    console.log(`📊 Birthday cron completed: ${sent} sent, ${failed} failed`);
    
    return res.json({
      success: true,
      message: "Birthday emails sent successfully",
      sent: sent,
      failed: failed,
      date: today.toLocaleDateString()
    });
    
  } catch (err) {
    console.error("❌ Birthday error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send birthday emails: " + err.message,
    });
  }
},

async getPrimaryTenantByCoupleId(req, res) {
  try {
    const { coupleId } = req.params;
    
    const [rows] = await pool.query(
      `SELECT * FROM tenants WHERE couple_id = ? AND is_primary_tenant = 1 LIMIT 1`,
      [coupleId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Primary tenant not found"
      });
    }
    
    const tenant = rows[0];
    
    // Format dates
    if (tenant.date_of_birth) {
      tenant.date_of_birth = new Date(tenant.date_of_birth).toISOString().split('T')[0];
    }
    if (tenant.partner_date_of_birth) {
      tenant.partner_date_of_birth = new Date(tenant.partner_date_of_birth).toISOString().split('T')[0];
    }
    
    return res.json({
      success: true,
      data: tenant
    });
  } catch (err) {
    console.error("getPrimaryTenantByCoupleId error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch primary tenant"
    });
  }
}

};

module.exports = TenantController;