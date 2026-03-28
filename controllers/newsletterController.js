// controllers/newsletterController.js
const NewsletterModel = require("../models/newsletterModel");

// Subscribe to newsletter
const subscribe = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const result = await NewsletterModel.subscribe(email, ipAddress);
        
        res.json(result);
    } catch (err) {
        console.error("Error in subscribe:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// Unsubscribe from newsletter
const unsubscribe = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const result = await NewsletterModel.unsubscribe(email);
        res.json(result);
    } catch (err) {
        console.error("Error in unsubscribe:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// Get all subscribers (Admin)
const getAllSubscribers = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search,
            limit: req.query.limit
        };

        const subscribers = await NewsletterModel.getAllSubscribers(filters);
        const stats = await NewsletterModel.getStats();

        res.json({
            success: true,
            count: subscribers.length,
            results: subscribers,
            stats
        });
    } catch (err) {
        console.error("Error in getAllSubscribers:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// Get subscriber stats (Admin)
const getStats = async (req, res) => {
    try {
        const stats = await NewsletterModel.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error("Error in getStats:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// Delete subscriber (Admin)
const deleteSubscriber = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await NewsletterModel.deleteSubscriber(id);
        
        res.json({
            success: true,
            message: "Subscriber deleted successfully",
            affectedRows: result.affectedRows
        });
    } catch (err) {
        console.error("Error in deleteSubscriber:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// Bulk delete subscribers (Admin)
const bulkDeleteSubscribers = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of subscriber IDs to delete"
            });
        }

        const result = await NewsletterModel.bulkDeleteSubscribers(ids);
        
        res.json({
            success: true,
            message: `${result.affectedRows} subscribers deleted successfully`,
            affectedRows: result.affectedRows
        });
    } catch (err) {
        console.error("Error in bulkDeleteSubscribers:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

module.exports = {
    subscribe,
    unsubscribe,
    getAllSubscribers,
    getStats,
    deleteSubscriber,
    bulkDeleteSubscribers
};