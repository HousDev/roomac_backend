// controllers/maintenanceController.js
const TenantRequest = require('../models/tenantRequestModel');
const Staff = require('../models/staffModel');

class MaintenanceController {
  // Get all maintenance requests
  static async getMaintenanceRequests(req, res) {
    try {
      const { status, priority, search } = req.query;
      
      let query = `
        SELECT tr.*, 
               t.full_name as tenant_name, 
               t.phone as tenant_phone,
               p.name as property_name,
               s.name as assigned_to_name
        FROM tenant_requests tr
        LEFT JOIN tenants t ON tr.tenant_id = t.id
        LEFT JOIN properties p ON tr.property_id = p.id
        LEFT JOIN staff s ON tr.assigned_to = s.id
        WHERE tr.request_type = 'maintenance'
      `;
      
      const params = [];
      
      if (status) {
        query += ' AND tr.status = ?';
        params.push(status);
      }
      
      if (priority) {
        query += ' AND tr.priority = ?';
        params.push(priority);
      }
      
      if (search) {
        query += ' AND (tr.title LIKE ? OR tr.description LIKE ? OR t.full_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      query += ' ORDER BY tr.created_at DESC';
      
      const db = require('../config/db');
      const [requests] = await db.execute(query, params);
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch maintenance requests',
        details: error.message
      });
    }
  }

  // Get maintenance request by ID
  static async getMaintenanceById(req, res) {
    try {
      const { id } = req.params;
      
      const request = await TenantRequest.findById(id);
      
      if (!request || request.request_type !== 'maintenance') {
        return res.status(404).json({
          success: false,
          error: 'Maintenance request not found'
        });
      }
      
      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      console.error('Error fetching maintenance request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch maintenance request',
        details: error.message
      });
    }
  }

  // Update maintenance status
  static async updateMaintenanceStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, admin_notes, estimated_cost, completion_date } = req.body;
      const adminId = req.user.adminId;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }
      
      // Get current request
      const request = await TenantRequest.findById(id);
      if (!request || request.request_type !== 'maintenance') {
        return res.status(404).json({
          success: false,
          error: 'Maintenance request not found'
        });
      }
      
      // Prepare update data
      const updateData = { status };
      
      if (admin_notes) {
        updateData.admin_notes = admin_notes;
      }
      
      if (estimated_cost) {
        updateData.estimated_cost = estimated_cost;
      }
      
      if (completion_date) {
        updateData.completion_date = completion_date;
      }
      
      if (status === 'resolved' || status === 'completed') {
        updateData.resolved_at = new Date();
        updateData.resolved_by = adminId;
      }
      
      // Update the request
      const updatedRequest = await TenantRequest.update(id, updateData);
      
      res.json({
        success: true,
        message: 'Maintenance status updated successfully',
        data: updatedRequest
      });
    } catch (error) {
      console.error('Error updating maintenance status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update maintenance status',
        details: error.message
      });
    }
  }

  // Assign maintenance to staff
  static async assignMaintenance(req, res) {
    try {
      const { id } = req.params;
      const { assigned_to } = req.body;
      
      if (!assigned_to) {
        return res.status(400).json({
          success: false,
          error: 'Staff ID is required'
        });
      }
      
      // Check if request exists and is a maintenance request
      const request = await TenantRequest.findById(id);
      if (!request || request.request_type !== 'maintenance') {
        return res.status(404).json({
          success: false,
          error: 'Maintenance request not found'
        });
      }
      
      // Check if staff exists
      const staff = await Staff.findById(assigned_to);
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Staff member not found'
        });
      }
      
      // Assign maintenance to staff
      const updatedRequest = await TenantRequest.assignToStaff(id, assigned_to);
      
      // Update status to in_progress if not already
      if (updatedRequest.status === 'pending') {
        await TenantRequest.updateStatus(id, 'in_progress');
        updatedRequest.status = 'in_progress';
      }
      
      res.json({
        success: true,
        message: 'Maintenance assigned to staff successfully',
        data: updatedRequest
      });
    } catch (error) {
      console.error('Error assigning maintenance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign maintenance',
        details: error.message
      });
    }
  }

  // Get maintenance statistics
  static async getMaintenanceStats(req, res) {
    try {
      const db = require('../config/db');
      
      const [stats] = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low,
          AVG(TIMESTAMPDIFF(HOUR, created_at, COALESCE(resolved_at, NOW()))) as avg_resolution_hours,
          SUM(COALESCE(estimated_cost, 0)) as total_estimated_cost
        FROM tenant_requests 
        WHERE request_type = 'maintenance'
      `);
      
      res.json({
        success: true,
        data: stats[0]
      });
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch maintenance statistics',
        details: error.message
      });
    }
  }

  // Add maintenance note
  static async addMaintenanceNote(req, res) {
    try {
      const { id } = req.params;
      const { note, created_by } = req.body;
      
      if (!note) {
        return res.status(400).json({
          success: false,
          error: 'Note is required'
        });
      }
      
      const request = await TenantRequest.findById(id);
      if (!request || request.request_type !== 'maintenance') {
        return res.status(404).json({
          success: false,
          error: 'Maintenance request not found'
        });
      }
      
      // Add note to maintenance_notes table if it exists
      // For now, append to admin_notes
      const currentNotes = request.admin_notes || '';
      const newNotes = currentNotes + `\n[${new Date().toISOString()}] ${created_by || 'Admin'}: ${note}`;
      
      const updatedRequest = await TenantRequest.update(id, {
        admin_notes: newNotes
      });
      
      res.json({
        success: true,
        message: 'Note added successfully',
        data: updatedRequest
      });
    } catch (error) {
      console.error('Error adding maintenance note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add note',
        details: error.message
      });
    }
  }

  // Update estimated cost
  static async updateEstimatedCost(req, res) {
    try {
      const { id } = req.params;
      const { estimated_cost, cost_breakdown } = req.body;
      
      if (!estimated_cost || estimated_cost <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid estimated cost is required'
        });
      }
      
      const request = await TenantRequest.findById(id);
      if (!request || request.request_type !== 'maintenance') {
        return res.status(404).json({
          success: false,
          error: 'Maintenance request not found'
        });
      }
      
      const updateData = { estimated_cost };
      
      if (cost_breakdown) {
        updateData.cost_breakdown = cost_breakdown;
      }
      
      const updatedRequest = await TenantRequest.update(id, updateData);
      
      res.json({
        success: true,
        message: 'Estimated cost updated successfully',
        data: updatedRequest
      });
    } catch (error) {
      console.error('Error updating estimated cost:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update estimated cost',
        details: error.message
      });
    }
  }

  // Mark as completed
  static async markAsCompleted(req, res) {
    try {
      const { id } = req.params;
      const { actual_cost, completion_notes, completion_date } = req.body;
      const adminId = req.user.adminId;
      
      const request = await TenantRequest.findById(id);
      if (!request || request.request_type !== 'maintenance') {
        return res.status(404).json({
          success: false,
          error: 'Maintenance request not found'
        });
      }
      
      const updateData = {
        status: 'completed',
        resolved_at: completion_date ? new Date(completion_date) : new Date(),
        resolved_by: adminId,
        admin_notes: completion_notes || 'Maintenance completed'
      };
      
      if (actual_cost) {
        updateData.actual_cost = actual_cost;
      }
      
      const updatedRequest = await TenantRequest.update(id, updateData);
      
      res.json({
        success: true,
        message: 'Maintenance marked as completed',
        data: updatedRequest
      });
    } catch (error) {
      console.error('Error marking maintenance as completed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark maintenance as completed',
        details: error.message
      });
    }
  }

  // Get available maintenance staff
  static async getAvailableMaintenanceStaff(req, res) {
    try {
      const staff = await Staff.findByRole('maintenance');
      
      // Sort by assigned requests (least assigned first)
      staff.sort((a, b) => (a.assigned_requests || 0) - (b.assigned_requests || 0));
      
      res.json({
        success: true,
        data: staff
      });
    } catch (error) {
      console.error('Error fetching maintenance staff:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch maintenance staff',
        details: error.message
      });
    }
  }
}

module.exports = MaintenanceController;