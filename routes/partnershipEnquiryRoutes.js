const express = require('express');
const router = express.Router();
const partnershipEnquiryController = require('../controllers/partnershipEnquiryController');

// Existing routes
router.get('/', partnershipEnquiryController.getPartnershipEnquiries);
router.get('/stats', partnershipEnquiryController.getPartnershipStats);
router.get('/:id', partnershipEnquiryController.getPartnershipEnquiryById);
router.post('/', partnershipEnquiryController.createPartnershipEnquiry);
router.put('/:id', partnershipEnquiryController.updatePartnershipEnquiry);
router.delete('/:id', partnershipEnquiryController.deletePartnershipEnquiry);
router.post('/bulk-delete', partnershipEnquiryController.bulkDeletePartnershipEnquiries);

// New routes for followups
router.post('/:id/followup', partnershipEnquiryController.addPartnershipFollowup);
router.get('/:id/followups', partnershipEnquiryController.getPartnershipFollowupHistory);
router.patch('/:id/status', partnershipEnquiryController.updatePartnershipStatus);

module.exports = router;