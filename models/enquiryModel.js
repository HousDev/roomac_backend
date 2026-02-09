const db = require("../config/db");

const EnquiryModel = {
  // Get all enquiries with optional filters
  getAllEnquiries: async (filters = {}) => {
    try {
      let query = `
        SELECT 
          e.*,
          p.name as property_full_name
        FROM enquiries e
        LEFT JOIN properties p ON e.property_id = p.id
        WHERE 1=1
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
      } = enquiryData;

      const [result] = await db.query(
        `INSERT INTO enquiries 
         (property_id, tenant_name, phone, email, property_name, 
          preferred_move_in_date, budget_range, message, source, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
};

module.exports = EnquiryModel;
