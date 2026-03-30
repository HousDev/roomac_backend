// controllers/enquiryController.js
const EnquiryModel = require("../models/enquiryModel");
const db = require("../config/db");

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

// controllers/enquiryController.js

// Create or update enquiry silently (no messages)
const createOrUpdateEnquiry = async (req, res) => {
  try {
    const enquiryData = req.body;
    
    // Validate required fields
    if (!enquiryData.tenant_name || !enquiryData.phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required fields",
      });
    }

    // Check if enquiry already exists with same phone and property
    let existingEnquiry = null;
    
    // Try to find by phone and property
    if (enquiryData.previousEmail && enquiryData.property_id) {
      const [existing] = await db.query(
        `SELECT id, tenant_name, phone, status, created_at 
         FROM enquiries 
         WHERE email = ? 
           AND property_id = ? 
           AND status NOT IN ('converted', 'closed')
           AND deleted_at IS NULL
         ORDER BY created_at DESC 
         LIMIT 1`,
        [enquiryData.previousEmail, enquiryData.property_id]
      );
      console.log("dfasd", existing,enquiryData)
      if (existing.length > 0) {
        existingEnquiry = existing[0];
      }
    }
    
    let enquiry;
    if (existingEnquiry) {
      // Update existing enquiry with latest details
      const updateData = {
        tenant_name: enquiryData.tenant_name,
        email: enquiryData.email,
        phone: enquiryData.phone,
        property_name: enquiryData.property_name,
        preferred_move_in_date: enquiryData.preferred_move_in_date,
        budget_range: enquiryData.budget_range,
        message: enquiryData.message,
        source: enquiryData.source,
        occupation: enquiryData.occupation,
        occupation_category: enquiryData.occupation_category,
        remark: enquiryData.remark,
        updated_at: new Date()
      };
      
      await EnquiryModel.updateEnquiry(existingEnquiry.id, updateData);
      
      // Fetch the updated enquiry
      enquiry = await EnquiryModel.getEnquiryById(existingEnquiry.id);
      
    } else {
      // Create new enquiry
      const newEnquiry = await EnquiryModel.createEnquiry(enquiryData);
      enquiry = newEnquiry;
    }
    
    // Return success without any messages
    res.status(200).json({
      success: true,
      data: {
        id: enquiry.id,
        is_new: !existingEnquiry
      }
    });
    
  } catch (err) {
    console.error("Error in createOrUpdateEnquiry:", err);
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

// Schedule a new visit
const scheduleVisit = async (req, res) => {
  try {
    const { id } = req.params; 
    const visitData = req.body;

    // Validate required fields
    if (!visitData.scheduled_date) {
      return res.status(400).json({
        success: false,
        message: "Scheduled date is required",
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

    const visit = await EnquiryModel.scheduleVisit(id, {
      ...visitData,
      created_by: req.user?.name || "Admin",
    });

    res.status(201).json({
      success: true,
      message: "Visit scheduled successfully",
      data: visit,
    });
  } catch (err) {
    console.error("Error in scheduleVisit:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Get all visits for an enquiry
const getVisits = async (req, res) => {
  try {
    const { id } = req.params;
    const visits = await EnquiryModel.getVisits(id);

    res.json({
      success: true,
      count: visits.length,
      data: visits,
    });
  } catch (err) {
    console.error("Error in getVisits:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Update visit status
const updateVisitStatus = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const result = await EnquiryModel.updateVisitStatus(visitId, status, notes);

    res.json({
      success: true,
      message: "Visit status updated successfully",
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error("Error in updateVisitStatus:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Get upcoming visits
const getUpcomingVisits = async (req, res) => {
  try {
    const days = req.query.days || 7;
    const visits = await EnquiryModel.getUpcomingVisits(days);

    res.json({
      success: true,
      count: visits.length,
      data: visits,
    });
  } catch (err) {
    console.error("Error in getUpcomingVisits:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Get today's visits
const getTodayVisits = async (req, res) => {
  try {
    const visits = await EnquiryModel.getTodayVisits();

    res.json({
      success: true,
      count: visits.length,
      data: visits,
    });
  } catch (err) {
    console.error("Error in getTodayVisits:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Convert enquiry to tenant
const convertToTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, selectedTenantId } = req.body; 

    // Check if enquiry exists
    const existingEnquiry = await EnquiryModel.getEnquiryById(id);
    if (!existingEnquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    // Check if enquiry is already converted
    if (existingEnquiry.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: "Enquiry is already converted to a tenant",
      });
    }

    // If we have an action from the frontend, handle accordingly
    if (action === 'create_new') {
      
      const result = await EnquiryModel.convertToTenant(id, { forceNew: true });
      return res.json({
        success: true,
        message: "New tenant created successfully from enquiry",
        tenant_id: result.tenantId,
        enquiry: result.enquiry,
      });
    }

    if (action === 'update_existing' && selectedTenantId) {
      // Update specific existing tenant
      const result = await EnquiryModel.convertToTenant(id, { 
        updateExistingId: selectedTenantId 
      });
      return res.json({
        success: true,
        message: "Existing tenant updated successfully",
        tenant_id: result.tenantId,
        enquiry: result.enquiry,
      });
    }

    // Check for existing tenants first
    const existingTenants = await EnquiryModel.checkExistingTenants(
      existingEnquiry.email,
      existingEnquiry.phone
    );

    if (existingTenants.length > 0) {
      // Return the list of matching tenants for user to decide
      return res.json({
        success: true,
        requiresAction: true,
        message: "Found existing tenants with matching email or phone",
        existingTenants: existingTenants.map(t => ({
          id: t.id,
          full_name: t.full_name,
          email: t.email,
          phone: t.phone,
          is_deleted: !!t.deleted_at
        })),
        enquiry: existingEnquiry
      });
    }

    // No conflicts, proceed with conversion
    const result = await EnquiryModel.convertToTenant(id);
    res.json({
      success: true,
      message: "Enquiry converted to tenant successfully",
      tenant_id: result.tenantId,
      enquiry: result.enquiry,
    });
  } catch (err) {
    console.error("Error in convertToTenant:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Bulk delete enquiries
const bulkDeleteEnquiries = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of enquiry IDs to delete",
      });
    }

    const result = await EnquiryModel.bulkDeleteEnquiries(ids);

    res.json({
      success: true,
      message: `${result.affectedRows} enquiries deleted successfully`,
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error("Error in bulkDeleteEnquiries:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};


// Make sure to export these methods
module.exports = {
  getEnquiries,
  getEnquiryById,
  createEnquiry,
  createOrUpdateEnquiry,
  updateEnquiry,
  deleteEnquiry,
  addFollowup,
  getFollowups,
  getEnquiryStats,
  scheduleVisit,
  getVisits,
  updateVisitStatus,
  getUpcomingVisits,
  getTodayVisits,
  convertToTenant,
  bulkDeleteEnquiries,
};