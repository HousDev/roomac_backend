// controllers/propertyController.js 
const PropertyModel = require("../models/propertyModel");
const db = require("../config/db");
const XLSX = require('xlsx');
const fs = require("fs");
const path = require("path");

/**
 * Read array fields from request body
 */
function readArray(body, key) {
  // Try FormData format first (with brackets)
  if (body[`${key}[]`] !== undefined) {
    const value = body[`${key}[]`];
    return Array.isArray(value) ? value : [value];
  }

  // Try regular key (JSON format)
  if (body[key] !== undefined) {
    if (Array.isArray(body[key])) return body[key];
    if (typeof body[key] === "string") {
      const trimmed = body[key].trim();
      if (trimmed === "") return [];

      // Try to parse as JSON array
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // If JSON parse fails, treat as comma-separated
        }
      }

      // Split by comma and filter out empty strings
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    return [String(body[key])];
  }

  return [];
}

/**
 * Parse terms from request
 */
function parseTermsData(termsJsonString, termsTextString) {
  try {
    // Try to parse structured terms JSON
    if (termsJsonString && termsJsonString.trim()) {
      const parsed = JSON.parse(termsJsonString);
      if (Array.isArray(parsed)) {
        // Validate and format terms
        const validatedTerms = parsed.map((term, index) => {
          if (typeof term === 'string') {
            return {
              id: `term-${index}`,
              text: term,
              category: 'general',
              isCustom: true,
              createdAt: new Date().toISOString()
            };
          }
          
          return {
            id: term.id || `term-${index}`,
            text: term.text || '',
            category: term.category || 'general',
            isCustom: term.isCustom !== false,
            variables: term.variables || {},
            createdAt: term.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }).filter(term => term.text && term.text.trim());
        
        return {
          terms_json: validatedTerms,
          terms_conditions: validatedTerms.map(t => t.text).join('\n')
        };
      }
    }
    
    // Fallback to plain text terms
    if (termsTextString && termsTextString.trim()) {
      const lines = termsTextString.split('\n').filter(line => line.trim());
      const termsArray = lines.map((line, index) => ({
        id: `term-${index}`,
        text: line.trim(),
        category: 'general',
        isCustom: true,
        createdAt: new Date().toISOString()
      }));
      
      return {
        terms_json: termsArray,
        terms_conditions: termsTextString.trim()
      };
    }
    
    return {
      terms_json: [],
      terms_conditions: null
    };
    
  } catch (error) {
    console.error("Error parsing terms:", error);
    
    // Fallback to plain text
    if (termsTextString && termsTextString.trim()) {
      return {
        terms_json: [],
        terms_conditions: termsTextString.trim()
      };
    }
    
    return {
      terms_json: [],
      terms_conditions: null
    };
  }
}

/**
 * Delete photo files from server
 */
function deletePhotoFiles(photoUrls) {
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
    return;
  }

  photoUrls.forEach((photoUrl) => {
    try {
      if (!photoUrl || typeof photoUrl !== "string") return;

      // Extract filename from URL
      const filename = photoUrl.split("/").pop();
      if (!filename) return;

      // Construct full file path
      const filePath = path.join(
        __dirname,
        "..",
        "uploads",
        "properties",
        filename
      );

      // Check if file exists and delete
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted photo file: ${filename}`);
      }
    } catch (err) {
      console.error(`❌ Error deleting photo ${photoUrl}:`, err.message);
    }
  });
}

const PropertyController = {
  // LIST PROPERTIES
  async list(req, res) {
    try {
      const page = parseInt(req.query.page || "1", 10);
      const pageSize = parseInt(req.query.pageSize || "20", 10);
      const search = req.query.search || "";
      const area = req.query.area || undefined;
      const state = req.query.state || undefined;

      const is_active =
        req.query.is_active !== undefined
          ? req.query.is_active === "true" || req.query.is_active === "1"
          : undefined;

      const result = await PropertyModel.findAll({
        page,
        pageSize,
        search,
        area,
        state,
        is_active,
      });

      return res.json({
        success: true,
        data: result.rows,
        meta: { total: result.total, page, pageSize },
      });
    } catch (error) {
      console.error("PropertyController.list error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch properties",
      });
    }
  },

  // GET BY ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const property = await PropertyModel.findById(id);

      if (!property) {
        return res
          .status(404)
          .json({ success: false, message: "Property not found" });
      }

      // Ensure terms_json exists for backward compatibility
      if (!property.terms_json && property.terms_conditions) {
        property.terms_json = parseTermsData(null, property.terms_conditions).terms_json;
      }

      return res.json({ success: true, data: property });
    } catch (error) {
      console.error("PropertyController.getById error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch property",
      });
    }
  },

// CREATE PROPERTY
async create(req, res) {
  try {
    console.log("📥 CREATE Property Request:");
    console.log("Body:", req.body);
    console.log("Compressed Files:", req.compressedImages?.length || 0);

    const body = req.body || {};

    // =====================
    // VALIDATIONS
    // =====================

    if (!body.name || body.name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Property name is required",
      });
    }

    if (!body.city_id || body.city_id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "City is required",
      });
    }

    if (!body.state || body.state.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "State is required",
      });
    }

    if (!body.area || body.area.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Area is required",
      });
    }

    // =====================
    // BUILD COMPRESSED IMAGE URLS
    // =====================

    const photo_urls =
      req.compressedImages && req.compressedImages.length > 0
        ? req.compressedImages.map((img) => img.path)
        : [];

    console.log("📸 Compressed Photo URLs:", photo_urls);

    // =====================
    // SLUG
    // =====================

    const slug = body.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");

    // =====================
    // ARRAYS
    // =====================

    const amenities = readArray(body, "amenities");
    const services = readArray(body, "services");
    const tags = readArray(body, "tags");

    console.log("🏷️ Tags:", tags);

    // =====================
    // TERMS & CONDITIONS
    // =====================

    const termsData = parseTermsData(
      body.terms_json,
      body.terms_conditions
    );

    console.log("📝 Terms parsed:", {
      termsCount: termsData.terms_json?.length || 0,
      hasText: !!termsData.terms_conditions,
    });

    // =====================
    // CREATE PROPERTY
    // =====================

    const newId = await PropertyModel.create({
      name: body.name.trim(),
      slug,
      city_id: body.city_id.trim(),
      state: body.state.trim(),
      area: body.area.trim(),
      address: body.address?.trim() || null,

      map_embed_url: body.map_embed_url?.trim() || null,
      map_direction_url: body.map_direction_url?.trim() || null,

      total_rooms: parseInt(body.total_rooms || 0),
      total_beds: parseInt(body.total_beds || 0),
      floor: body.floor,

      starting_price: parseFloat(body.starting_price || 0),
      security_deposit: parseFloat(body.security_deposit || 0),

      description: body.description?.trim() || null,

      property_manager_name: body.property_manager_name?.trim() || null,
      property_manager_phone: body.property_manager_phone?.trim() || null,
      property_manager_email: body.property_manager_email?.trim() || null,
      property_manager_role: body.property_manager_role?.trim() || null,
      staff_id: body.staff_id ? parseInt(body.staff_id) || null : null,

      amenities,
      services,
      photo_urls,

      // FIX: Handle property_rules as array or string
      property_rules: Array.isArray(body.property_rules)
        ? body.property_rules
        : body.property_rules?.trim() || null,

      is_active:
        body.is_active !== undefined
          ? body.is_active === true ||
            body.is_active === "true" ||
            body.is_active === "1"
          : true,

      rating: body.rating ? parseFloat(body.rating) : null,

      // =====================
      // LOCK-IN PERIOD
      // =====================

      lockin_period_months: parseInt(body.lockin_period_months || 0),
      lockin_penalty_amount: parseFloat(body.lockin_penalty_amount || 0),
      lockin_penalty_type: body.lockin_penalty_type || "fixed",

      // =====================
      // NOTICE PERIOD
      // =====================

      notice_period_days: parseInt(body.notice_period_days || 0),
      notice_penalty_amount: parseFloat(body.notice_penalty_amount || 0),
      notice_penalty_type: body.notice_penalty_type || "fixed",

      // =====================
      // TERMS
      // =====================

      terms_conditions: termsData.terms_conditions,
      terms_json: termsData.terms_json,

      // FIX: Handle additional_terms as array or string
      additional_terms: Array.isArray(body.additional_terms)
        ? body.additional_terms
        : body.additional_terms?.trim() || null,

      // =====================
      // TAGS
      // =====================

      tags,
    });

    console.log("✅ Property created with ID:", newId);

    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      id: newId,
    });

  } catch (error) {
    console.error("❌ PropertyController.create error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create property",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
},


 
// UPDATE PROPERTY
// UPDATE PROPERTY
async update(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    console.log("📥 UPDATE Property Request for ID:", id);
    console.log("Request Body:", JSON.stringify(body, null, 2));
    console.log("Compressed Files:", req.compressedImages?.length || 0);

    // Check if property exists
    const existing = await PropertyModel.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });
    }

    console.log("📸 Existing photos from DB:", existing.photo_urls);

    // CRITICAL FIX: Parse removed_photos properly - handle both array and string formats
    let removedPhotos = [];
    if (body.removed_photos) {
      if (Array.isArray(body.removed_photos)) {
        removedPhotos = body.removed_photos;
      } else if (typeof body.removed_photos === 'string') {
        try {
          removedPhotos = JSON.parse(body.removed_photos);
        } catch {
          removedPhotos = body.removed_photos.split(',').map(p => p.trim());
        }
      }
    }
    
    console.log("🗑️  Removed photos from request:", removedPhotos);

    // Delete removed photos from filesystem
    if (removedPhotos.length > 0) {
      console.log("🔄 Deleting photos from filesystem...");
      deletePhotoFiles(removedPhotos);
    }

    // Get existing photos from database
    const existingPhotoUrls = Array.isArray(existing.photo_urls)
      ? existing.photo_urls
      : [];

    // Filter out removed photos from existing
    const filteredExistingPhotoUrls = existingPhotoUrls.filter(
      (photo) => !removedPhotos.includes(photo)
    );

    console.log(
      "✅ Existing photos after removal:",
      filteredExistingPhotoUrls
    );

    // Add new uploaded (COMPRESSED) photos
    const newPhotoUrls =
      req.compressedImages && req.compressedImages.length > 0
        ? req.compressedImages.map((img) => img.path)
        : [];

    console.log("🆕 New uploaded photos:", newPhotoUrls);

    // Combine existing (filtered) and new photos
    const finalPhotoUrls = [...filteredExistingPhotoUrls, ...newPhotoUrls];

    console.log("🖼️  Final photo URLs for database:", finalPhotoUrls);

    // Parse terms data
    const termsData = parseTermsData(body.terms_json, body.terms_conditions);
    console.log("📝 Updated terms data:", {
      termsCount: termsData.terms_json?.length || 0,
      hasTermsText: !!termsData.terms_conditions
    });

    // Prepare update data
    const updateData = {
      photo_urls: finalPhotoUrls,
    };

    // Update other fields if provided
    if (body.name !== undefined && body.name.trim() !== "") {
      updateData.name = body.name.trim();
      updateData.slug = body.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");
    }

    if (body.city_id !== undefined && body.city_id.trim() !== "") {
      updateData.city_id = body.city_id.trim();
    }

    // ADD STATE FIELD UPDATE
    if (body.state !== undefined && body.state.trim() !== "") {
      updateData.state = body.state.trim();
      console.log("🏷️ Updated state:", updateData.state);
    }

    if (body.area !== undefined && body.area.trim() !== "") {
      updateData.area = body.area.trim();
    }

    if (body.address !== undefined) {
      updateData.address = body.address.trim() || null;
    }
    if (body.map_embed_url !== undefined) {
      updateData.map_embed_url = body.map_embed_url.trim() || null;
    }

    if (body.map_direction_url !== undefined) {
      updateData.map_direction_url = body.map_direction_url.trim() || null;
    }

    console.log("🏷️ State value received:", body.state);
    console.log("🏷️ State will be updated to:", updateData.state);

    // Handle numeric fields
    const numericFields = [
      "total_rooms",
      "total_beds",
      "starting_price",
      "security_deposit",
    ];

    numericFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = parseFloat(body[field]) || 0;
      }
    });

    // Handle text fields
    if (body.description !== undefined) {
      updateData.description = body.description.trim() || null;
    }

    if (body.property_manager_name !== undefined) {
      updateData.property_manager_name =
        body.property_manager_name.trim() || null;
    }

    if (body.property_manager_phone !== undefined) {
      updateData.property_manager_phone =
        body.property_manager_phone.trim() || null;
    }

    if (body.property_manager_email !== undefined) {
      updateData.property_manager_email =
        body.property_manager_email.trim() || null;
    }

    if (body.property_manager_role !== undefined) {
      updateData.property_manager_role =
        body.property_manager_role.trim() || null;
    }

    if (body.staff_id !== undefined && body.staff_id !== "") {
      updateData.staff_id = parseInt(body.staff_id) || null;
    }

    // Handle array fields
    if (body["amenities[]"] !== undefined || body.amenities !== undefined) {
      updateData.amenities = readArray(body, "amenities");
    }

    if (body["services[]"] !== undefined || body.services !== undefined) {
      updateData.services = readArray(body, "services");
    }

    // Handle other fields
    if (body.property_rules !== undefined) {
      updateData.property_rules = body.property_rules || null;
    }

    if (body.is_active !== undefined) {
      updateData.is_active =
        body.is_active === true ||
        body.is_active === "true" ||
        body.is_active === "1";
    }

    if (body.rating !== undefined && body.rating !== "") {
      updateData.rating = parseFloat(body.rating);
    }

    // Handle lock-in period fields
    if (body.lockin_period_months !== undefined) {
      updateData.lockin_period_months = parseInt(body.lockin_period_months) || 0;
    }

    if (body.lockin_penalty_amount !== undefined) {
      updateData.lockin_penalty_amount =
        parseFloat(body.lockin_penalty_amount) || 0;
    }

    if (body.lockin_penalty_type !== undefined) {
      updateData.lockin_penalty_type = body.lockin_penalty_type.trim();
    }

    // Handle notice period fields
    if (body.notice_period_days !== undefined) {
      updateData.notice_period_days =
        parseInt(body.notice_period_days) || 0;
    }

    if (body.notice_penalty_amount !== undefined) {
      updateData.notice_penalty_amount =
        parseFloat(body.notice_penalty_amount) || 0;
    }

    if (body.notice_penalty_type !== undefined) {
      updateData.notice_penalty_type = body.notice_penalty_type.trim();
    }

    // Handle terms and conditions
    if (body.terms_json !== undefined || body.terms_conditions !== undefined) {
      updateData.terms_conditions = termsData.terms_conditions;
      updateData.terms_json = termsData.terms_json;
    }

    if (body.additional_terms !== undefined) {
      updateData.additional_terms =
        body.additional_terms || null;
    }

    // Parse tags from request
    if (body["tags[]"] !== undefined || body.tags !== undefined) {
      updateData.tags = readArray(body, "tags");
      console.log("🏷️ Updated tags:", updateData.tags);
    }

    // Update timestamp
    updateData.updated_at = new Date();
    updateData.floor = body.floor;

    console.log("📊 Update data to save in database:", updateData);

    // Perform database update
    const updated = await PropertyModel.update(id, updateData);

    if (!updated) {
      console.error("❌ Database update failed");
      return res.status(500).json({
        success: false,
        message: "Failed to update property in database",
      });
    }

    console.log("✅ Property updated successfully in database");

    // Fetch updated property to verify
    const updatedProperty = await PropertyModel.findById(id);

    // CRITICAL FIX: Ensure we return the clean photo URLs without duplicates
    if (updatedProperty.photo_urls) {
      // Remove any potential duplicates
      updatedProperty.photo_urls = [...new Set(updatedProperty.photo_urls)];
    }

    // Ensure terms_json is included in response
    if (!updatedProperty.terms_json && updatedProperty.terms_conditions) {
      updatedProperty.terms_json = parseTermsData(
        null,
        updatedProperty.terms_conditions
      ).terms_json;
    }

    console.log("🔄 Updated property from DB:", {
      id: updatedProperty.id,
      name: updatedProperty.name,
      state: updatedProperty.state,
      photo_urls: updatedProperty.photo_urls,
      photo_count: Array.isArray(updatedProperty.photo_urls)
        ? updatedProperty.photo_urls.length
        : 0,
      terms_count: updatedProperty.terms_json?.length || 0
    });

    return res.json({
      success: true,
      message: "Property updated successfully",
      data: updatedProperty,
    });

  } catch (error) {
    console.error("❌ PropertyController.update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update property",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
},


  // DELETE PROPERTY
  async remove(req, res) {
    try {
      const { id } = req.params;

      // Get property first to delete photos
      const property = await PropertyModel.findById(id);
      if (!property) {
        return res
          .status(404)
          .json({ success: false, message: "Property not found" });
      }

      // Delete associated photos
      if (property.photo_urls && property.photo_urls.length > 0) {
        console.log("🗑️  Deleting photos for property:", id);
        deletePhotoFiles(property.photo_urls);
      }

      // Delete property from database
      const removed = await PropertyModel.delete(id);

      if (!removed) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete property from database",
        });
      }

      return res.json({
        success: true,
        message: "Property deleted successfully",
      });
    } catch (error) {
      console.log("code ",error.code)
      if (String(error.code) === "ER_ROW_IS_REFERENCED_2") {
    return res.status(400).json({
      success: false,
      message: "This property cannot be deleted because it is used in other records."
    });
  }
      console.error("PropertyController.remove error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete property",
      });
    }
  },

  // BULK DELETE
  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;

      console.log("📝 Bulk delete request:", { ids });

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ 
            success: false, 
            message: "ids array is required and cannot be empty" 
          });
      }

      // Get all properties to delete their photos
      const properties = await PropertyModel.findById(ids);

      console.log(`📊 Found ${properties.length} properties to delete`);

      // // Delete all photos
      // properties.forEach((property) => {
      //   if (property.photo_urls && property.photo_urls.length > 0) {
      //     console.log(`🗑️  Deleting ${property.photo_urls.length} photos for property ${property.id}`);
      //     deletePhotoFiles(property.photo_urls);
      //   }
      // });

      // Delete properties from database
      const deletedCount = await PropertyModel.bulkDelete(ids);

      console.log(`✅ Successfully deleted ${deletedCount} properties`);

      return res.json({
        success: true,
        message: `${deletedCount} properties deleted successfully`,
        deletedCount: deletedCount
      });
    } catch (error) {
      console.error("PropertyController.bulkDelete error:", error);
      return res.status(500).json({
        success: false,
        message: "Bulk delete failed",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  },

  // BULK STATUS UPDATE
  async bulkStatus(req, res) {
    try {
      const { ids, is_active } = req.body;

      console.log("📝 Bulk status update request:", { ids, is_active });

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ 
            success: false, 
            message: "ids array is required and cannot be empty" 
          });
      }

      if (typeof is_active === 'undefined') {
        return res
          .status(400)
          .json({ 
            success: false, 
            message: "is_active is required" 
          });
      }

      const result = await PropertyModel.bulkUpdateStatus(ids, !!is_active);

      console.log(`✅ Bulk status update result: ${result} properties updated`);

      return res.json({
        success: true,
        message: `${result} properties updated to ${is_active ? 'active' : 'inactive'}`,
        updatedCount: result
      });
    } catch (error) {
      console.error("PropertyController.bulkStatus error:", error);
      return res.status(500).json({
        success: false,
        message: "Bulk update failed",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  },

  // DEBUG ENDPOINT
  async debug(req, res) {
    try {
      const { id } = req.params;
      const property = await PropertyModel.findById(id);

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      // Check database row directly
      const [dbRow] = await require("../config/db").query(
        "SELECT * FROM properties WHERE id = ?",
        [id]
      );

      return res.json({
        success: true,
        data: {
          id: property.id,
          name: property.name,
          state: property.state, // ADDED STATE FOR DEBUGGING
          photo_urls_from_model: property.photo_urls,
          photo_urls_type: typeof property.photo_urls,
          photo_urls_count: Array.isArray(property.photo_urls)
            ? property.photo_urls.length
            : "N/A",
          raw_db_row: dbRow[0],
          raw_photo_urls: dbRow[0]?.photo_urls,
          raw_state: dbRow[0]?.state, // ADDED STATE FOR DEBUGGING
        },
      });
    } catch (error) {
      console.error("Debug error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // propertyController.js में check करें कि bulkUpdateTags function exists है

// If it doesn't exist, add it:
async bulkUpdateTags(req, res) {
  try {
    const { ids, tags, operation = 'add' } = req.body;

    console.log("📝 Bulk tags update request:", { 
      ids, 
      tags, 
      operation,
      timestamp: new Date().toISOString() 
    });

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "ids array is required and cannot be empty" 
      });
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "tags array is required and cannot be empty" 
      });
    }

    // Validate operation
    const validOperations = ['add', 'remove', 'set'];
    if (!validOperations.includes(operation)) {
      return res.status(400).json({ 
        success: false, 
        message: "operation must be one of: add, remove, set" 
      });
    }

    // Use PropertyModel.bulkUpdateTags
    const updatedCount = await PropertyModel.bulkUpdateTags(ids, tags, operation);

    console.log(`✅ Bulk tags update result: ${updatedCount} properties updated`);

    return res.json({
      success: true,
      message: `Tags ${operation === 'add' ? 'added to' : operation === 'remove' ? 'removed from' : 'set for'} ${updatedCount} properties`,
      updatedCount: updatedCount
    });
  } catch (error) {
    console.error("PropertyController.bulkUpdateTags error:", error);
    return res.status(500).json({
      success: false,
      message: "Bulk tags update failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
},

// Get tags info for multiple properties
// propertyController.js में getBulkTagsInfo function

async getBulkTagsInfo(req, res) {
  try {
    const { ids } = req.query;
    
    console.log("🔍 getBulkTagsInfo called with ids:", ids);
    console.log("🔍 Request query parameters:", req.query);
    
    if (!ids) {
      console.log("❌ No IDs provided in query");
      return res.status(400).json({
        success: false,
        message: "Property IDs are required"
      });
    }

    const idArray = ids.split(',').map(id => {
      const parsedId = parseInt(id.trim());
      console.log(`Parsing ID: "${id}" -> ${parsedId}`);
      return parsedId;
    }).filter(id => {
      const isValid = !isNaN(id);
      console.log(`Filtering ID: ${id}, valid: ${isValid}`);
      return isValid;
    });
    
    console.log("✅ Parsed ID array:", idArray);
    
    if (idArray.length === 0) {
      console.log("❌ No valid IDs found");
      return res.status(400).json({
        success: false,
        message: "Valid property IDs are required"
      });
    }

    const placeholders = idArray.map(() => '?').join(',');
    const query = `SELECT id, name, tags FROM properties WHERE id IN (${placeholders})`;
    
    console.log("📝 Executing query:", query);
    console.log("📝 With parameters:", idArray);

    const [properties] = await db.query(query, idArray);

    console.log(`📊 Database query returned ${properties.length} properties`);
    
    // Detailed debug for each property
    properties.forEach((property, index) => {
      console.log(`\n=== Property ${index + 1} ===`);
      console.log(`ID: ${property.id}`);
      console.log(`Name: ${property.name}`);
      console.log(`Raw tags: ${property.tags}`);
      console.log(`Tags type: ${typeof property.tags}`);
      
      if (property.tags) {
        // Try to parse
        try {
          let parsedTags;
          if (typeof property.tags === 'string') {
            if (property.tags.startsWith('[') || property.tags.startsWith('{')) {
              parsedTags = JSON.parse(property.tags);
            } else if (property.tags.includes(',')) {
              parsedTags = property.tags.split(',').map(t => t.trim()).filter(t => t);
            } else if (property.tags.trim() !== '') {
              parsedTags = [property.tags.trim()];
            } else {
              parsedTags = [];
            }
          } else if (Array.isArray(property.tags)) {
            parsedTags = property.tags;
          } else {
            parsedTags = [];
          }
          
          console.log(`Parsed tags:`, parsedTags);
          console.log(`Parsed tags type: ${typeof parsedTags}, length: ${Array.isArray(parsedTags) ? parsedTags.length : 'N/A'}`);
        } catch (error) {
          console.log(`❌ Error parsing tags: ${error.message}`);
        }
      } else {
        console.log(`Tags is null or undefined`);
      }
    });

    // Collect all unique tags from selected properties
    const allTags = new Set();
    
    properties.forEach(property => {
      try {
        if (property.tags) {
          let tags = property.tags;
          
          console.log(`\nProcessing tags for property ${property.id}:`, tags);
          
          // Parse JSON if it's a string
          if (typeof tags === 'string') {
            console.log(`Tags is string, attempting to parse...`);
            try {
              // Try to parse as JSON
              if (tags.trim().startsWith('[') || tags.trim().startsWith('{')) {
                tags = JSON.parse(tags);
                console.log(`✅ Successfully parsed as JSON:`, tags);
              } else if (tags.includes(',')) {
                // Split comma-separated string
                console.log(`Splitting comma-separated string...`);
                tags = tags.split(',').map(t => t.trim()).filter(t => t);
                console.log(`✅ Split result:`, tags);
              } else if (tags.trim() !== '') {
                // Single tag
                console.log(`Single tag found: "${tags}"`);
                tags = [tags.trim()];
              } else {
                console.log(`Empty string, setting to empty array`);
                tags = [];
              }
            } catch (e) {
              console.error(`❌ Error parsing tags string: ${e.message}`);
              tags = [];
            }
          } else {
            console.log(`Tags is not a string, type: ${typeof tags}`);
          }
          
          console.log(`Final tags array for property ${property.id}:`, tags);
          
          if (Array.isArray(tags)) {
            tags.forEach(tag => {
              if (tag && typeof tag === 'string' && tag.trim() !== '') {
                const cleanTag = tag.trim();
                console.log(`Adding tag: "${cleanTag}"`);
                allTags.add(cleanTag);
              }
            });
          } else {
            console.log(`❌ Tags is not an array, skipping`);
          }
        } else {
          console.log(`Property ${property.id} has no tags field`);
        }
      } catch (error) {
        console.error(`❌ Error processing tags for property ${property.id}:`, error);
      }
    });

    const uniqueTags = Array.from(allTags).sort();
    
    console.log("🏷️ Unique tags from properties:", uniqueTags);
    console.log(`🔢 Found ${uniqueTags.length} unique tags across ${properties.length} properties`);

    return res.json({
      success: true,
      tags: uniqueTags,
      propertyCount: properties.length,
      tagCount: uniqueTags.length,
      properties: properties.map(p => ({
        id: p.id,
        name: p.name,
        tags: p.tags,
        parsedTags: (() => {
          try {
            if (typeof p.tags === 'string') {
              if (p.tags.startsWith('[')) {
                return JSON.parse(p.tags);
              } else if (p.tags.includes(',')) {
                return p.tags.split(',').map(t => t.trim()).filter(t => t);
              } else if (p.tags.trim() !== '') {
                return [p.tags.trim()];
              }
            }
            return Array.isArray(p.tags) ? p.tags : [];
          } catch (e) {
            return [];
          }
        })()
      }))
    });

  } catch (error) {
    console.error("❌ getBulkTagsInfo error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tags information",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
},

async import(req, res) {
    try {
      console.log("📥 Import request received");
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      console.log("📁 File received:", req.file.originalname);

      // Read Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`📊 Found ${data.length} rows in Excel`);

      const created = [];
      const errors = [];

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // +2 for header row

        console.log(`🔍 Processing row ${rowNum}:`, row);

        try {
          // Validate required fields
          const propertyName = row['Property Name'] || row['property name'] || row['PROPERTY NAME'];
          if (!propertyName) {
            errors.push(`Row ${rowNum}: Property Name is required`);
            continue;
          }

          const city = row['City'] || row['city'] || row['CITY'];
          if (!city) {
            errors.push(`Row ${rowNum}: City is required`);
            continue;
          }

          const state = row['State'] || row['state'] || row['STATE'];
          if (!state) {
            errors.push(`Row ${rowNum}: State is required`);
            continue;
          }

          const area = row['Area'] || row['area'] || row['AREA'];
          if (!area) {
            errors.push(`Row ${rowNum}: Area is required`);
            continue;
          }

          const startingPrice = row['Starting Price'] || row['starting price'] || row['STARTING PRICE'];
          if (!startingPrice) {
            errors.push(`Row ${rowNum}: Starting Price is required`);
            continue;
          }

          const status = row['Status'] || row['status'] || row['STATUS'] || 'Active';
          const statusLower = status.toString().toLowerCase();
          if (!['active', 'inactive'].includes(statusLower)) {
            errors.push(`Row ${rowNum}: Status must be "Active" or "Inactive" (got "${status}")`);
            continue;
          }

          // Generate slug
          const slug = propertyName.toString()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '');

          // Parse tags
          let tags = [];
          const tagsField = row['Tags'] || row['tags'] || row['TAGS'];
          if (tagsField) {
            tags = tagsField.toString().split(',').map(t => t.trim()).filter(t => t);
          }

          // Prepare data for insertion
          const propertyData = {
            name: propertyName.toString().trim(),
            slug,
            city_id: city.toString().trim(),
            state: state.toString().trim(),
            area: area.toString().trim(),
            address: (row['Address'] || row['address'] || '').toString().trim() || null,
            total_rooms: parseInt(row['Total Rooms'] || row['total rooms'] || 0),
            total_beds: parseInt(row['Total Beds'] || row['total beds'] || 0),
            floor: (row['Floor'] || row['floor'] || '').toString().trim() || null,
            starting_price: parseFloat(startingPrice) || 0,
            security_deposit: parseFloat(row['Security Deposit'] || row['security deposit'] || 0) || 0,
            description: (row['Description'] || row['description'] || '').toString().trim() || null,
            property_manager_name: (row['Property Manager Name'] || row['property manager name'] || '').toString().trim() || null,
            property_manager_phone: (row['Property Manager Phone'] || row['property manager phone'] || '').toString().trim() || null,
            property_manager_email: (row['Property Manager Email'] || row['property manager email'] || '').toString().trim() || null,
            lockin_period_months: parseInt(row['Lock-in Period Months'] || row['lock-in period months'] || 0) || 0,
            lockin_penalty_amount: parseFloat(row['Lock-in Penalty Amount'] || row['lock-in penalty amount'] || 0) || 0,
            lockin_penalty_type: (row['Lock-in Penalty Type'] || row['lock-in penalty type'] || 'fixed').toString().trim(),
            notice_period_days: parseInt(row['Notice Period Days'] || row['notice period days'] || 0) || 0,
            notice_penalty_amount: parseFloat(row['Notice Penalty Amount'] || row['notice penalty amount'] || 0) || 0,
            notice_penalty_type: (row['Notice Penalty Type'] || row['notice penalty type'] || 'fixed').toString().trim(),
            is_active: statusLower === 'active',
            tags,
            amenities: [],
            services: [],
            photo_urls: [],
            property_rules: null,
            additional_terms: null,
            terms_conditions: null,
            terms_json: null
          };

          console.log(`✅ Inserting property:`, propertyData.name);

          // Insert into database
          const [result] = await db.query(
            `INSERT INTO properties 
            (name, slug, city_id, state, area, address, total_rooms, total_beds, floor,
             starting_price, security_deposit, description, property_manager_name,
             property_manager_phone, property_manager_email, lockin_period_months,
             lockin_penalty_amount, lockin_penalty_type, notice_period_days,
             notice_penalty_amount, notice_penalty_type, is_active, tags,
             amenities, services, photo_urls, property_rules, additional_terms,
             terms_conditions, terms_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              propertyData.name,
              propertyData.slug,
              propertyData.city_id,
              propertyData.state,
              propertyData.area,
              propertyData.address,
              propertyData.total_rooms,
              propertyData.total_beds,
              propertyData.floor,
              propertyData.starting_price,
              propertyData.security_deposit,
              propertyData.description,
              propertyData.property_manager_name,
              propertyData.property_manager_phone,
              propertyData.property_manager_email,
              propertyData.lockin_period_months,
              propertyData.lockin_penalty_amount,
              propertyData.lockin_penalty_type,
              propertyData.notice_period_days,
              propertyData.notice_penalty_amount,
              propertyData.notice_penalty_type,
              propertyData.is_active ? 1 : 0,
              JSON.stringify(propertyData.tags),
              JSON.stringify(propertyData.amenities),
              JSON.stringify(propertyData.services),
              JSON.stringify(propertyData.photo_urls),
              propertyData.property_rules,
              propertyData.additional_terms,
              propertyData.terms_conditions,
              propertyData.terms_json
            ]
          );

          created.push({
            id: result.insertId,
            name: propertyData.name
          });

          console.log(`✅ Created property ID: ${result.insertId}`);

        } catch (err) {
          console.error(`❌ Error processing row ${rowNum}:`, err);
          errors.push(`Row ${rowNum}: ${err.message}`);
        }
      }

      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
        console.log("✅ Temporary file deleted");
      } catch (err) {
        console.error("Error deleting temp file:", err);
      }

      console.log(`📊 Import complete: ${created.length} created, ${errors.length} errors`);

      return res.json({
        success: true,
        message: `Successfully imported ${created.length} properties`,
        count: created.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error("❌ Import error:", error);
      
      // Clean up uploaded file if exists
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }

      return res.status(500).json({
        success: false,
        message: "Failed to import properties",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  
async getPropertyOccupancyStats(req, res) {
  try {
    const { propertyId } = req.params;
    
    // Get all rooms for this property
    const [rooms] = await db.query(
      `SELECT id, total_bed, occupied_beds 
       FROM rooms 
       WHERE property_id = ? AND is_active = TRUE`,
      [propertyId]
    );
    
    // Calculate totals
    let totalRooms = rooms.length;
    let totalBeds = 0;
    let occupiedBeds = 0;
    
    rooms.forEach(room => {
      totalBeds += room.total_bed || 0;
      occupiedBeds += room.occupied_beds || 0;
    });
    
    res.json({
      success: true,
      data: {
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds: totalBeds - occupiedBeds,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
      }
    });
  } catch (error) {
    console.error("Error getting property occupancy stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch occupancy stats"
    });
  }
}

};

module.exports = PropertyController;





