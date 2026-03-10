// controllers/staffcontroller.js
const staffModel = require("../models/staffModel");
const db = require("../config/db");
const path = require("path");
const fs = require("fs");

// Delete old file if it exists
const deleteOldFile = (fileUrl) => {
    if (!fileUrl) return;
    
    try {
        // Extract filename from URL
        const filename = path.basename(fileUrl);
        const filePath = path.join(__dirname, '../uploads/staff-documents', filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Deleted old file:', filePath);
        }
    } catch (error) {
        console.error('Error deleting old file:', error);
    }
};

// Build file URL for response
const buildFileUrl = (filename) => {
    if (!filename) return null;
    // Check if it's already a full URL
    if (filename.startsWith('http') || filename.startsWith('/uploads')) {
        return filename;
    }
    return `/uploads/staff-documents/${filename}`;
};

// GET ALL STAFF
exports.getStaff = async (req, res) => {
  try {
    const staff = await staffModel.getAll();
    
    // Remove passwords from response
    const staffWithUrls = staff.map(member => {
      const { password, ...memberWithoutPassword } = member;
      return {
        ...memberWithoutPassword,
        aadhar_document_url: member.aadhar_document_url ? buildFileUrl(path.basename(member.aadhar_document_url)) : null,
        pan_document_url: member.pan_document_url ? buildFileUrl(path.basename(member.pan_document_url)) : null,
        photo_url: member.photo_url ? buildFileUrl(path.basename(member.photo_url)) : null
      };
    });

    res.json({
      success: true,
      data: staffWithUrls
    });
  } catch (error) {
    console.error("Error getting staff:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff"
    });
  }
};

// CREATE STAFF with file upload and password
exports.createStaff = async (req, res) => {
  try {
    const files = req.files;
    const body = req.body;

    console.log("Creating staff with data:", { ...body, password: '***' });

    // Parse boolean fields
    const is_whatsapp_same = body.is_whatsapp_same === 'true' || body.is_whatsapp_same === '1' || body.is_whatsapp_same === true;
    
    // Apply WhatsApp logic
    let whatsapp_number = body.whatsapp_number || '';
    if (is_whatsapp_same) {
      whatsapp_number = body.phone || '';
    }

    // Prepare data for insertion
    const staffData = {
      salutation: body.salutation || "mr",
      name: body.name,
      email: body.email,
      password: body.password,
      phone: body.phone,
      phone_country_code: body.phone_country_code || '+91',
      whatsapp_number: whatsapp_number || null,
      is_whatsapp_same: is_whatsapp_same ? 1 : 0,
      role: body.role,
      employee_id: body.employee_id,
      salary: body.salary || 0,
      department: body.department === 'no-department' ? null : body.department,
      joining_date: body.joining_date,
      blood_group: body.blood_group || "not_specified",
      aadhar_number: body.aadhar_number || null,
      pan_number: body.pan_number || null,
      current_address: body.current_address || null,
      permanent_address: body.permanent_address || null,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      emergency_contact_relation: body.emergency_contact_relation || null,
      bank_account_holder_name: body.bank_account_holder_name || null,
      bank_account_number: body.bank_account_number || null,
      bank_name: body.bank_name || null,
      bank_ifsc_code: body.bank_ifsc_code || null,
      upi_id: body.upi_id || null,
    };

    // Handle file uploads
    if (files) {
      if (files.aadhar_document && files.aadhar_document[0]) {
        staffData.aadhar_document_url = files.aadhar_document[0].filename;
      }
      if (files.pan_document && files.pan_document[0]) {
        staffData.pan_document_url = files.pan_document[0].filename;
      }
      if (files.photo && files.photo[0]) {
        staffData.photo_url = files.photo[0].filename;
      }
    }

    // Validate required fields
    if (!staffData.name || !staffData.email || !staffData.phone || !staffData.password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and password are required fields"
      });
    }

    // Create staff and user record
    const result = await require("../models/staffModel").create(staffData);
    
    if (!result) {
      throw new Error("Failed to create staff record");
    }

    // Prepare response data (remove password)
    const { password, ...staffWithoutPassword } = result;

    res.status(201).json({
      success: true,
      message: "Staff created successfully",
      data: {
        ...staffWithoutPassword,
        aadhar_document_url: staffData.aadhar_document_url ? buildFileUrl(staffData.aadhar_document_url) : null,
        pan_document_url: staffData.pan_document_url ? buildFileUrl(staffData.pan_document_url) : null,
        photo_url: staffData.photo_url ? buildFileUrl(staffData.photo_url) : null
      }
    });

  } catch (error) {
    console.error("Error creating staff:", error);
    
    // Handle duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.sqlMessage.includes('email')) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }
      if (error.sqlMessage.includes('employee_id')) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists"
        });
      }
    }
    
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create staff"
    });
  }
};

