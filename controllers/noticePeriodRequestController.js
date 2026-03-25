// controllers/noticePeriodRequestController.js
const NoticePeriodRequestModel = require("../models/noticePeriodRequestModel");
const TenantModel = require("../models/tenantModel");
const db = require("../config/db");
const tenantNotificationController = require("./tenantNotificationController");

const NoticePeriodRequestController = {
  // Get all notice period requests (admin view)
  async list(req, res) {
    try {
      const page = parseInt(req.query.page || "1", 10);
      const pageSize = parseInt(req.query.pageSize || "50", 10);
      const search = req.query.search;

      const result = await NoticePeriodRequestModel.findAll({
        page,
        pageSize,
        search
      });

      const unseenCount = await NoticePeriodRequestModel.getTotalUnseenCount();

      return res.json({
        success: true,
        data: result.rows,
        meta: {
          total: result.total,
          unseen: unseenCount
        }
      });
    } catch (err) {
      console.error("NoticePeriodRequestController.list error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notice period requests"
      });
    }
  },

  // Create a new notice period request (admin sending to tenant)
  async create(req, res) {
    try {
      const { tenant_id, title, description, notice_period_date } = req.body;

      // Validate required fields
      if (!tenant_id) {
        return res.status(400).json({
          success: false,
          message: "Tenant ID is required"
        });
      }

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Title is required"
        });
      }

      if (!notice_period_date) {
        return res.status(400).json({
          success: false,
          message: "Notice period date is required"
        });
      }

      // Check if tenant exists
      const tenant = await TenantModel.findById(tenant_id);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found"
        });
      }

      // Create the notice period request
      const requestData = {
        tenant_id,
        title,
        description,
        notice_period_date
      };

      const requestId = await NoticePeriodRequestModel.create(requestData);

      // Create notification for tenant using your existing notification system
      const formattedDate = new Date(notice_period_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const notificationMessage = description 
        ? `Notice Period: "${title}" ends on ${formattedDate}. ${description}`
        : `Notice Period: "${title}" ends on ${formattedDate}`;

      await tenantNotificationController.createNotification({
        tenantId: tenant_id,
        title: `📋 Notice Period: ${title}`,
        message: notificationMessage,
        notificationType: 'notice_period',
        relatedEntityType: 'notice_period',
        relatedEntityId: requestId,
        priority: 'high'
      });

      // Send email notification
      try {
        const { sendEmail } = require("../utils/emailService");
        
        await sendEmail(
          tenant.email,
          `Notice Period Request: ${title}`,
          `
          <h2>Notice Period Request</h2>
          
          <p>Hello ${tenant.full_name},</p>
          
          <p>You have received a new notice period request:</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin-top: 0;">${title}</h3>
            <p><strong>Notice Period Date:</strong> ${formattedDate}</p>
            ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
          </div>
          
          <p>Please check your tenant dashboard for more details.</p>
          
          <br/>
          <p>Thank you,<br/>ROOMAC Team</p>
          `
        );
      } catch (emailErr) {
        console.error("❌ Failed to send notice period email:", emailErr);
      }

      return res.status(201).json({
        success: true,
        message: "Notice period request sent to tenant successfully",
        request_id: requestId
      });
    } catch (err) {
      console.error("NoticePeriodRequestController.create error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to create notice period request: " + err.message
      });
    }
  },

  // Get unseen count for admin
  async getUnseenCount(req, res) {
    try {
      const count = await NoticePeriodRequestModel.getTotalUnseenCount();
      return res.json({
        success: true,
        unseen: count
      });
    } catch (err) {
      console.error("NoticePeriodRequestController.getUnseenCount error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to get unseen count"
      });
    }
  },

  // Delete a request (admin only)
  async delete(req, res) {
    try {
      const id = req.params.id;
      const deleted = await NoticePeriodRequestModel.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Notice period request not found"
        });
      }

      return res.json({
        success: true,
        message: "Notice period request deleted successfully"
      });
    } catch (err) {
      console.error("NoticePeriodRequestController.delete error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to delete notice period request"
      });
    }
  },

  // ========== TENANT ROUTES ==========

  // Get unseen count for current tenant (called by notification system)
  async getTenantUnseenCount(req, res) {
    try {
      const tenantId = req.user.id; // From tenantAuth middleware

      const count = await NoticePeriodRequestModel.getUnseenCountByTenant(tenantId);

      return res.json({
        success: true,
        count
      });
    } catch (err) {
      console.error("NoticePeriodRequestController.getTenantUnseenCount error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to get unseen count"
      });
    }
  },

  // Mark a request as seen (when tenant clicks notification)
  async markAsSeen(req, res) {
    try {
      const id = req.params.id;
      const tenantId = req.user.id; // From tenantAuth middleware

      const marked = await NoticePeriodRequestModel.markAsSeen(id, tenantId);

      if (!marked) {
        return res.status(404).json({
          success: false,
          message: "Request not found or already seen"
        });
      }

      return res.json({
        success: true,
        message: "Request marked as seen"
      });
    } catch (err) {
      console.error("NoticePeriodRequestController.markAsSeen error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to mark request as seen"
      });
    }
  }
};

module.exports = NoticePeriodRequestController;