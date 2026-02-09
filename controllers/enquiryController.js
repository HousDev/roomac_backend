const EnquiryModel = require("../models/enquiryModel");

// Get all enquiries with optional filters
const getEnquiries = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      assigned_to: req.query.assigned_to,
      property_id: req.query.property_id,
      search: req.query.search,
    };

    const enquiries = await EnquiryModel.getAllEnquiries(filters);
    res.json({
      success: true,
      count: enquiries.length,
      results: enquiries,
    });
  } catch (err) {
    console.error("Error in getEnquiries:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Get single enquiry by ID
const getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await EnquiryModel.getEnquiryById(id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.json({
      success: true,
      data: enquiry,
    });
  } catch (err) {
    console.error("Error in getEnquiryById:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Create new enquiry
const createEnquiry = async (req, res) => {
  try {
    const enquiryData = req.body;

    // Validate required fields
    if (!enquiryData.tenant_name || !enquiryData.phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required fields",
      });
    }

    const enquiry = await EnquiryModel.createEnquiry(enquiryData);

    res.status(201).json({
      success: true,
      message: "Enquiry created successfully",
      data: enquiry,
    });
  } catch (err) {
    console.error("Error in createEnquiry:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Update enquiry
const updateEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if enquiry exists
    const existingEnquiry = await EnquiryModel.getEnquiryById(id);
    if (!existingEnquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const result = await EnquiryModel.updateEnquiry(id, updateData);

    res.json({
      success: true,
      message: "Enquiry updated successfully",
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error("Error in updateEnquiry:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Delete enquiry
const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if enquiry exists
    const existingEnquiry = await EnquiryModel.getEnquiryById(id);
    if (!existingEnquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const result = await EnquiryModel.deleteEnquiry(id);

    res.json({
      success: true,
      message: "Enquiry deleted successfully",
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error("Error in deleteEnquiry:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Add followup to enquiry
const addFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const followupData = req.body;

    // Validate required fields
    if (!followupData.note) {
      return res.status(400).json({
        success: false,
        message: "Followup note is required",
      });
    }

    // Check if enquiry exists
    const existingEnquiry = await EnquiryModel.getEnquiryById(id);
    if (!existingEnquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const followup = await EnquiryModel.addFollowup(id, {
      ...followupData,
      created_by: followupData.created_by || "Admin",
    });

    // Update enquiry status if provided in followup
    if (followupData.status) {
      await EnquiryModel.updateEnquiry(id, { status: followupData.status });
    }

    res.status(201).json({
      success: true,
      message: "Followup added successfully",
      data: followup,
    });
  } catch (err) {
    console.error("Error in addFollowup:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Get followups for enquiry
const getFollowups = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if enquiry exists
    const existingEnquiry = await EnquiryModel.getEnquiryById(id);
    if (!existingEnquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const followups = await EnquiryModel.getFollowups(id);

    res.json({
      success: true,
      count: followups.length,
      data: followups,
    });
  } catch (err) {
    console.error("Error in getFollowups:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Get enquiry statistics
const getEnquiryStats = async (req, res) => {
  try {
    const stats = await EnquiryModel.getEnquiryStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("Error in getEnquiryStats:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

module.exports = {
  getEnquiries,
  getEnquiryById,
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  addFollowup,
  getFollowups,
  getEnquiryStats,
};
