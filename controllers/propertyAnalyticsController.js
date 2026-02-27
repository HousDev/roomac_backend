// controllers/propertyAnalyticsController.js
const PropertyAnalyticsModel = require("../models/propertyAnalyticsModel");

const PropertyAnalyticsController = {
  // POST /api/properties/:id/view - Increment view count
  async incrementView(req, res) {
    try {
      const propertyId = parseInt(req.params.id);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid property ID" 
        });
      }

      const result = await PropertyAnalyticsModel.incrementView(propertyId, req);
      
      res.json({
        success: true,
        data: {
          totalViews: result.totalViews,
          isNewView: result.isNewView
        }
      });
    } catch (error) {
      console.error("Error in incrementView:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to record view" 
      });
    }
  },

  // POST /api/properties/:id/shortlist - Toggle shortlist
  async toggleShortlist(req, res) {
    try {
      const propertyId = parseInt(req.params.id);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid property ID" 
        });
      }

      const result = await PropertyAnalyticsModel.toggleShortlist(propertyId, req);
      
      res.json({
        success: true,
        data: {
          isShortlisted: result.isShortlisted,
          totalShortlists: result.totalShortlists
        }
      });
    } catch (error) {
      console.error("Error in toggleShortlist:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to toggle shortlist" 
      });
    }
  },

  // GET /api/properties/:id/analytics - Get property analytics
  async getAnalytics(req, res) {
    try {
      const propertyId = parseInt(req.params.id);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid property ID" 
        });
      }

      const analytics = await PropertyAnalyticsModel.getAnalytics(propertyId);
      
      // Check if current session has shortlisted
      const isShortlisted = await PropertyAnalyticsModel.isShortlisted(propertyId, req);
      
      res.json({
        success: true,
        data: {
          ...analytics,
          isShortlisted
        }
      });
    } catch (error) {
      console.error("Error in getAnalytics:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get analytics" 
      });
    }
  },

  // GET /api/properties/:id/shortlist-status - Check if shortlisted
  async getShortlistStatus(req, res) {
    try {
      const propertyId = parseInt(req.params.id);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid property ID" 
        });
      }

      const isShortlisted = await PropertyAnalyticsModel.isShortlisted(propertyId, req);
      
      res.json({
        success: true,
        data: { isShortlisted }
      });
    } catch (error) {
      console.error("Error in getShortlistStatus:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to check shortlist status" 
      });
    }
  },

  // GET /api/properties/analytics/bulk - Get analytics for multiple properties
  async getBulkAnalytics(req, res) {
    try {
      const { ids } = req.query;
      
      if (!ids) {
        return res.status(400).json({ 
          success: false, 
          message: "Property IDs are required" 
        });
      }

      const propertyIds = ids.split(',').map(id => parseInt(id.trim()));
      
      const analytics = await PropertyAnalyticsModel.getBulkAnalytics(propertyIds, req);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error("Error in getBulkAnalytics:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get bulk analytics" 
      });
    }
  }
};

module.exports = PropertyAnalyticsController;