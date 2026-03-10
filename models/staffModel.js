// const db = require("../config/db");

// // GET ALL STAFF
// exports.getAll = async () => {
//   const [rows] = await db.query("SELECT * FROM staff ORDER BY id DESC");
//   return rows;
// };

// exports.create = async (data) => {
//   const {
//     salutation,
//     name,
//     email,
//     phone,
//     whatsapp_number,
//     is_whatsapp_same,
//     role,
//     employee_id,
//     salary,
//     department,
//     joining_date,

//     blood_group,
//     aadhar_number,
//     pan_number,

//     current_address,
//     permanent_address,

//     emergency_contact_name,
//     emergency_contact_phone,
//     emergency_contact_relation,

//     bank_account_holder_name,
//     bank_account_number,
//     bank_name,
//     bank_ifsc_code,
//     upi_id,

//     aadhar_document_url,
//     pan_document_url,
//     photo_url,
//   } = data;

//   const finalWhatsapp =
//     is_whatsapp_same ? phone : whatsapp_number;

//   const [result] = await db.query(
//     `INSERT INTO staff (
//       salutation,
//       name,
//       email,
//       phone,
//       whatsapp_number,
//       is_whatsapp_same,
//       role,
//       employee_id,
//       salary,
//       department,
//       joining_date,

//       blood_group,
//       aadhar_number,
//       pan_number,

//       current_address,
//       permanent_address,

//       emergency_contact_name,
//       emergency_contact_phone,
//       emergency_contact_relation,

//       bank_account_holder_name,
//       bank_account_number,
//       bank_name,
//       bank_ifsc_code,
//       upi_id,

//       aadhar_document_url,
//       pan_document_url,
//       photo_url,
//       is_active
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
//     [
//       salutation || "mr",
//       name,
//       email,
//       phone,
//       finalWhatsapp || null,
//       is_whatsapp_same ? 1 : 0,
//       role,
//       employee_id,
//       salary,
//       department || null,
//       joining_date,

//       blood_group || "not_specified",
//       aadhar_number || null,
//       pan_number || null,

//       current_address || null,
//       permanent_address || null,

//       emergency_contact_name || null,
//       emergency_contact_phone || null,
//       emergency_contact_relation || null,

//       bank_account_holder_name || null,
//       bank_account_number || null,
//       bank_name || null,
//       bank_ifsc_code || null,
//       upi_id || null,

//       aadhar_document_url || null,
//       pan_document_url || null,
//       photo_url || null,
//     ]
//   );

//   return result;
// };


// // UPDATE STAFF (SAFE)
// exports.update = async (id, data) => {
//   const allowedFields = [
//     "salutation",
//     "name",
//     "email",
//     "phone",
//     "whatsapp_number",
//     "is_whatsapp_same",
//     "role",
//     "employee_id",
//     "salary",
//     "department",
//     "joining_date",
//     "blood_group",
//     "aadhar_number",
//     "pan_number",
//     "current_address",
//     "permanent_address",
//     "emergency_contact_name",
//     "emergency_contact_phone",
//     "emergency_contact_relation",
//     "bank_account_holder_name",
//     "bank_account_number",
//     "bank_name",
//     "bank_ifsc_code",
//     "upi_id",
//     "aadhar_document_url",
//     "pan_document_url",
//     "photo_url",
//     "is_active",
//   ];

//   const fields = [];
//   const values = [];

//   allowedFields.forEach((field) => {
//     if (data[field] !== undefined) {
//       fields.push(`${field} = ?`);
//       values.push(data[field]);
//     }
//   });

//   // WhatsApp sync logic
//   if (data.is_whatsapp_same === 1 && data.phone) {
//     fields.push("whatsapp_number = ?");
//     values.push(data.phone);
//   }

//   if (!fields.length) {
//     return { affectedRows: 0 };
//   }

//   values.push(id);

//   const [result] = await db.query(
//     `UPDATE staff SET ${fields.join(", ")} WHERE id = ?`,
//     values
//   );

//   return result;
// };


// // DELETE STAFF
// exports.delete = async (id) => {
//   const [result] = await db.query("DELETE FROM staff WHERE id = ?", [id]);
//   return result;
// };



// models/staffModel.js
const db = require("../config/db");
const bcrypt = require('bcrypt');

const saltRounds = 10;

// GET STAFF BY ID with role and department names
exports.getById = async (id) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.*,
        r.name as role_name,
        d.name as department_name
      FROM staff s
      LEFT JOIN master_item_values r ON r.id = s.role
      LEFT JOIN master_item_values d ON d.id = s.department
      WHERE s.id = ?
    `, [id]);
    
    return rows[0] || null;
  } catch (error) {
    console.error("Error in getById:", error);
    throw error;
  }
};

// GET ALL STAFF
exports.getAll = async () => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.*,
        r.name as role_name,
        d.name as department_name
      FROM staff s
      LEFT JOIN master_item_values r ON r.id = s.role
      LEFT JOIN master_item_values d ON d.id = s.department
      ORDER BY s.id DESC
    `);
    return rows;
  } catch (error) {
    console.error("Error in getAll:", error);
    throw error;
  }
};

