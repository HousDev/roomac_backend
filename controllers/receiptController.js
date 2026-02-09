// controllers/receiptController.js
const TenantRequest = require('../models/tenantRequestModel');

class ReceiptController {
  // Get all receipt requests
  static async getReceiptRequests(req, res) {
    try {
      const { status, search, receipt_type } = req.query;
      
      let query = `
        SELECT tr.*, 
               t.full_name as tenant_name, 
               t.phone as tenant_phone,
               p.name as property_name,
               r.receipt_number,
               r.amount,
               r.receipt_type,
               r.generated_at,
               r.generated_by
        FROM tenant_requests tr
        LEFT JOIN tenants t ON tr.tenant_id = t.id
        LEFT JOIN properties p ON tr.property_id = p.id
        LEFT JOIN receipts r ON tr.id = r.request_id
        WHERE tr.request_type = 'receipt'
      `;
      
      const params = [];
      
      if (status) {
        query += ' AND tr.status = ?';
        params.push(status);
      }
      
      if (receipt_type) {
        query += ' AND r.receipt_type = ?';
        params.push(receipt_type);
      }
      
      if (search) {
        query += ' AND (tr.title LIKE ? OR tr.description LIKE ? OR t.full_name LIKE ? OR r.receipt_number LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      query += ' ORDER BY tr.created_at DESC';
      
      const db = require('../config/db');
      const [requests] = await db.execute(query, params);
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Error fetching receipt requests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch receipt requests',
        details: error.message
      });
    }
  }

  // Get receipt request by ID
  static async getReceiptById(req, res) {
    try {
      const { id } = req.params;
      
      const db = require('../config/db');
      const [request] = await db.execute(`
        SELECT tr.*, 
               t.full_name as tenant_name, 
               t.phone as tenant_phone,
               t.email as tenant_email,
               p.name as property_name,
               p.address as property_address,
               r.receipt_number,
               r.amount,
               r.receipt_type,
               r.payment_mode,
               r.payment_date,
               r.generated_at,
               r.generated_by,
               r.additional_notes,
               u.name as generated_by_name
        FROM tenant_requests tr
        LEFT JOIN tenants t ON tr.tenant_id = t.id
        LEFT JOIN properties p ON tr.property_id = p.id
        LEFT JOIN receipts r ON tr.id = r.request_id
        LEFT JOIN users u ON r.generated_by = u.id
        WHERE tr.id = ? AND tr.request_type = 'receipt'
      `, [id]);
      
      if (request.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Receipt request not found'
        });
      }
      
      res.json({
        success: true,
        data: request[0]
      });
    } catch (error) {
      console.error('Error fetching receipt request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch receipt request',
        details: error.message
      });
    }
  }

  // Generate receipt
  static async generateReceipt(req, res) {
    try {
      const { id } = req.params;
      const { 
        amount, 
        receipt_type, 
        payment_mode, 
        payment_date, 
        additional_notes,
        receipt_number 
      } = req.body;
      
      const adminId = req.user.adminId;
      
      if (!amount || !receipt_type) {
        return res.status(400).json({
          success: false,
          error: 'Amount and receipt type are required'
        });
      }
      
      // Check if request exists and is a receipt request
      const request = await TenantRequest.findById(id);
      if (!request || request.request_type !== 'receipt') {
        return res.status(404).json({
          success: false,
          error: 'Receipt request not found'
        });
      }
      
      const db = require('../config/db');
      
      // Generate receipt number if not provided
      let finalReceiptNumber = receipt_number;
      if (!finalReceiptNumber) {
        const [lastReceipt] = await db.execute(
          'SELECT receipt_number FROM receipts ORDER BY id DESC LIMIT 1'
        );
        
        if (lastReceipt.length > 0) {
          const lastNum = parseInt(lastReceipt[0].receipt_number.split('-').pop()) || 0;
          finalReceiptNumber = `REC-${new Date().getFullYear()}-${(lastNum + 1).toString().padStart(4, '0')}`;
        } else {
          finalReceiptNumber = `REC-${new Date().getFullYear()}-0001`;
        }
      }
      
      // Check if receipt number already exists
      const [existingReceipt] = await db.execute(
        'SELECT id FROM receipts WHERE receipt_number = ?',
        [finalReceiptNumber]
      );
      
      if (existingReceipt.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Receipt number already exists'
        });
      }
      
      // Insert receipt record
      const [receiptResult] = await db.execute(`
        INSERT INTO receipts (
          request_id, receipt_number, amount, receipt_type, 
          payment_mode, payment_date, generated_by, additional_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, 
        finalReceiptNumber, 
        amount, 
        receipt_type, 
        payment_mode || 'cash', 
        payment_date || new Date(), 
        adminId, 
        additional_notes
      ]);
      
      // Update request status
      await TenantRequest.updateStatus(id, 'resolved', 
        `Receipt generated: ${finalReceiptNumber} - ${receipt_type} - ₹${amount}`
      );
      
      // Get updated request with receipt details
      const [updatedRequest] = await db.execute(`
        SELECT tr.*, 
               t.full_name as tenant_name, 
               r.receipt_number,
               r.amount,
               r.receipt_type,
               r.generated_at
        FROM tenant_requests tr
        LEFT JOIN tenants t ON tr.tenant_id = t.id
        LEFT JOIN receipts r ON tr.id = r.request_id
        WHERE tr.id = ?
      `, [id]);
      
      res.json({
        success: true,
        message: 'Receipt generated successfully',
        data: updatedRequest[0]
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate receipt',
        details: error.message
      });
    }
  }

  // Mark receipt as issued
  static async markReceiptIssued(req, res) {
    try {
      const { id } = req.params;
      const { issued_to, issued_by, issued_date, delivery_method } = req.body;
      
      const request = await TenantRequest.findById(id);
      if (!request || request.request_type !== 'receipt') {
        return res.status(404).json({
          success: false,
          error: 'Receipt request not found'
        });
      }
      
      const db = require('../config/db');
      
      // Update receipt status
      await db.execute(`
        UPDATE receipts 
        SET issued_to = ?, issued_by = ?, issued_date = ?, delivery_method = ?
        WHERE request_id = ?
      `, [
        issued_to || request.tenant_name,
        issued_by || req.user.adminId,
        issued_date || new Date(),
        delivery_method || 'hand_delivery',
        id
      ]);
      
      // Update request status to closed
      await TenantRequest.updateStatus(id, 'closed', 'Receipt issued to tenant');
      
      const updatedRequest = await TenantRequest.findById(id);
      
      res.json({
        success: true,
        message: 'Receipt marked as issued',
        data: updatedRequest
      });
    } catch (error) {
      console.error('Error marking receipt as issued:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark receipt as issued',
        details: error.message
      });
    }
  }

  // Get receipt statistics
  static async getReceiptStats(req, res) {
    try {
      const db = require('../config/db');
      
      const [stats] = await db.execute(`
        SELECT 
          COUNT(DISTINCT tr.id) as total_requests,
          SUM(CASE WHEN tr.status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN tr.status = 'resolved' THEN 1 ELSE 0 END) as generated,
          SUM(CASE WHEN tr.status = 'closed' THEN 1 ELSE 0 END) as issued,
          SUM(CASE WHEN r.receipt_type = 'rent' THEN 1 ELSE 0 END) as rent_receipts,
          SUM(CASE WHEN r.receipt_type = 'deposit' THEN 1 ELSE 0 END) as deposit_receipts,
          SUM(CASE WHEN r.receipt_type = 'maintenance' THEN 1 ELSE 0 END) as maintenance_receipts,
          SUM(CASE WHEN r.receipt_type = 'other' THEN 1 ELSE 0 END) as other_receipts,
          COALESCE(SUM(r.amount), 0) as total_amount
        FROM tenant_requests tr
        LEFT JOIN receipts r ON tr.id = r.request_id
        WHERE tr.request_type = 'receipt'
      `);
      
      res.json({
        success: true,
        data: stats[0]
      });
    } catch (error) {
      console.error('Error fetching receipt stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch receipt statistics',
        details: error.message
      });
    }
  }

  // Download receipt (PDF generation)
  static async downloadReceipt(req, res) {
    try {
      const { id } = req.params;
      
      const db = require('../config/db');
      const [receiptData] = await db.execute(`
        SELECT 
          tr.id as request_id,
          tr.created_at as request_date,
          t.full_name as tenant_name,
          t.phone as tenant_phone,
          t.email as tenant_email,
          p.name as property_name,
          p.address as property_address,
          r.receipt_number,
          r.amount,
          r.receipt_type,
          r.payment_mode,
          r.payment_date,
          r.generated_at,
          r.additional_notes,
          u.name as generated_by_name
        FROM tenant_requests tr
        LEFT JOIN tenants t ON tr.tenant_id = t.id
        LEFT JOIN properties p ON tr.property_id = p.id
        LEFT JOIN receipts r ON tr.id = r.request_id
        LEFT JOIN users u ON r.generated_by = u.id
        WHERE tr.id = ? AND tr.request_type = 'receipt'
      `, [id]);
      
      if (receiptData.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }
      
      const receipt = receiptData[0];
      
      // Generate PDF receipt (simplified - you'd use a PDF library like pdfkit)
      const receiptDetails = {
        receipt_number: receipt.receipt_number,
        date: new Date().toLocaleDateString(),
        tenant_name: receipt.tenant_name,
        property_name: receipt.property_name,
        property_address: receipt.property_address,
        amount: receipt.amount,
        receipt_type: receipt.receipt_type,
        payment_mode: receipt.payment_mode,
        payment_date: receipt.payment_date ? new Date(receipt.payment_date).toLocaleDateString() : 'N/A',
        generated_by: receipt.generated_by_name,
        notes: receipt.additional_notes
      };
      
      // For now, return receipt details
      // In production, you would generate and stream a PDF file
      res.json({
        success: true,
        message: 'Receipt download prepared',
        data: receiptDetails,
        download_url: `/api/receipts/${id}/pdf` // Placeholder for actual PDF endpoint
      });
    } catch (error) {
      console.error('Error preparing receipt download:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to prepare receipt download',
        details: error.message
      });
    }
  }

  // Delete receipt
  static async deleteReceipt(req, res) {
    try {
      const { id } = req.params;
      
      const db = require('../config/db');
      
      // Check if request exists
      const request = await TenantRequest.findById(id);
      if (!request || request.request_type !== 'receipt') {
        return res.status(404).json({
          success: false,
          error: 'Receipt request not found'
        });
      }
      
      // Delete receipt record
      await db.execute('DELETE FROM receipts WHERE request_id = ?', [id]);
      
      // Update request status back to pending
      await TenantRequest.updateStatus(id, 'pending', 'Receipt deleted, awaiting new generation');
      
      res.json({
        success: true,
        message: 'Receipt deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete receipt',
        details: error.message
      });
    }
  }
}

module.exports = ReceiptController;