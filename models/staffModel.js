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

// GET ALL STAFF
exports.getAll = async () => {
  const [rows] = await db.query("SELECT * FROM staff ORDER BY id DESC");
  return rows;
};

exports.create = async (data) => {
  const {
    salutation,
    name,
    email,
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
    // Document URLs
    aadhar_document_url,
    pan_document_url,
    photo_url,
  } = data;

  const finalWhatsapp = is_whatsapp_same ? phone : whatsapp_number;

  const [result] = await db.query(
    `INSERT INTO staff (
      salutation, name, email, phone, whatsapp_number, is_whatsapp_same,
      role, employee_id, salary, department, joining_date,
      blood_group, aadhar_number, pan_number,
      current_address, permanent_address,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      bank_account_holder_name, bank_account_number, bank_name, bank_ifsc_code, upi_id,
      aadhar_document_url, pan_document_url, photo_url, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      salutation || "mr",
      name,
      email,
      phone,
      finalWhatsapp || null,
      is_whatsapp_same ? 1 : 0,
      role,
      employee_id,
      salary,
      department || null,
      joining_date,
      blood_group || "not_specified",
      aadhar_number || null,
      pan_number || null,
      current_address || null,
      permanent_address || null,
      emergency_contact_name || null,
      emergency_contact_phone || null,
      emergency_contact_relation || null,
      bank_account_holder_name || null,
      bank_account_number || null,
      bank_name || null,
      bank_ifsc_code || null,
      upi_id || null,
      aadhar_document_url || null,
      pan_document_url || null,
      photo_url || null,
    ]
  );

  return result;
};

// UPDATE STAFF
exports.update = async (id, data) => {
  const allowedFields = [
    "salutation", "name", "email", "phone", "whatsapp_number", "is_whatsapp_same",
    "role", "employee_id", "salary", "department", "joining_date",
    "blood_group", "aadhar_number", "pan_number",
    "current_address", "permanent_address",
    "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
    "bank_account_holder_name", "bank_account_number", "bank_name", "bank_ifsc_code", "upi_id",
    "aadhar_document_url", "pan_document_url", "photo_url", "is_active"
  ];

  const fields = [];
  const values = [];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) {
      fields.push(`${field} = ?`);
      // Handle boolean conversion for is_active
      if (field === 'is_active') {
        values.push(data[field] === true || data[field] === 1 || data[field] === 'true' ? 1 : 0);
      } else {
        values.push(data[field]);
      }
    }
  });

  // WhatsApp sync logic - only if is_whatsapp_same is explicitly 1
  if (data.is_whatsapp_same === 1 && data.phone) {
    // Remove existing whatsapp_number if present
    const whatsappIndex = fields.indexOf("whatsapp_number = ?");
    if (whatsappIndex > -1) {
      values[whatsappIndex] = data.phone;
    } else {
      fields.push("whatsapp_number = ?");
      values.push(data.phone);
    }
  }

  if (fields.length === 0) {
    return { affectedRows: 0 };
  }

  values.push(id);

  const query = `UPDATE staff SET ${fields.join(", ")} WHERE id = ?`;
  console.log("Update query:", query);
  console.log("Update values:", values);

  const [result] = await db.query(query, values);
  return result;
};

// DELETE STAFF
exports.delete = async (id) => {
  const [result] = await db.query("DELETE FROM staff WHERE id = ?", [id]);
  return result;
};

// GET STAFF BY ID (helper function for controller)
exports.getById = async (id) => {
  const [rows] = await db.query("SELECT * FROM staff WHERE id = ?", [id]);
  return rows[0];
};