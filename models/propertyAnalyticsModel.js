// models/propertyAnalyticsModel.js
const db = require("../config/db");
const crypto = require('crypto');

const PropertyAnalyticsModel = {
    /**
     * Generate a session ID for anonymous users
     */
    generateSessionId(req) {
        // Try to get from headers/cookies first
        let sessionId = req.headers['x-session-id'] || 
                       req.cookies?.session_id;
        
        if (!sessionId) {
            // Generate new session ID
            sessionId = crypto.randomBytes(16).toString('hex');
        }
        
        return sessionId;
    },

    /**
     * Increment view count for a property
     */
    async incrementView(propertyId, req) {
        try {
            const ipAddress = req.ip || 
                             req.headers['x-forwarded-for'] || 
                             req.connection.remoteAddress;
            
            const userAgent = req.headers['user-agent'];
            const sessionId = this.generateSessionId(req);

            // Check if this session has viewed this property in the last 24 hours
            const [existingView] = await db.query(
                `SELECT id FROM property_views 
                 WHERE property_id = ? AND session_id = ? 
                 AND viewed_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
                [propertyId, sessionId]
            );

            let isNewView = false;

            // Only insert if no view in last 24 hours
            if (!existingView || existingView.length === 0) {
                await db.query(
                    `INSERT INTO property_views 
                     (property_id, ip_address, user_agent, session_id) 
                     VALUES (?, ?, ?, ?)`,
                    [propertyId, ipAddress, userAgent, sessionId]
                );
                isNewView = true;
            }

            // Get total view count
            const [viewCount] = await db.query(
                `SELECT COUNT(*) as total FROM property_views WHERE property_id = ?`,
                [propertyId]
            );

            return {
                success: true,
                isNewView,
                totalViews: viewCount[0]?.total || 0
            };
        } catch (error) {
            console.error('Error incrementing view:', error);
            throw error;
        }
    },

    /**
     * Toggle shortlist for a property
     */
    async toggleShortlist(propertyId, req) {
        try {
            const sessionId = this.generateSessionId(req);

            // Check if already shortlisted
            const [existing] = await db.query(
                `SELECT id FROM property_shortlists 
                 WHERE property_id = ? AND session_id = ?`,
                [propertyId, sessionId]
            );

            if (existing && existing.length > 0) {
                // Remove from shortlist
                await db.query(
                    `DELETE FROM property_shortlists 
                     WHERE property_id = ? AND session_id = ?`,
                    [propertyId, sessionId]
                );
            } else {
                // Add to shortlist
                await db.query(
                    `INSERT INTO property_shortlists (property_id, session_id) 
                     VALUES (?, ?)`,
                    [propertyId, sessionId]
                );
            }

            // Get total shortlist count
            const [shortlistCount] = await db.query(
                `SELECT COUNT(*) as total FROM property_shortlists WHERE property_id = ?`,
                [propertyId]
            );

            // Check if this session has shortlisted
            const [sessionShortlisted] = await db.query(
                `SELECT id FROM property_shortlists 
                 WHERE property_id = ? AND session_id = ?`,
                [propertyId, sessionId]
            );

            return {
                success: true,
                isShortlisted: sessionShortlisted && sessionShortlisted.length > 0,
                totalShortlists: shortlistCount[0]?.total || 0
            };
        } catch (error) {
            console.error('Error toggling shortlist:', error);
            throw error;
        }
    },

    /**
     * Get analytics for a property
     */
    async getAnalytics(propertyId) {
        try {
            const [viewCount] = await db.query(
                `SELECT COUNT(*) as total FROM property_views WHERE property_id = ?`,
                [propertyId]
            );

            const [shortlistCount] = await db.query(
                `SELECT COUNT(*) as total FROM property_shortlists WHERE property_id = ?`,
                [propertyId]
            );

            // Get today's views
            const [todayViews] = await db.query(
                `SELECT COUNT(*) as total FROM property_views 
                 WHERE property_id = ? AND DATE(viewed_at) = CURDATE()`,
                [propertyId]
            );

            // Get weekly views
            const [weekViews] = await db.query(
                `SELECT COUNT(*) as total FROM property_views 
                 WHERE property_id = ? AND viewed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
                [propertyId]
            );

            return {
                totalViews: viewCount[0]?.total || 0,
                totalShortlists: shortlistCount[0]?.total || 0,
                todayViews: todayViews[0]?.total || 0,
                weekViews: weekViews[0]?.total || 0
            };
        } catch (error) {
            console.error('Error getting analytics:', error);
            throw error;
        }
    },

    /**
     * Get analytics for multiple properties
     */
    async getBulkAnalytics(propertyIds, req) {
        try {
            if (!propertyIds || propertyIds.length === 0) {
                return {};
            }

            const placeholders = propertyIds.map(() => '?').join(',');
            
            // Get view counts for all properties
            const [viewCounts] = await db.query(
                `SELECT property_id, COUNT(*) as total 
                 FROM property_views 
                 WHERE property_id IN (${placeholders})
                 GROUP BY property_id`,
                propertyIds
            );

            // Get shortlist counts for all properties
            const [shortlistCounts] = await db.query(
                `SELECT property_id, COUNT(*) as total 
                 FROM property_shortlists 
                 WHERE property_id IN (${placeholders})
                 GROUP BY property_id`,
                propertyIds
            );

            // Get session's shortlisted properties
            const sessionId = this.generateSessionId(req);
            const [sessionShortlists] = await db.query(
                `SELECT property_id 
                 FROM property_shortlists 
                 WHERE property_id IN (${placeholders}) AND session_id = ?`,
                [...propertyIds, sessionId]
            );

            const sessionShortlistedIds = new Set(
                sessionShortlists.map(item => item.property_id)
            );

            // Build response object
            const analytics = {};
            propertyIds.forEach(id => {
                const viewData = viewCounts.find(v => v.property_id === id);
                const shortlistData = shortlistCounts.find(s => s.property_id === id);
                
                analytics[id] = {
                    totalViews: viewData?.total || 0,
                    totalShortlists: shortlistData?.total || 0,
                    isShortlisted: sessionShortlistedIds.has(id)
                };
            });

            return analytics;
        } catch (error) {
            console.error('Error getting bulk analytics:', error);
            throw error;
        }
    },

    /**
     * Check if current session has shortlisted a property
     */
    async isShortlisted(propertyId, req) {
        try {
            const sessionId = this.generateSessionId(req);
            
            const [result] = await db.query(
                `SELECT id FROM property_shortlists 
                 WHERE property_id = ? AND session_id = ?`,
                [propertyId, sessionId]
            );

            return result && result.length > 0;
        } catch (error) {
            console.error('Error checking shortlist:', error);
            return false;
        }
    }
};

module.exports = PropertyAnalyticsModel;