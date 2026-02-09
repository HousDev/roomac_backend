const express = require('express');
const router = express.Router();
const ChangeBedController = require('../controllers/changeBedController');

// Step 1: Master data
router.get('/change-reasons', ChangeBedController.getChangeReasons);
router.get('/sharing-types', ChangeBedController.getSharingTypes);

// Step 2: Current state
router.get('/current-assignment/:tenantId', ChangeBedController.getCurrentAssignment);

// Step 3: Room selection
router.get('/compatible-rooms', ChangeBedController.getCompatibleRooms);

// Step 4: Bed selection
router.get('/available-beds', ChangeBedController.getAvailableBeds);

// Step 5: Rent calculation
router.get('/rent-difference', ChangeBedController.calculateRentDifference);

// Final step: Execute change
router.post('/execute-change', ChangeBedController.executeBedChange);

module.exports = router;