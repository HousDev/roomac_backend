// controllers/partnershipEnquiryController.js
const PartnershipEnquiryModel = require("../models/partnershipEnquiryModel");

// Get all partnership enquiries
const getPartnershipEnquiries = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search,
        };

        const enquiries = await PartnershipEnquiryModel.getAllPartnershipEnquiries(filters);
        res.json({
            success: true,
            count: enquiries.length,
            results: enquiries,
        });
    } catch (err) {
        console.error("Error in getPartnershipEnquiries:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// Get single partnership enquiry by ID
const getPartnershipEnquiryById = async (req, res) => {
    try {
        const { id } = req.params;
        const enquiry = await PartnershipEnquiryModel.getPartnershipEnquiryById(id);

        if (!enquiry) {
            return res.status(404).json({
                success: false,
                message: "Partnership enquiry not found",
            });
        }

        res.json({
            success: true,
            data: enquiry,
        });
    } catch (err) {
        console.error("Error in getPartnershipEnquiryById:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// Create new partnership enquiry
const createPartnershipEnquiry = async (req, res) => {
    try {
        const enquiryData = req.body;

        // Validate required fields
        if (!enquiryData.company_name || !enquiryData.contact_person || !enquiryData.email || !enquiryData.phone) {
            return res.status(400).json({
                success: false,
                message: "Company name, contact person, email and phone are required fields",
            });
        }

        const enquiry = await PartnershipEnquiryModel.createPartnershipEnquiry(enquiryData);

        res.status(201).json({
            success: true,
            message: "Partnership enquiry created successfully",
            data: enquiry,
        });
    } catch (err) {
        console.error("Error in createPartnershipEnquiry:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// Update partnership enquiry
const updatePartnershipEnquiry = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const existingEnquiry = await PartnershipEnquiryModel.getPartnershipEnquiryById(id);
        if (!existingEnquiry) {
            return res.status(404).json({
                success: false,
                message: "Partnership enquiry not found",
            });
        }

        const result = await PartnershipEnquiryModel.updatePartnershipEnquiry(id, updateData);

        res.json({
            success: true,
            message: "Partnership enquiry updated successfully",
            affectedRows: result.affectedRows,
        });
    } catch (err) {
        console.error("Error in updatePartnershipEnquiry:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// Delete partnership enquiry
const deletePartnershipEnquiry = async (req, res) => {
    try {
        const { id } = req.params;

        const existingEnquiry = await PartnershipEnquiryModel.getPartnershipEnquiryById(id);
        if (!existingEnquiry) {
            return res.status(404).json({
                success: false,
                message: "Partnership enquiry not found",
            });
        }

        const result = await PartnershipEnquiryModel.deletePartnershipEnquiry(id);

        res.json({
            success: true,
            message: "Partnership enquiry deleted successfully",
            affectedRows: result.affectedRows,
        });
    } catch (err) {
        console.error("Error in deletePartnershipEnquiry:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// Bulk delete partnership enquiries
const bulkDeletePartnershipEnquiries = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of enquiry IDs to delete",
            });
        }

        const result = await PartnershipEnquiryModel.bulkDeletePartnershipEnquiries(ids);

        res.json({
            success: true,
            message: `${result.affectedRows} partnership enquiries deleted successfully`,
            affectedRows: result.affectedRows,
        });
    } catch (err) {
        console.error("Error in bulkDeletePartnershipEnquiries:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// Get partnership enquiry stats
const getPartnershipStats = async (req, res) => {
    try {
        const stats = await PartnershipEnquiryModel.getPartnershipStats();

        res.json({
            success: true,
            data: stats,
        });
    } catch (err) {
        console.error("Error in getPartnershipStats:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

module.exports = {
    getPartnershipEnquiries,
    getPartnershipEnquiryById,
    createPartnershipEnquiry,
    updatePartnershipEnquiry,
    deletePartnershipEnquiry,
    bulkDeletePartnershipEnquiries,
    getPartnershipStats,
};