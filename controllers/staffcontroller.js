// const Staff = require("../models/staffModel");
// const path = require('path');
// const fs = require('fs');

// // =========================
// // GET ALL STAFF
// // =========================
// exports.getStaff = async (req, res) => {
//   try {
//     const staff = await Staff.getAll();
//     res.json({
//       success: true,
//       data: staff,
//     });
//   } catch (err) {
//     console.error("GET STAFF ERROR:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch staff",
//     });
//   }
// };

// // =========================
// // CREATE STAFF
// // =========================
// exports.createStaff = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phone,
//       role,
//       employee_id,
//       joining_date,
//       salary,
//       is_whatsapp_same,
//       whatsapp_number,
//     } = req.body;

//     // ✅ REQUIRED FIELD VALIDATION
//     if (!name || !email || !phone || !role || !employee_id || !joining_date) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Name, Email, Phone, Role, Employee ID and Joining Date are required",
//       });
//     }

//     // ✅ WhatsApp logic validation
//     if (!is_whatsapp_same && !whatsapp_number) {
//       return res.status(400).json({
//         success: false,
//         message: "WhatsApp number is required when not same as phone",
//       });
//     }

//     const result = await Staff.create({
//       ...req.body,
//       salary: salary ? Number(salary) : 0,
//       is_whatsapp_same: is_whatsapp_same ? 1 : 0,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Staff added successfully",
//       id: result.insertId,
//     });
//   } catch (err) {
//     console.error("CREATE STAFF ERROR:", err);

//     // ✅ DUPLICATE HANDLING
//     if (err.code === "ER_DUP_ENTRY") {
//       return res.status(409).json({
//         success: false,
//         message: "Email or Employee ID already exists",
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: err.sqlMessage || "Failed to add staff",
//     });
//   }
// };

// // =========================
// // UPDATE STAFF
// // =========================
// exports.updateStaff = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "Staff ID is required",
//       });
//     }

//     // ✅ WhatsApp sync logic (controller-level safety)
//     if (req.body.is_whatsapp_same === 1 && req.body.phone) {
//       req.body.whatsapp_number = req.body.phone;
//     }

//     const result = await Staff.update(id, req.body);

//     if (!result.affectedRows) {
//       return res.status(404).json({
//         success: false,
//         message: "Staff not found",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Staff updated successfully",
//     });
//   } catch (err) {
//     console.error("UPDATE STAFF ERROR:", err);

//     if (err.code === "ER_DUP_ENTRY") {
//       return res.status(409).json({
//         success: false,
//         message: "Email or Employee ID already exists",
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: err.sqlMessage || "Failed to update staff",
//     });
//   }
// };

// // =========================
// // DELETE STAFF (HARD DELETE)
// // =========================
// exports.deleteStaff = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const result = await Staff.delete(id);

//     if (!result.affectedRows) {
//       return res.status(404).json({
//         success: false,
//         message: "Staff not found",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Staff deleted successfully",
//     });
//   } catch (err) {
//     console.error("DELETE STAFF ERROR:", err);

//     res.status(500).json({
//       success: false,
//       message: err.sqlMessage || "Failed to delete staff",
//     });
//   }
// };

// controllers/staffController.js
const staffModel = require("../models/staffModel");
const db = require("../config/db"); // Add this import
const path = require("path");
const fs = require("fs");