// UPDATE STAFF with file upload
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;
    const body = req.body;

    console.log("Updating staff:", id, { ...body, password: body.password ? '***' : undefined });

    // Get existing staff data
    const staffModel = require("../models/staffModel");
    const existing = await staffModel.getById(id);
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Staff not found"
      });
    }
    
    // Parse boolean fields
    const is_whatsapp_same = body.is_whatsapp_same === 'true' || body.is_whatsapp_same === '1' || body.is_whatsapp_same === true;
    
    // Apply WhatsApp logic
    let whatsapp_number = body.whatsapp_number !== undefined ? body.whatsapp_number : existing.whatsapp_number;
    if (is_whatsapp_same) {
      whatsapp_number = body.phone || existing.phone;
    }

    // Prepare update data
    const updateData = {
      salutation: body.salutation !== undefined ? body.salutation : existing.salutation,
      name: body.name !== undefined ? body.name : existing.name,
      email: body.email !== undefined ? body.email : existing.email,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      phone_country_code: body.phone_country_code !== undefined ? body.phone_country_code : existing.phone_country_code,
      whatsapp_number: whatsapp_number,
      is_whatsapp_same: is_whatsapp_same ? 1 : 0,
      role: body.role !== undefined ? body.role : existing.role,
      employee_id: body.employee_id !== undefined ? body.employee_id : existing.employee_id,
      salary: body.salary !== undefined ? body.salary : existing.salary,
      department: body.department !== undefined ? body.department : existing.department,
      joining_date: body.joining_date !== undefined ? body.joining_date : existing.joining_date,
      blood_group: body.blood_group !== undefined ? body.blood_group : existing.blood_group,
      aadhar_number: body.aadhar_number !== undefined ? body.aadhar_number : existing.aadhar_number,
      pan_number: body.pan_number !== undefined ? body.pan_number : existing.pan_number,
      current_address: body.current_address !== undefined ? body.current_address : existing.current_address,
      permanent_address: body.permanent_address !== undefined ? body.permanent_address : existing.permanent_address,
      emergency_contact_name: body.emergency_contact_name !== undefined ? body.emergency_contact_name : existing.emergency_contact_name,
      emergency_contact_phone: body.emergency_contact_phone !== undefined ? body.emergency_contact_phone : existing.emergency_contact_phone,
      emergency_contact_relation: body.emergency_contact_relation !== undefined ? body.emergency_contact_relation : existing.emergency_contact_relation,
      bank_account_holder_name: body.bank_account_holder_name !== undefined ? body.bank_account_holder_name : existing.bank_account_holder_name,
      bank_account_number: body.bank_account_number !== undefined ? body.bank_account_number : existing.bank_account_number,
      bank_name: body.bank_name !== undefined ? body.bank_name : existing.bank_name,
      bank_ifsc_code: body.bank_ifsc_code !== undefined ? body.bank_ifsc_code : existing.bank_ifsc_code,
      upi_id: body.upi_id !== undefined ? body.upi_id : existing.upi_id,
      is_active: body.is_active !== undefined ? (body.is_active === 'true' || body.is_active === '1' || body.is_active === true ? 1 : 0) : existing.is_active
    };

    // Handle password if provided
    if (body.password && body.password.trim() !== '') {
      updateData.password = body.password;
    }

    // Handle file uploads
    if (files) {
      if (files.aadhar_document && files.aadhar_document[0]) {
        if (existing.aadhar_document_url) {
          deleteOldFile(existing.aadhar_document_url);
        }
        updateData.aadhar_document_url = files.aadhar_document[0].filename;
      }
      
      if (files.pan_document && files.pan_document[0]) {
        if (existing.pan_document_url) {
          deleteOldFile(existing.pan_document_url);
        }
        updateData.pan_document_url = files.pan_document[0].filename;
      }
      
      if (files.photo && files.photo[0]) {
        if (existing.photo_url) {
          deleteOldFile(existing.photo_url);
        }
        updateData.photo_url = files.photo[0].filename;
      }
    }

    // Update staff and user records
    const updatedStaff = await staffModel.update(id, updateData);

    // Prepare response (remove password)
    const { password, ...staffWithoutPassword } = updatedStaff;

    res.json({
      success: true,
      message: "Staff updated successfully",
      data: {
        ...staffWithoutPassword,
        aadhar_document_url: updatedStaff.aadhar_document_url ? buildFileUrl(updatedStaff.aadhar_document_url) : null,
        pan_document_url: updatedStaff.pan_document_url ? buildFileUrl(updatedStaff.pan_document_url) : null,
        photo_url: updatedStaff.photo_url ? buildFileUrl(updatedStaff.photo_url) : null
      }
    });

  } catch (error) {
    console.error("Error updating staff:", error);
    
    if (error.message.includes("Email already exists")) {
      return res.status(400).json({
        success: false,
        message: "Email already exists in users table"
      });
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.sqlMessage.includes('email')) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }
      if (error.sqlMessage.includes('employee_id')) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists"
        });
      }
    }
    
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update staff"
    });
  }
};

