const express = require('express');
const router = express.Router();
const templateController = require('../controllers/documentTemplateController');

// GET routes
router.get('/', templateController.getAll);
router.get('/:id', templateController.getById);

// POST routes with file upload
router.post('/', templateController.upload, templateController.create);
router.post('/bulk-delete', templateController.bulkDelete);
router.post('/bulk-status', templateController.bulkStatus);
router.post('/:id/restore/:version', templateController.restoreVersion);

// PUT route with file upload
router.put('/:id', templateController.upload, templateController.update);

// DELETE route
router.delete('/:id', templateController.remove);

module.exports = router;