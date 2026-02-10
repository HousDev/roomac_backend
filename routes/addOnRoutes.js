const express = require('express');
const router = express.Router();
const addOnController = require('../controllers/addOnController');

// Public routes (no auth for now - add later)
router.get('/', addOnController.getAll);
router.get('/stats', addOnController.getStats);
router.get('/categories', addOnController.getCategories);
router.get('/:id', addOnController.getOne);

// Protected routes 
router.post('/', addOnController.create);
router.put('/:id', addOnController.update);
router.delete('/:id', addOnController.delete);
router.patch('/:id/toggle-status', addOnController.toggleStatus);

module.exports = router;