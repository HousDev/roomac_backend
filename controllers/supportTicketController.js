// controllers/supportTicketController.js
const SupportTicketModel     = require('../models/supportTicketModel');
const TenantNotificationCtrl = require('./tenantNotificationController'); // existing controller
const db                     = require('../config/db');

// ── Notify admin when new ticket arrives ─────────────────────────────────────
async function notifyAdminNewTicket(ticket) {
  try {
    // ← Remove the users query, hardcode admin id = 1
    await db.query(
      `INSERT INTO notifications (
        recipient_id, recipient_type, title, message,
        notification_type, related_entity_type, related_entity_id,
        priority, is_read, created_at
      ) VALUES (1, 'admin', ?, ?, 'support_ticket', 'support_ticket', ?, ?, 0, NOW())`,
      [
        `🎧 New Support Ticket: ${ticket.subject}`,
        `${ticket.name} submitted a ${ticket.priority} priority support ticket. Category: ${ticket.category}.`,
        ticket.id,
        ticket.priority === 'urgent' ? 'urgent' : ticket.priority === 'high' ? 'high' : 'medium',
      ]
    );
    console.log('[SUPPORT] Admin notification inserted for ticket', ticket.id);
  } catch (err) {
    console.error('[SUPPORT] notifyAdminNewTicket error:', err);
  }
}

// ── Notify tenant on status update ───────────────────────────────────────────
async function notifyTenantStatusUpdate(ticketId, tenantId, newStatus, adminNote) {
  if (!tenantId) return;

  const labels = { open:'Open', in_progress:'In Progress', resolved:'Resolved', closed:'Closed' };
  const label  = labels[newStatus] || newStatus;
  const title  = `Support Ticket #${ticketId} — ${label}`;
  const msg    = adminNote
    ? `Your support ticket #${ticketId} status has been updated to ${label}. Note: ${adminNote}`
    : `Your support ticket #${ticketId} status has been updated to ${label}.`;

  try {
    await TenantNotificationCtrl.createNotification({
      tenantId,
      title,
      message:           msg,
      notificationType:  'support_ticket',
      relatedEntityType: 'support_ticket',
      relatedEntityId:   ticketId,
      priority:          newStatus === 'resolved' ? 'low' : 'medium',
    });
  } catch (err) {
    console.error('[SUPPORT] notifyTenantStatusUpdate error:', err);
  }
}

class SupportTicketController {

  // POST /api/support-tickets
  static async create(req, res) {
    try {
      const { name, email, phone, subject, category, priority, message, tenant_id } = req.body;

      if (!name || !email || !subject || !category || !message) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const id     = await SupportTicketModel.create({ name, email, phone, subject, category, priority, message, tenant_id });
      const ticket = await SupportTicketModel.getById(id);

      // Fire-and-forget admin notification
      notifyAdminNewTicket(ticket);

      res.status(201).json({
        success: true,
        data: { id },
        message: 'Support ticket submitted successfully',
      });
    } catch (err) {
      console.error('[SUPPORT] create error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to submit ticket' });
    }
  }

  // GET /api/support-tickets
  static async getAll(req, res) {
    try {
      const { status, priority, category, search } = req.query;
      const tickets = await SupportTicketModel.getAll({ status, priority, category, search });
      res.json({ success: true, data: tickets });
    } catch (err) {
      console.error('[SUPPORT] getAll error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch tickets' });
    }
  }

  // GET /api/support-tickets/:id
  static async getById(req, res) {
    try {
      const ticket = await SupportTicketModel.getById(parseInt(req.params.id));
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
      res.json({ success: true, data: ticket });
    } catch (err) {
      console.error('[SUPPORT] getById error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // PATCH /api/support-tickets/:id/status
  static async updateStatus(req, res) {
    try {
      const { status, admin_notes } = req.body;
      if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

      const id     = parseInt(req.params.id);
      const ticket = await SupportTicketModel.getById(id);
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

      const ok = await SupportTicketModel.updateStatus(id, status, admin_notes);
      if (!ok) return res.status(404).json({ success: false, message: 'Failed to update' });

      // Notify tenant if ticket belongs to a logged-in tenant
      if (ticket.tenant_id) {
        notifyTenantStatusUpdate(id, ticket.tenant_id, status, admin_notes);
      }

      res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
      console.error('[SUPPORT] updateStatus error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET /api/support-tickets/counts
  static async getCounts(req, res) {
    try {
      const counts = await SupportTicketModel.getCounts();
      res.json({ success: true, data: counts });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // DELETE /api/support-tickets/bulk  body: { ids: [1,2,3] }
  static async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No IDs provided' });
      }
      const deleted = await SupportTicketModel.bulkDelete(ids);
      res.json({ success: true, message: `${deleted} tickets deleted` });
    } catch (err) {
      console.error('[SUPPORT] bulkDelete error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = SupportTicketController;