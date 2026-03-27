// models/partnershipEnquiryModel.js
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
            return rows;
        } catch (err) {
            console.error("PartnershipEnquiryModel.getAllPartnershipEnquiries Error:", err);
            throw err;
        }
    },

    // Get single partnership enquiry by ID
    getPartnershipEnquiryById: async (id) => {
        try {
            const [rows] = await db.query(
                `SELECT * FROM partnership_enquiries WHERE id = ? AND deleted_at IS NULL`,
                [id]
            );
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
                status = 'new'
            } = enquiryData;

            const [result] = await db.query(
                `INSERT INTO partnership_enquiries 
                 (company_name, contact_person, email, phone, property_type, 
                  property_count, location, message, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    company_name,
                    contact_person,
                    email,
                    phone,
                    property_type,
                    property_count || 1,
                    location,
                    message,
                    status
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