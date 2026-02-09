const db = require('../config/db');
const VacateBedRequest = require('../models/vacateBedRequestModel');

class TenantRequestController {
  async create(req, res) {
    try {
      const tenant_id = req.user?.id;
      if (!tenant_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { 
        request_type, 
        title, 
        description, 
        priority,
        vacate_data 
      } = req.body;

      // Validate required fields
      if (!title || !description || !request_type) {
        return res.status(400).json({
          success: false,
          message: 'Title, description, and request type are required'
        });
      }

      // Get tenant's property and bed info
      const [tenantInfo] = await db.query(
        `SELECT property_id, bed_id, room_id FROM tenants WHERE id = ?`,
        [tenant_id]
      );

      if (tenantInfo.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      const tenantData = tenantInfo[0];
      const property_id = tenantData.property_id;
      const bed_id = tenantData.bed_id;
      const room_id = tenantData.room_id;

      // Start transaction
      await db.query('START TRANSACTION');

      try {
        // Create tenant_request record
        const [result] = await db.query(
          `INSERT INTO tenant_requests (
            tenant_id,
            property_id,
            request_type,
            title,
            description,
            priority,
            status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [tenant_id, property_id, request_type, title, description, priority]
        );

        const requestId = result.insertId;

        // If it's a vacate_bed request, create vacate_bed_request record
        if (request_type === 'vacate_bed' && vacate_data) {
          const {
            primary_reason_id,
            secondary_reasons,
            overall_rating,
            food_rating,
            cleanliness_rating,
            management_rating,
            improvement_suggestions
          } = vacate_data;

          // Create vacate_bed_requests record
          await db.query(
            `INSERT INTO vacate_bed_requests (
              tenant_id,
              property_id,
              bed_id,
              room_id,
              primary_reason_id,
              secondary_reasons,
              overall_rating,
              food_rating,
              cleanliness_rating,
              management_rating,
              improvement_suggestions,
              status,
              created_at,
              tenant_request_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
            [
              tenant_id,
              property_id,
              bed_id,
              room_id,
              primary_reason_id,
              secondary_reasons ? JSON.stringify(secondary_reasons) : null,
              overall_rating,
              food_rating,
              cleanliness_rating,
              management_rating,
              improvement_suggestions,
              requestId
            ]
          );
        }

        // If it's a change_bed request, you can handle it similarly
        if (request_type === 'change_bed') {
          // You can create a change_bed_requests table or add notes to tenant_request
          await db.query(
            `UPDATE tenant_requests SET 
              admin_notes = CONCAT(IFNULL(admin_notes, ''), '\\nChange bed request - Additional handling needed')
             WHERE id = ?`,
            [requestId]
          );
        }

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Request created successfully',
          request_id: requestId
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (err) {
      console.error('Create tenant request error:', err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  async getMyRequests(req, res) {
    try {
      const tenant_id = req.user?.id;
      if (!tenant_id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const [requests] = await db.query(
        `SELECT tr.*, 
                vbr.primary_reason_id,
                vbr.secondary_reasons,
                vbr.overall_rating,
                vbr.food_rating,
                vbr.cleanliness_rating,
                vbr.management_rating,
                vbr.improvement_suggestions
         FROM tenant_requests tr
         LEFT JOIN vacate_bed_requests vbr ON tr.id = vbr.tenant_request_id
         WHERE tr.tenant_id = ?
         ORDER BY tr.created_at DESC`,
        [tenant_id]
      );

      // Parse JSON fields
      const parsedRequests = requests.map(req => ({
        ...req,
        secondary_reasons: req.secondary_reasons ? JSON.parse(req.secondary_reasons) : null
      }));

      res.json({
        success: true,
        data: parsedRequests
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  async getRequestById(req, res) {
    try {
      const tenant_id = req.user?.id;
      const { id } = req.params;

      const [requests] = await db.query(
        `SELECT tr.*, 
                vbr.primary_reason_id,
                vbr.secondary_reasons,
                vbr.overall_rating,
                vbr.food_rating,
                vbr.cleanliness_rating,
                vbr.management_rating,
                vbr.improvement_suggestions,
                mv.value as primary_reason_name
         FROM tenant_requests tr
         LEFT JOIN vacate_bed_requests vbr ON tr.id = vbr.tenant_request_id
         LEFT JOIN master_values mv ON vbr.primary_reason_id = mv.id
         WHERE tr.id = ? AND tr.tenant_id = ?`,
        [id, tenant_id]
      );

      if (requests.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }

      const request = requests[0];
      // Parse JSON fields
      if (request.secondary_reasons) {
        request.secondary_reasons = JSON.parse(request.secondary_reasons);
      }

      res.json({
        success: true,
        data: request
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
}

module.exports = new TenantRequestController();