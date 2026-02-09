// In offerRoutes.js - REORDER ROUTES!
const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");


// In offerRoutes.js - add debugging middleware
router.use((req, res, next) => {
    console.log(`[OFFERS API] ${req.method} ${req.originalUrl}`);
    console.log(`Query params:`, req.query);
    console.log(`Route params:`, req.params);
    next();
});
// router.get("/health", offerController.healthCheck);

// GET all offers
router.get("/", offerController.getOffers);

// GET offers with pagination
router.get("/paginated", offerController.getOffersPaginated);

// Generate unique offer code - MUST COME BEFORE :id ROUTES!
router.get("/generate-code", offerController.generateOfferCode);

// Get rooms by property for offer creation
router.get("/property/:propertyId/rooms", offerController.getRoomsByProperty);

// GET single offer
router.get("/:id", offerController.getOfferById);

// CREATE offer
router.post("/", offerController.createOffer);

// UPDATE offer (full update)
router.patch("/:id", offerController.updateOffer);

// TOGGLE offer status (only is_active)
router.patch("/:id/toggle", offerController.toggleOffer);

// DELETE offer
router.delete("/:id", offerController.deleteOffer);


module.exports = router;