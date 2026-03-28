// models/newsletterModel.js
const db = require("../config/db");

const NewsletterModel = {
    // Subscribe user
    subscribe: async (email, ipAddress = null) => {
        try {
            // Check if email already exists
            const [existing] = await db.query(
                `SELECT id, status FROM newsletter_subscribers WHERE email = ?`,
                [email]
            );

            if (existing.length > 0) {
                if (existing[0].status === 'unsubscribed') {
                    // Reactivate
                    const [result] = await db.query(
                        `UPDATE newsletter_subscribers 
                         SET status = 'active', subscribed_at = NOW() 
                         WHERE id = ?`,
                        [existing[0].id]
                    );
                    return { success: true, message: "Resubscribed successfully", id: existing[0].id };
                }
                return { success: false, message: "Email already subscribed" };
            }

            // Insert new subscriber
            const [result] = await db.query(
                `INSERT INTO newsletter_subscribers (email, ip_address) VALUES (?, ?)`,
                [email, ipAddress]
            );

            return { success: true, message: "Subscribed successfully", id: result.insertId };
        } catch (err) {
            console.error("NewsletterModel.subscribe Error:", err);
            throw err;
        }
    },

    // Unsubscribe user
    unsubscribe: async (email) => {
        try {
            const [result] = await db.query(
                `UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE email = ?`,
                [email]
            );
            return { success: true, message: "Unsubscribed successfully" };
        } catch (err) {
            console.error("NewsletterModel.unsubscribe Error:", err);
            throw err;
        }
    },

    // Get all subscribers (for admin)
    getAllSubscribers: async (filters = {}) => {
        try {
            let query = `
                SELECT id, email, status, subscribed_at, created_at
                FROM newsletter_subscribers
                WHERE 1=1
            `;
            const params = [];

            if (filters.status && filters.status !== 'all') {
                query += ` AND status = ?`;
                params.push(filters.status);
            }

            if (filters.search) {
                query += ` AND email LIKE ?`;
                params.push(`%${filters.search}%`);
            }

            query += ` ORDER BY subscribed_at DESC`;

            const [rows] = await db.query(query, params);
            return rows;
        } catch (err) {
            console.error("NewsletterModel.getAllSubscribers Error:", err);
            throw err;
        }
    },

    // Get subscriber stats
    getStats: async () => {
        try {
            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                    SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) as unsubscribed_count
                FROM newsletter_subscribers
            `);
            return stats[0];
        } catch (err) {
            console.error("NewsletterModel.getStats Error:", err);
            throw err;
        }
    },

    // Delete subscriber (admin)
    deleteSubscriber: async (id) => {
        try {
            const [result] = await db.query(
                `DELETE FROM newsletter_subscribers WHERE id = ?`,
                [id]
            );
            return result;
        } catch (err) {
            console.error("NewsletterModel.deleteSubscriber Error:", err);
            throw err;
        }
    },

    // Bulk delete subscribers
    bulkDeleteSubscribers: async (ids) => {
        try {
            if (!ids || ids.length === 0) return { affectedRows: 0 };
            const placeholders = ids.map(() => '?').join(',');
            const [result] = await db.query(
                `DELETE FROM newsletter_subscribers WHERE id IN (${placeholders})`,
                ids
            );
            return result;
        } catch (err) {
            console.error("NewsletterModel.bulkDeleteSubscribers Error:", err);
            throw err;
        }
    }
};

module.exports = NewsletterModel;