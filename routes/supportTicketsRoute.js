const express = require('express');
const router  = express.Router();
const SupportTicketController = require('../controllers/supportTicketController');

router.post('/',             SupportTicketController.create);  // ← only ONE post route
router.get('/',              SupportTicketController.getAll);
router.get('/counts',        SupportTicketController.getCounts);
router.get('/:id',           SupportTicketController.getById);
router.patch('/:id/status',  SupportTicketController.updateStatus);
router.delete('/bulk',       SupportTicketController.bulkDelete);

module.exports = router;