// CREATE STAFF with hashed password and create user record
exports.create = async (data) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      salutation,
      name,
      email,
      password,
      phone,
      whatsapp_number,
      is_whatsapp_same,
      role,
      employee_id,
      salary,
      department,
      joining_date,
      blood_group,
      aadhar_number,
      pan_number,
      current_address,
      permanent_address,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
      bank_account_holder_name,
      bank_account_number,
      bank_name,
      bank_ifsc_code,
      upi_id,
      aadhar_document_url,
      pan_document_url,
      photo_url,
    } = data;

    const finalWhatsapp = is_whatsapp_same ? phone : whatsapp_number;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert into staff table
const [staffResult] = await connection.query(
  `INSERT INTO staff (
    salutation, name, email, password, phone, phone_country_code,
    whatsapp_number, is_whatsapp_same,
    role, employee_id, salary, department, joining_date,
    blood_group, aadhar_number, pan_number,
    current_address, permanent_address,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    bank_account_holder_name, bank_account_number, bank_name, bank_ifsc_code, upi_id,
    aadhar_document_url, pan_document_url, photo_url, is_active
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  [
    salutation || "mr",       // 1  salutation
    name,                      // 2  name
    email,                     // 3  email
    hashedPassword,            // 4  password
    phone,                     // 5  phone
    data.phone_country_code || '+91', // 6  phone_country_code
    finalWhatsapp || null,     // 7  whatsapp_number
    is_whatsapp_same ? 1 : 0, // 8  is_whatsapp_same
    role,                      // 9  role
    employee_id,               // 10 employee_id
    salary || 0,               // 11 salary
    department === 'no-department' ? null : department, // 12 department
    joining_date,              // 13 joining_date
    blood_group || "not_specified", // 14 blood_group
    aadhar_number || null,     // 15 aadhar_number
    pan_number || null,        // 16 pan_number
    current_address || null,   // 17 current_address
    permanent_address || null, // 18 permanent_address
    emergency_contact_name || null,     // 19
    emergency_contact_phone || null,    // 20
    emergency_contact_relation || null, // 21
    bank_account_holder_name || null,   // 22
    bank_account_number || null,        // 23
    bank_name || null,                  // 24
    bank_ifsc_code || null,             // 25
    upi_id || null,                     // 26
    aadhar_document_url || null,        // 27
    pan_document_url || null,           // 28
    photo_url || null,                  // 29
                                        // 30 is_active = 1 (hardcoded)
  ]
);

    const staffId = staffResult.insertId;

    // Get role name from master_item_values for the users table
    const [roleData] = await connection.query(
      `SELECT name FROM master_item_values WHERE id = ?`,
      [role]
    );
    const roleName = roleData[0]?.name || 'staff';

    // Insert into users table for authentication
    const [userResult] = await connection.query(
      `INSERT INTO users (email, password, role) VALUES (?, ?, ?)`,
      [email, hashedPassword, roleName]
    );

    await connection.commit();

    // Get the created staff with role_name and department_name
    const createdStaff = await exports.getById(staffId);
    
    return { 
      staffId,
      userId: userResult.insertId,
      ...createdStaff 
    };

  } catch (error) {
    await connection.rollback();
    console.error("Error in staff create:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// UPDATE STAFF - Handles email, password changes and syncs with users table
exports.update = async (id, data) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Get existing staff data
    const [existingStaff] = await connection.query(
      "SELECT * FROM staff WHERE id = ?",
      [id]
    );

    if (existingStaff.length === 0) {
      throw new Error("Staff not found");
    }

    const existing = existingStaff[0];
    const allowedFields = [
      "salutation", "name", "email", "phone", "phone_country_code","whatsapp_number", "is_whatsapp_same",
      "role", "employee_id", "salary", "department", "joining_date",
      "blood_group", "aadhar_number", "pan_number",
      "current_address", "permanent_address",
      "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
      "bank_account_holder_name", "bank_account_number", "bank_name", "bank_ifsc_code", "upi_id",
      "aadhar_document_url", "pan_document_url", "photo_url", "is_active"
    ];

    const fields = [];
    const values = [];
    let passwordChanged = false;
    let newHashedPassword = null;
    let emailChanged = false;
    let newEmail = existing.email;

    // Build staff update query
    for (const field of allowedFields) {
      if (data[field] !== undefined && data[field] !== null) {
        fields.push(`${field} = ?`);
        
        if (field === 'is_active') {
          values.push(data[field] === true || data[field] === 1 || data[field] === 'true' ? 1 : 0);
        } else if (field === 'department' && data[field] === 'no-department') {
          values.push(null);
        } else if (field === 'email') {
          newEmail = data[field];
          emailChanged = data[field] !== existing.email;
          values.push(data[field]);
        } else {
          values.push(data[field]);
        }
      }
    }

    // Handle password update if provided
    if (data.password && data.password.trim() !== '') {
      newHashedPassword = await bcrypt.hash(data.password, saltRounds);
      passwordChanged = true;
    }

    // WhatsApp sync logic
    if (data.is_whatsapp_same === 1) {
      const phoneToUse = data.phone || existing.phone;
      const whatsappIndex = fields.findIndex(f => f.startsWith("whatsapp_number"));
      if (whatsappIndex > -1) {
        values[whatsappIndex] = phoneToUse;
      } else {
        fields.push("whatsapp_number = ?");
        values.push(phoneToUse);
      }
    }

    // Update staff table if there are changes
    if (fields.length > 0) {
      values.push(id);
      const staffQuery = `UPDATE staff SET ${fields.join(", ")} WHERE id = ?`;
      await connection.query(staffQuery, values);
    }

    // Get role name for users table
    const roleId = data.role || existing.role;
    const [roleData] = await connection.query(
      `SELECT name FROM master_item_values WHERE id = ?`,
      [roleId]
    );
    const roleName = roleData[0]?.name || 'staff';

    // Check if user exists in users table
    const [existingUser] = await connection.query(
      "SELECT id, email FROM users WHERE email = ?",
      [existing.email]
    );

    if (existingUser.length > 0) {
      // Update existing user
      const userFields = [];
      const userValues = [];

      // Update email if changed
      if (emailChanged) {
        // Check if new email already exists in users table
        const [emailCheck] = await connection.query(
          "SELECT id FROM users WHERE email = ? AND id != ?",
          [newEmail, existingUser[0].id]
        );
        
        if (emailCheck.length > 0) {
          throw new Error("Email already exists in users table");
        }
        
        userFields.push("email = ?");
        userValues.push(newEmail);
      }

      // Update role if changed
      if (roleName) {
        userFields.push("role = ?");
        userValues.push(roleName);
      }

      // Update password if changed
      if (passwordChanged) {
        userFields.push("password = ?");
        userValues.push(newHashedPassword);
      }

      // Update is_active status if changed
      if (data.is_active !== undefined) {
        userFields.push("is_active = ?");
        userValues.push(data.is_active === 1 || data.is_active === true ? 1 : 0);
      }

      if (userFields.length > 0) {
        userValues.push(existingUser[0].id);
        const userQuery = `UPDATE users SET ${userFields.join(", ")} WHERE id = ?`;
        await connection.query(userQuery, userValues);
      }
    } else {
      // Create new user record if doesn't exist (shouldn't happen normally)
      const passwordToUse = newHashedPassword || existing.password;
      await connection.query(
        `INSERT INTO users (email, password, role) VALUES (?, ?, ?)`,
        [newEmail, passwordToUse, roleName]
      );
    }

    await connection.commit();

    // Get updated staff data
    const updatedStaff = await exports.getById(id);
    return updatedStaff;

  } catch (error) {
    await connection.rollback();
    console.error("Error in staff update:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// DELETE STAFF
exports.delete = async (id) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Get staff email before deleting
    const [staff] = await connection.query(
      "SELECT email FROM staff WHERE id = ?",
      [id]
    );

    if (staff.length > 0) {
      // Delete from users table first
      await connection.query(
        "DELETE FROM users WHERE email = ?",
        [staff[0].email]
      );
    }

    // Delete from staff table
    const [result] = await connection.query(
      "DELETE FROM staff WHERE id = ?",
      [id]
    );

    await connection.commit();
    return result;

  } catch (error) {
    await connection.rollback();
    console.error("Error in staff delete:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// In models/staffModel.js - add this method

// DELETE DOCUMENT ONLY (more specific than general update)
exports.deleteDocument = async (id, documentType) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const fieldName = `${documentType}_url`;
    
    // First, get the current document URL
    const [current] = await connection.query(
      `SELECT ${fieldName} FROM staff WHERE id = ?`,
      [id]
    );
    
    console.log(`Current ${fieldName}:`, current[0]?.[fieldName]);

    // Update the database to set the document URL to NULL
    const [result] = await connection.query(
      `UPDATE staff SET ${fieldName} = NULL WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error("Staff not found or no changes made");
    }

    // Verify the update
    const [verify] = await connection.query(
      `SELECT ${fieldName} FROM staff WHERE id = ?`,
      [id]
    );
    
    console.log(`After update - ${fieldName}:`, verify[0]?.[fieldName]);

    await connection.commit();
    
    // Get the updated staff data
    const updatedStaff = await exports.getById(id);
    return updatedStaff;

  } catch (error) {
    await connection.rollback();
    console.error("Error in deleteDocument:", error);
    throw error;
  } finally {
    connection.release();
  }
};