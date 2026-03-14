// enquiryModel.js - Handles database interactions for tenant enquiries
const db = require("../config/db");

const EnquiryModel = {

getAllEnquiries: async (filters = {}) => {
  try {
    let query = `
      SELECT 
        e.*,
        p.name as property_full_name
      FROM enquiries e
      LEFT JOIN properties p ON e.property_id = p.id
      WHERE e.deleted_at IS NULL  
    `;
    const params = [];

    // Apply filters
    if (filters.status) {
      query += ` AND e.status = ?`;
      params.push(filters.status);
    }

    if (filters.assigned_to) {
      query += ` AND e.assigned_to = ?`;
      params.push(filters.assigned_to);
    }

    if (filters.property_id) {
      query += ` AND e.property_id = ?`;
      params.push(filters.property_id);
    }

    if (filters.search) {
      query += ` AND (e.tenant_name LIKE ? OR e.phone LIKE ? OR e.email LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY e.created_at DESC`;

    const [rows] = await db.query(query, params);
    return rows;
  } catch (err) {
    console.error("EnquiryModel.getAllEnquiries Error:", err);
    throw err;
  }
},

  // Get enquiry by ID with followups
  getEnquiryById: async (id) => {
    try {
      const [enquiry] = await db.query(
        `SELECT 
          e.*,
          p.name as property_full_name
         FROM enquiries e
         LEFT JOIN properties p ON e.property_id = p.id
         WHERE e.id = ?`,
        [id]
      );

      if (enquiry.length === 0) {
        return null;
      }

      // Get followups for this enquiry
      const [followups] = await db.query(
        `SELECT * FROM enquiry_followups 
         WHERE enquiry_id = ? 
         ORDER BY timestamp DESC`,
        [id]
      );

      return {
        ...enquiry[0],
        followups: followups || [],
      };
    } catch (err) {
      console.error("EnquiryModel.getEnquiryById Error:", err);
      throw err;
    }
  },

  // Create new enquiry
 createEnquiry: async (enquiryData) => {
  try {
    const {
      property_id,
      tenant_name,
      phone,
      email,
      property_name,
      preferred_move_in_date,
      budget_range,
      message,
      source = "website",
      status = "new",
      occupation,
      occupation_category,
      remark,
    } = enquiryData;

    const [result] = await db.query(
      `INSERT INTO enquiries 
       (property_id, tenant_name, phone, email, property_name, 
        preferred_move_in_date, budget_range, message, source, status,
        occupation, occupation_category, remark) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        property_id,
        tenant_name,
        phone,
        email,
        property_name,
        preferred_move_in_date,
        budget_range,
        message,
        source,
        status,
        occupation,
        occupation_category,
        remark,
      ]
    );

      return { id: result.insertId, ...enquiryData };
    } catch (err) {
      console.error("EnquiryModel.createEnquiry Error:", err);
      throw err;
    }
  },

  // Update enquiry
  updateEnquiry: async (id, updateData) => {
    try {
      const fields = [];
      const values = [];

      // Build dynamic update query
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (fields.length === 0) {
        return { affectedRows: 0 };
      }

      values.push(id);

      const [result] = await db.query(
        `UPDATE enquiries SET ${fields.join(", ")} WHERE id = ?`,
        values
      );

      return result;
    } catch (err) {
      console.error("EnquiryModel.updateEnquiry Error:", err);
      throw err;
    }
  },

  // Delete enquiry
  deleteEnquiry: async (id) => {
    try {
      const [result] = await db.query("DELETE FROM enquiries WHERE id = ?", [
        id,
      ]);
      return result;
    } catch (err) {
      console.error("EnquiryModel.deleteEnquiry Error:", err);
      throw err;
    }
  },

  // Add followup to enquiry
  addFollowup: async (enquiryId, followupData) => {
    try {
      const { note, created_by } = followupData;

      const [result] = await db.query(
        `INSERT INTO enquiry_followups (enquiry_id, note, created_by) 
         VALUES (?, ?, ?)`,
        [enquiryId, note, created_by]
      );

      return { id: result.insertId, enquiryId, ...followupData };
    } catch (err) {
      console.error("EnquiryModel.addFollowup Error:", err);
      throw err;
    }
  },

  // Get followups for enquiry
  getFollowups: async (enquiryId) => {
    try {
      const [followups] = await db.query(
        `SELECT * FROM enquiry_followups 
         WHERE enquiry_id = ? 
         ORDER BY timestamp DESC`,
        [enquiryId]
      );
      return followups;
    } catch (err) {
      console.error("EnquiryModel.getFollowups Error:", err);
      throw err;
    }
  },

  // Get enquiry statistics
  getEnquiryStats: async () => {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
          SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
          SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END) as interested_count,
          SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_count,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count
        FROM enquiries
      `);
      return stats[0];
    } catch (err) {
      console.error("EnquiryModel.getEnquiryStats Error:", err);
      throw err;
    }
  },

  async createFromBooking(bookingData, propertyData) {
    const query = `
      INSERT INTO enquiries (
        property_id, tenant_name, email, phone, property_name,
        preferred_move_in_date, budget_range, message, status,
        source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    // Determine budget range based on booking type
    let budgetRange = 'Not specified';
    if (bookingData.bookingType === 'long') {
      budgetRange = `₹${bookingData.monthlyRent || 0}/month`;
    } else {
      const days = bookingData.checkInDate && bookingData.checkOutDate 
        ? Math.ceil((new Date(bookingData.checkOutDate) - new Date(bookingData.checkInDate)) / (1000 * 60 * 60 * 24))
        : 1;
      budgetRange = `₹${bookingData.totalAmount || 0} for ${days} days`;
    }

    const moveInDate = bookingData.moveInDate || bookingData.checkInDate || null;

    const values = [
      bookingData.propertyId,
      bookingData.fullName,
      bookingData.email,
      bookingData.phone,
      propertyData?.name || 'Property',
      moveInDate,
      budgetRange,
      `Booking enquiry for ${bookingData.bookingType === 'long' ? 'Long Stay' : 'Short Stay'}. Room: ${bookingData.roomNumber || 'Not selected'}`,
      'pending',
      'website'
    ];

    try {
      const [result] = await db.execute(query, values);
      return { id: result.insertId, ...bookingData };
    } catch (error) {
      throw error;
    }
  },


  // Add to enquiryModel.js - inside the EnquiryModel object

  // Get all visits for an enquiry
  getVisits: async (enquiryId) => {
    try {
      const [visits] = await db.query(
        `SELECT * FROM enquiry_visits 
         WHERE enquiry_id = ? 
         ORDER BY scheduled_date DESC, scheduled_time DESC`,
        [enquiryId]
      );
      return visits;
    } catch (err) {
      console.error("EnquiryModel.getVisits Error:", err);
      throw err;
    }
  },

  // Schedule a new visit
  scheduleVisit: async (enquiryId, visitData) => {
    try {
      const {
        scheduled_date,
        scheduled_time,
        notes = '',
        created_by = 'Admin'
      } = visitData;

      // Validate required fields
      if (!scheduled_date) {
        throw new Error("Scheduled date is required");
      }

      const [result] = await db.query(
        `INSERT INTO enquiry_visits 
         (enquiry_id, scheduled_date, scheduled_time, notes, created_by, status) 
         VALUES (?, ?, ?, ?, ?, 'scheduled')`,
        [enquiryId, scheduled_date, scheduled_time, notes, created_by]
      );

      // Fetch the newly created visit
      const [newVisit] = await db.query(
        `SELECT * FROM enquiry_visits WHERE id = ?`,
        [result.insertId]
      );

      return newVisit[0];
    } catch (err) {
      console.error("EnquiryModel.scheduleVisit Error:", err);
      throw err;
    }
  },

  // Update visit status
  updateVisitStatus: async (visitId, status, notes = null) => {
    try {
      const query = notes 
        ? `UPDATE enquiry_visits SET status = ?, notes = CONCAT(notes, '\n', ?) WHERE id = ?`
        : `UPDATE enquiry_visits SET status = ? WHERE id = ?`;
      
      const params = notes ? [status, `Status updated to ${status}: ${notes}`, visitId] : [status, visitId];

      const [result] = await db.query(query, params);
      return result;
    } catch (err) {
      console.error("EnquiryModel.updateVisitStatus Error:", err);
      throw err;
    }
  },

  // Get visit by ID
  getVisitById: async (visitId) => {
    try {
      const [visit] = await db.query(
        `SELECT v.*, e.tenant_name, e.phone, e.property_name 
         FROM enquiry_visits v
         LEFT JOIN enquiries e ON v.enquiry_id = e.id
         WHERE v.id = ?`,
        [visitId]
      );
      return visit[0] || null;
    } catch (err) {
      console.error("EnquiryModel.getVisitById Error:", err);
      throw err;
    }
  },

  // Get upcoming visits (for reminders/dashboard)
  getUpcomingVisits: async (days = 7) => {
    try {
      const [visits] = await db.query(
        `SELECT v.*, e.tenant_name, e.phone, e.property_name 
         FROM enquiry_visits v
         LEFT JOIN enquiries e ON v.enquiry_id = e.id
         WHERE v.scheduled_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
         AND v.status = 'scheduled'
         ORDER BY v.scheduled_date ASC, v.scheduled_time ASC`,
        [days]
      );
      return visits;
    } catch (err) {
      console.error("EnquiryModel.getUpcomingVisits Error:", err);
      throw err;
    }
  },

  // Get today's visits
  getTodayVisits: async () => {
    try {
      const [visits] = await db.query(
        `SELECT v.*, e.tenant_name, e.phone, e.property_name 
         FROM enquiry_visits v
         LEFT JOIN enquiries e ON v.enquiry_id = e.id
         WHERE v.scheduled_date = CURDATE()
         ORDER BY v.scheduled_time ASC`,
        []
      );
      return visits;
    } catch (err) {
      console.error("EnquiryModel.getTodayVisits Error:", err);
      throw err;
    }
  },

  // Mark reminder as sent
  markReminderSent: async (visitId) => {
    try {
      const [result] = await db.query(
        `UPDATE enquiry_visits SET reminder_sent = TRUE, reminder_date = NOW() WHERE id = ?`,
        [visitId]
      );
      return result;
    } catch (err) {
      console.error("EnquiryModel.markReminderSent Error:", err);
      throw err;
    }
  },

// Convert enquiry to tenant with options
convertToTenant: async (enquiryId, options = {}) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Get enquiry details
    const [enquiryRows] = await connection.query(
      `SELECT * FROM enquiries WHERE id = ?`,
      [enquiryId]
    );
    
    if (enquiryRows.length === 0) {
      throw new Error("Enquiry not found");
    }
    
    const enquiry = enquiryRows[0];
    console.log("Converting enquiry to tenant:", enquiry);

    let tenantId;

    // If force new tenant, skip checking existing
    if (options.forceNew) {
      // Create new tenant
      const insertTenantQuery = `
        INSERT INTO tenants (
          full_name,
          email,
          phone,
          occupation_category,
          exact_occupation,
          property_id,
          preferred_property_id,
          is_active,
          portal_access_enabled,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const [result] = await connection.query(insertTenantQuery, [
        enquiry.tenant_name,
        enquiry.email || null,
        enquiry.phone,
        enquiry.occupation_category || null,
        enquiry.occupation || null,
        enquiry.property_id || null,
        enquiry.property_id || null,
        1, // is_active
        1, // portal_access_enabled
      ]);
      
      tenantId = result.insertId;
    } 
    // If updating a specific existing tenant
    else if (options.updateExistingId) {
      // Update the specified tenant
      await connection.query(
        `UPDATE tenants SET 
          full_name = ?,
          email = ?,
          phone = ?,
          occupation_category = ?,
          exact_occupation = ?,
          property_id = ?,
          preferred_property_id = ?,
          deleted_at = NULL,
          updated_at = NOW()
        WHERE id = ?`,
        [
          enquiry.tenant_name,
          enquiry.email || null,
          enquiry.phone,
          enquiry.occupation_category || null,
          enquiry.occupation || null,
          enquiry.property_id || null,
          enquiry.property_id || null,
          options.updateExistingId
        ]
      );
      tenantId = options.updateExistingId;
    }
    else {
      // Check for existing tenants (original logic)
      let existingTenant = null;

      // Check by email first (if email exists)
      if (enquiry.email) {
        const [existingByEmail] = await connection.query(
          `SELECT id, deleted_at FROM tenants WHERE email = ?`,
          [enquiry.email]
        );
        if (existingByEmail.length > 0) {
          existingTenant = existingByEmail[0];
        }
      }

      // If not found by email, check by phone
      if (!existingTenant && enquiry.phone) {
        const [existingByPhone] = await connection.query(
          `SELECT id, deleted_at FROM tenants WHERE phone = ?`,
          [enquiry.phone]
        );
        if (existingByPhone.length > 0) {
          existingTenant = existingByPhone[0];
        }
      }

      if (existingTenant) {
        if (existingTenant.deleted_at) {
          // Restore soft-deleted tenant
          await connection.query(
            `UPDATE tenants SET 
              deleted_at = NULL,
              full_name = ?,
              email = ?,
              phone = ?,
              occupation_category = ?,
              exact_occupation = ?,
              property_id = ?,
              preferred_property_id = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [
              enquiry.tenant_name,
              enquiry.email || null,
              enquiry.phone,
              enquiry.occupation_category || null,
              enquiry.occupation || null,
              enquiry.property_id || null,
              enquiry.property_id || null,
              existingTenant.id
            ]
          );
          tenantId = existingTenant.id;
        } else {
          // Update existing active tenant
          await connection.query(
            `UPDATE tenants SET 
              full_name = ?,
              phone = ?,
              occupation_category = ?,
              exact_occupation = ?,
              property_id = ?,
              preferred_property_id = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [
              enquiry.tenant_name,
              enquiry.phone,
              enquiry.occupation_category || null,
              enquiry.occupation || null,
              enquiry.property_id || null,
              enquiry.property_id || null,
              existingTenant.id
            ]
          );
          tenantId = existingTenant.id;
        }
      } else {
        // Create new tenant
        const insertTenantQuery = `
          INSERT INTO tenants (
            full_name,
            email,
            phone,
            occupation_category,
            exact_occupation,
            property_id,
            preferred_property_id,
            is_active,
            portal_access_enabled,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const [result] = await connection.query(insertTenantQuery, [
          enquiry.tenant_name,
          enquiry.email || null,
          enquiry.phone,
          enquiry.occupation_category || null,
          enquiry.occupation || null,
          enquiry.property_id || null,
          enquiry.property_id || null,
          1, // is_active
          1, // portal_access_enabled
        ]);
        
        tenantId = result.insertId;
      }
    }

    // Soft delete the enquiry
    await connection.query(
      "UPDATE enquiries SET deleted_at = NOW(), status = 'converted' WHERE id = ?",
      [enquiryId]
    );

    // Add a note to the enquiry about conversion
    const note = `Converted to tenant (ID: ${tenantId}) on ${new Date().toLocaleDateString()}`;
    await connection.query(
      `INSERT INTO enquiry_followups (enquiry_id, note, created_by) VALUES (?, ?, ?)`,
      [enquiryId, note, 'System']
    );

    await connection.commit();
    
    return { 
      tenantId, 
      enquiry: { ...enquiry, status: 'converted', deleted_at: new Date() } 
    };
    
  } catch (err) {
    await connection.rollback();
    console.error("EnquiryModel.convertToTenant Error:", err);
    throw err;
  } finally {
    connection.release();
  }
},

// Check for potential tenant matches
checkExistingTenants: async (email, phone) => {
  try {
    const [existingTenants] = await db.query(
      `SELECT id, full_name, email, phone, deleted_at 
       FROM tenants 
       WHERE (email = ? OR phone = ?)
       ORDER BY 
         CASE 
           WHEN deleted_at IS NULL THEN 0 
           ELSE 1 
         END,
         created_at DESC`,
      [email, phone]
    );
    
    return existingTenants;
  } catch (err) {
    console.error("EnquiryModel.checkExistingTenants Error:", err);
    throw err;
  }
},
};

module.exports = EnquiryModel;
