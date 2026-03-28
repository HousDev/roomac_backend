const db = require("../config/db");

const PartnershipEnquiryModel = {
    // Get all partnership enquiries
    getAllPartnershipEnquiries: async (filters = {}) => {
        try {
            let query = `
                SELECT 
                    pe.*
                FROM partnership_enquiries pe
                WHERE pe.deleted_at IS NULL
            `;
            const params = [];

            if (filters.status && filters.status !== 'all') {
                query += ` AND pe.status = ?`;
                params.push(filters.status);
            }

            if (filters.search) {
                query += ` AND (pe.company_name LIKE ? OR pe.contact_person LIKE ? OR pe.email LIKE ? OR pe.phone LIKE ?)`;
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            query += ` ORDER BY pe.created_at DESC`;
            const [rows] = await db.query(query, params);
            
            // Parse followup_history JSON for each row
            return rows.map(row => {
                if (row.followup_history) {
                    try {
                        row.followup_history = typeof row.followup_history === 'string' 
                            ? JSON.parse(row.followup_history) 
                            : row.followup_history;
                    } catch(e) {
                        row.followup_history = [];
                    }
                } else {
                    row.followup_history = [];
                }
                return row;
            });
        } catch (err) {
            console.error("PartnershipEnquiryModel.getAllPartnershipEnquiries Error:", err);
            throw err;
        }
    },

    // Get single partnership enquiry by ID with followups
    getPartnershipEnquiryById: async (id) => {
        try {
            const [rows] = await db.query(
                `SELECT * FROM partnership_enquiries WHERE id = ? AND deleted_at IS NULL`,
                [id]
            );
            
            if (rows[0]) {
                // Parse followup_history JSON
                if (rows[0].followup_history) {
                    try {
                        rows[0].followup_history = typeof rows[0].followup_history === 'string' 
                            ? JSON.parse(rows[0].followup_history) 
                            : rows[0].followup_history;
                    } catch(e) {
                        rows[0].followup_history = [];
                    }
                } else {
                    rows[0].followup_history = [];
                }
            }
            
            return rows[0] || null;
        } catch (err) {
            console.error("PartnershipEnquiryModel.getPartnershipEnquiryById Error:", err);
            throw err;
        }
    },

    // Create new partnership enquiry
    createPartnershipEnquiry: async (enquiryData) => {
        try {
            const {
                company_name,
                contact_person,
                email,
                phone,
                property_type,
                property_count,
                location,
                message,
                status = 'new',
                remark
            } = enquiryData;

            const [result] = await db.query(
                `INSERT INTO partnership_enquiries 
                 (company_name, contact_person, email, phone, property_type, 
                  property_count, location, message, status, remark) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    company_name,
                    contact_person,
                    email,
                    phone,
                    property_type,
                    property_count || 1,
                    location,
                    message,
                    status,
                    remark || null
                ]
            );

            return { id: result.insertId, ...enquiryData };
        } catch (err) {
            console.error("PartnershipEnquiryModel.createPartnershipEnquiry Error:", err);
            throw err;
        }
    },

    // Update partnership enquiry
    updatePartnershipEnquiry: async (id, updateData) => {
        try {
            const fields = [];
            const values = [];

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
                `UPDATE partnership_enquiries SET ${fields.join(", ")} WHERE id = ?`,
                values
            );

            return result;
        } catch (err) {
            console.error("PartnershipEnquiryModel.updatePartnershipEnquiry Error:", err);
            throw err;
        }
    },

    // Add followup to partnership enquiry
    addFollowup: async (id, followupData) => {
        try {
            // Get current enquiry to fetch existing followups
            const [rows] = await db.query(
                `SELECT followup_history FROM partnership_enquiries WHERE id = ? AND deleted_at IS NULL`,
                [id]
            );
            
            if (!rows[0]) {
                throw new Error("Partnership enquiry not found");
            }
            
            let followupHistory = [];
            if (rows[0].followup_history) {
                try {
                    followupHistory = typeof rows[0].followup_history === 'string' 
                        ? JSON.parse(rows[0].followup_history) 
                        : rows[0].followup_history;
                } catch(e) {
                    followupHistory = [];
                }
            }
            
            // Add new followup
            const newFollowup = {
                id: Date.now(),
                note: followupData.note,
                created_by: followupData.created_by || "Admin",
                timestamp: new Date().toISOString()
            };
            
            followupHistory.push(newFollowup);
            
            // Update the enquiry with new followup history and latest followup data
            const [result] = await db.query(
                `UPDATE partnership_enquiries 
                 SET followup_history = ?, 
                     followup_text = ?,
                     followup_date = ?,
                     followup_by = ?
                 WHERE id = ?`,
                [
                    JSON.stringify(followupHistory),
                    followupData.note,
                    new Date(),
                    followupData.created_by || "Admin",
                    id
                ]
            );
            
            return { 
                affectedRows: result.affectedRows,
                followup: newFollowup,
                followupHistory: followupHistory
            };
        } catch (err) {
            console.error("PartnershipEnquiryModel.addFollowup Error:", err);
            throw err;
        }
    },

    // Get followup history for a partnership enquiry
    getFollowupHistory: async (id) => {
        try {
            const [rows] = await db.query(
                `SELECT followup_history FROM partnership_enquiries WHERE id = ? AND deleted_at IS NULL`,
                [id]
            );
            
            if (!rows[0]) return [];
            
            let followupHistory = [];
            if (rows[0].followup_history) {
                try {
                    followupHistory = typeof rows[0].followup_history === 'string' 
                        ? JSON.parse(rows[0].followup_history) 
                        : rows[0].followup_history;
                } catch(e) {
                    followupHistory = [];
                }
            }
            
            return followupHistory;
        } catch (err) {
            console.error("PartnershipEnquiryModel.getFollowupHistory Error:", err);
            throw err;
        }
    },

    // Delete partnership enquiry (soft delete)
    deletePartnershipEnquiry: async (id) => {
        try {
            const [result] = await db.query(
                `UPDATE partnership_enquiries SET deleted_at = NOW() WHERE id = ?`,
                [id]
            );
            return result;
        } catch (err) {
            console.error("PartnershipEnquiryModel.deletePartnershipEnquiry Error:", err);
            throw err;
        }
    },

    // Bulk delete partnership enquiries
    bulkDeletePartnershipEnquiries: async (ids) => {
        try {
            if (!ids || ids.length === 0) return { affectedRows: 0 };
            
            const placeholders = ids.map(() => '?').join(',');
            const [result] = await db.query(
                `UPDATE partnership_enquiries SET deleted_at = NOW() WHERE id IN (${placeholders})`,
                ids
            );
            return result;
        } catch (err) {
            console.error("PartnershipEnquiryModel.bulkDeletePartnershipEnquiries Error:", err);
            throw err;
        }
    },

    // Get partnership enquiry stats
    getPartnershipStats: async () => {
        try {
            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
                    SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
                    SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review_count,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
                FROM partnership_enquiries
                WHERE deleted_at IS NULL
            `);
            return stats[0];
        } catch (err) {
            console.error("PartnershipEnquiryModel.getPartnershipStats Error:", err);
            throw err;
        }
    }
};

module.exports = PartnershipEnquiryModel;