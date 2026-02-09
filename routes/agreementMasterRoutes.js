const express = require('express');
const router = express.Router();
const AgreementController = require('../controllers/agreementMaster.controller');

// Admin CRUD
router.post('/', AgreementController.create);
router.get('/', AgreementController.getAll);
router.get('/:id', AgreementController.getById);
router.put('/:id', AgreementController.update);
router.delete('/:id', AgreementController.delete);

// Used during bed assignment / vacate flow
router.get('/by-property-sharing/find', AgreementController.getByPropertySharing);

module.exports = router;