// DELETE STAFF
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await staffModel.getById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Staff not found"
      });
    }
    
    // Delete associated files
    const documents = [
      { field: 'aadhar_document_url', value: existing.aadhar_document_url },
      { field: 'pan_document_url', value: existing.pan_document_url },
      { field: 'photo_url', value: existing.photo_url }
    ];

    documents.forEach(doc => {
      if (doc.value) {
        try {
          const filePath = path.join(__dirname, '../uploads/staff-documents', path.basename(doc.value));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.error(`Error deleting file ${doc.field}:`, error);
        }
      }
    });

    const result = await staffModel.delete(id);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff not found"
      });
    }

    res.json({
      success: true,
      message: "Staff deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting staff:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete staff"
    });
  }
};


exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;

    console.log("Deleting document:", { id, documentType });

    if (!documentType || !['aadhar_document', 'pan_document', 'photo'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document type"
      });
    }

    const staffModel = require("../models/staffModel");
    const existing = await staffModel.getById(id);
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Staff not found"
      });
    }

    const fieldName = `${documentType}_url`;
    const fileName = existing[fieldName];

    console.log("Existing document URL:", fileName);

    // Delete the file if it exists
    if (fileName) {
      try {
        const filename = path.basename(fileName);
        const filePath = path.join(__dirname, '../uploads/staff-documents', filename);
        
        console.log("Attempting to delete file:", filePath);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("File deleted successfully");
        }
      } catch (error) {
        console.error(`Error deleting document file:`, error);
        // Continue even if file deletion fails - we still want to update the database
      }
    }

    // CRITICAL FIX: Use a direct database query to ensure the update happens
    const db = require("../config/db");
    
    // First, verify the current value
    const [checkResult] = await db.query(
      `SELECT ${fieldName} FROM staff WHERE id = ?`,
      [id]
    );
    console.log(`Current ${fieldName} in DB:`, checkResult[0]?.[fieldName]);

    // Update the database directly
    const [updateResult] = await db.query(
      `UPDATE staff SET ${fieldName} = NULL WHERE id = ?`,
      [id]
    );
    
    console.log(`Update result:`, updateResult);
    
    if (updateResult.affectedRows === 0) {
      throw new Error("Database update failed - no rows affected");
    }

    // Verify the update worked
    const [verifyResult] = await db.query(
      `SELECT ${fieldName} FROM staff WHERE id = ?`,
      [id]
    );
    console.log(`After update - ${fieldName} in DB:`, verifyResult[0]?.[fieldName]);

    // Get the updated staff data with all fields
    const updatedStaff = await staffModel.getById(id);
    
    // Remove password from response
    const { password, ...staffWithoutPassword } = updatedStaff;

    // Build the response data with explicit null for the deleted document
    const responseData = {
      ...staffWithoutPassword,
      aadhar_document_url: updatedStaff.aadhar_document_url ? buildFileUrl(updatedStaff.aadhar_document_url) : null,
      pan_document_url: updatedStaff.pan_document_url ? buildFileUrl(updatedStaff.pan_document_url) : null,
      photo_url: updatedStaff.photo_url ? buildFileUrl(updatedStaff.photo_url) : null
    };

    console.log("Sending response data:", {
      aadhar: responseData.aadhar_document_url,
      pan: responseData.pan_document_url,
      photo: responseData.photo_url
    });

    res.json({
      success: true,
      message: "Document deleted successfully",
      data: responseData
    });

  } catch (error) {
    console.error("Error in deleteDocument:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete document"
    });
  }
};


exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Add a flag to bypass any caching
    const staff = await staffModel.getById(id);
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found"
      });
    }
    
    const { password, ...staffWithoutPassword } = staff;
    
    // Build the response with explicit null checks
    const responseData = {
      ...staffWithoutPassword,
      aadhar_document_url: staff.aadhar_document_url ? buildFileUrl(path.basename(staff.aadhar_document_url)) : null,
      pan_document_url: staff.pan_document_url ? buildFileUrl(path.basename(staff.pan_document_url)) : null,
      photo_url: staff.photo_url ? buildFileUrl(path.basename(staff.photo_url)) : null
    };
    
    console.log("getStaffById response:", {
      id: responseData.id,
      aadhar: responseData.aadhar_document_url,
      pan: responseData.pan_document_url,
      photo: responseData.photo_url
    });
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error("Error getting staff by id:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff"
    });
  }
};