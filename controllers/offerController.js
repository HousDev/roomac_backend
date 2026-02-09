const OfferModel = require("../models/offersModel");

exports.getOffers = async (req, res) => {
  try {
    const offers = await OfferModel.findAll();
    res.json(offers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch offers" });
  }
};

// Get offers with pagination
exports.getOffersPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offer_type = req.query.offer_type || 'all';
    const property_id = req.query.property_id || 'all';
    const is_active = req.query.is_active !== undefined 
      ? req.query.is_active === 'true' 
      : undefined;

    const filters = {
      search,
      offer_type,
      property_id,
      is_active
    };

    const offers = await OfferModel.findAllWithPagination(page, limit, filters);
    const total = await OfferModel.getTotalCount(filters);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: offers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    });
  } catch (error) {
    console.error("Error fetching offers with pagination:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch offers" 
    });
  }
};

exports.getOfferById = async (req, res) => {
  try {
    const offer = await OfferModel.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.json(offer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch offer" });
  }
};

exports.createOffer = async (req, res) => {
  try {
    // Check for duplicate offer code if provided
    if (req.body.code) {
      const codeExists = await OfferModel.checkCodeExists(req.body.code);
      if (codeExists) {
        return res.status(400).json({ 
          message: "Offer code already exists. Please use a unique code." 
        });
      }
    }

    const result = await OfferModel.create(req.body);

    res.status(201).json({
      message: "Offer created successfully",
      id: result.id,
      code: result.code,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create offer" });
  }
};

exports.updateOffer = async (req, res) => {
  try {
    // Check for duplicate offer code (excluding current offer)
    if (req.body.code) {
      const codeExists = await OfferModel.checkCodeExists(req.body.code, req.params.id);
      if (codeExists) {
        return res.status(400).json({ 
          message: "Offer code already exists. Please use a unique code." 
        });
      }
    }

    await OfferModel.update(req.params.id, req.body);
    res.json({ message: "Offer updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update offer" });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    await OfferModel.delete(req.params.id);
    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete offer" });
  }
};

exports.toggleOffer = async (req, res) => {
  try {
    const { is_active } = req.body;
    
    // Get current offer to preserve all other fields
    const currentOffer = await OfferModel.findById(req.params.id);
    
    if (!currentOffer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // Only update is_active field
    await OfferModel.updateOnlyActive(req.params.id, is_active);
    
    res.json({ 
      message: "Offer status updated successfully",
      is_active: is_active 
    });
  } catch (error) {
    console.error("Error toggling offer:", error);
    res.status(500).json({ message: "Failed to update offer status" });
  }
};

// Get rooms by property for offer creation
exports.getRoomsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const rooms = await OfferModel.getRoomsByPropertyId(propertyId);
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};

// Generate a unique offer code
exports.generateOfferCode = async (req, res) => {
  try {
    const code = await OfferModel.generateUniqueCode();
    res.json({ 
      code,
      success: true,
      message: "Code generated successfully"
    });
  } catch (error) {
    console.error("Error generating offer code:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to generate offer code",
      error: error.message 
    });
  }
};

// In offerController.js - add a simple test function
exports.healthCheck = async (req, res) => {
  res.json({ 
    status: "OK",
    message: "Offers API is working",
    timestamp: new Date().toISOString()
  });
};