// Helper function to build file URL
const buildFileUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/staff-documents/${filename}`;
};

// Helper function to delete old file
const deleteOldFile = (fileUrl) => {
  if (fileUrl) {
    try {
      const oldPath = path.join(__dirname, '../uploads/staff-documents', path.basename(fileUrl));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log(`Deleted old file: ${oldPath}`);
      }
    } catch (error) {
      console.error(`Error deleting old file: ${error.message}`);
    }
  }
};

// GET ALL STAFF
exports.getStaff = async (req, res) => {
  try {
    const staff = await staffModel.getAll();
    
    // Convert file paths to URLs
    const staffWithUrls = staff.map(member => ({
      ...member,
      aadhar_document_url: member.aadhar_document_url ? buildFileUrl(path.basename(member.aadhar_document_url)) : null,
      pan_document_url: member.pan_document_url ? buildFileUrl(path.basename(member.pan_document_url)) : null,
      photo_url: member.photo_url ? buildFileUrl(path.basename(member.photo_url)) : null
    }));

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

// CREATE STAFF with file upload
exports.createStaff = async (req, res) => {
  try {
    const files = req.files;
    const body = req.body;

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
      phone: body.phone,
      whatsapp_number: whatsapp_number || null,
      is_whatsapp_same: is_whatsapp_same ? 1 : 0,
      role: body.role,
      employee_id: body.employee_id,
      salary: body.salary,
      department: body.department || null,
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
      is_active: 1
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
    if (!staffData.name || !staffData.email || !staffData.phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone are required fields"
      });
    }

    const result = await staffModel.create(staffData);
    
    res.status(201).json({
      success: true,
      message: "Staff created successfully",
      data: {
        id: result.insertId,
        ...staffData,
        aadhar_document_url: staffData.aadhar_document_url ? buildFileUrl(staffData.aadhar_document_url) : null,
        pan_document_url: staffData.pan_document_url ? buildFileUrl(staffData.pan_document_url) : null,
        photo_url: staffData.photo_url ? buildFileUrl(staffData.photo_url) : null
      }
    });

  } catch (error) {
    console.error("Error creating staff:", error);
    res.status(500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY' ? 'Email or Employee ID already exists' : 'Failed to create staff'
    });
  }
};

// UPDATE STAFF with file upload
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;
    const body = req.body;

    // Get existing staff data using the model method
    const [existingStaff] = await db.query("SELECT * FROM staff WHERE id = ?", [id]);
    if (!existingStaff || existingStaff.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff not found"
      });
    }

    const existing = existingStaff[0];
    
    // Parse boolean fields
    const is_whatsapp_same = body.is_whatsapp_same === 'true' || body.is_whatsapp_same === '1' || body.is_whatsapp_same === true;
    
    // Apply WhatsApp logic
    let whatsapp_number = body.whatsapp_number || existing.whatsapp_number;
    if (is_whatsapp_same) {
      whatsapp_number = body.phone || existing.phone;
    } else if (body.whatsapp_number === '') {
      whatsapp_number = null;
    }

    // Prepare update data
    const updateData = {
      salutation: body.salutation !== undefined ? body.salutation : existing.salutation,
      name: body.name !== undefined ? body.name : existing.name,
      email: body.email !== undefined ? body.email : existing.email,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      whatsapp_number,
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

    // Handle file uploads - only update if new file is provided
    if (files) {
      // Delete old files if new ones are uploaded
      if (files.aadhar_document && files.aadhar_document[0]) {
        if (existing.aadhar_document_url) {
          deleteOldFile(existing.aadhar_document_url);
        }
        updateData.aadhar_document_url = files.aadhar_document[0].filename;
      } else {
        updateData.aadhar_document_url = existing.aadhar_document_url;
      }
      
      if (files.pan_document && files.pan_document[0]) {
        if (existing.pan_document_url) {
          deleteOldFile(existing.pan_document_url);
        }
        updateData.pan_document_url = files.pan_document[0].filename;
      } else {
        updateData.pan_document_url = existing.pan_document_url;
      }
      
      if (files.photo && files.photo[0]) {
        if (existing.photo_url) {
          deleteOldFile(existing.photo_url);
        }
        updateData.photo_url = files.photo[0].filename;
      } else {
        updateData.photo_url = existing.photo_url;
      }
    } else {
      // Keep existing document URLs if not provided
      updateData.aadhar_document_url = existing.aadhar_document_url;
      updateData.pan_document_url = existing.pan_document_url;
      updateData.photo_url = existing.photo_url;
    }

    const result = await staffModel.update(id, updateData);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff not found or no changes made"
      });
    }

    res.json({
      success: true,
      message: "Staff updated successfully",
      data: {
        id,
        ...updateData,
        aadhar_document_url: updateData.aadhar_document_url ? buildFileUrl(updateData.aadhar_document_url) : null,
        pan_document_url: updateData.pan_document_url ? buildFileUrl(updateData.pan_document_url) : null,
        photo_url: updateData.photo_url ? buildFileUrl(updateData.photo_url) : null
      }
    });

  } catch (error) {
    console.error("Error updating staff:", error);
    res.status(500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY' ? 'Email or Employee ID already exists' : 'Failed to update staff'
    });
  }
};

// DELETE STAFF
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // Get staff data first to delete files
    const [existingStaff] = await db.query("SELECT * FROM staff WHERE id = ?", [id]);
    if (!existingStaff || existingStaff.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff not found"
      });
    }

    const staff = existingStaff[0];
    
    // Delete associated files
    const documents = [
      { field: 'aadhar_document_url', value: staff.aadhar_document_url },
      { field: 'pan_document_url', value: staff.pan_document_url },
      { field: 'photo_url', value: staff.photo_url }
    ];

    documents.forEach(doc => {
      if (doc.value) {
        try {
          const filePath = path.join(__dirname, '../uploads/staff-documents', path.basename(doc.value));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
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

// DELETE SPECIFIC DOCUMENT
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;

    if (!documentType || !['aadhar_document', 'pan_document', 'photo'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document type"
      });
    }

    // Get existing staff data
    const [existingStaff] = await db.query("SELECT * FROM staff WHERE id = ?", [id]);
    if (!existingStaff || existingStaff.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff not found"
      });
    }

    const staff = existingStaff[0];
    const fieldName = `${documentType}_url`;
    const fileName = staff[fieldName];

    // Delete the file if exists
    if (fileName) {
      try {
        const filePath = path.join(__dirname, '../uploads/staff-documents', path.basename(fileName));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted document: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error deleting document file:`, error);
      }
    }

    // Update database to remove file reference using the model
    const updateData = { [fieldName]: null };
    const result = await staffModel.update(id, updateData);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff not found"
      });
    }

    res.json({
      success: true,
      message: "Document deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete document"
    });
  }
};