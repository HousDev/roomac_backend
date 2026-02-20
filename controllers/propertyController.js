// controllers/propertyController.js 
const PropertyModel = require("../models/propertyModel");
const db = require("../config/db");
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
  // async create(req, res) {
  //   try {
  //     console.log("📥 CREATE Property Request:");
  //     console.log("Body:", req.body);
  //     console.log("Files:", req.files?.length || 0);

  //     const body = req.body || {};

  //     // VALIDATION - UPDATED TO INCLUDE STATE FIELD
  //     if (!body.name || body.name.trim() === "") {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Property name is required",
  //       });
  //     }

  //     if (!body.city_id || body.city_id.trim() === "") {
  //       return res.status(400).json({
  //         success: false,
  //         message: "City is required",
  //       });
  //     }

  //     // ADD STATE VALIDATION
  //     if (!body.state || body.state.trim() === "") {
  //       return res.status(400).json({
  //         success: false,
  //         message: "State is required",
  //       });
  //     }

  //     if (!body.area || body.area.trim() === "") {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Area is required",
  //       });
  //     }

  //     // Build photo URLs from uploaded files
  //     const photo_urls =
  //       req.files && req.files.length > 0
  //         ? req.files.map((f) => `/uploads/properties/${f.filename}`)
  //         : [];

  //     console.log("📸 Photo URLs to save:", photo_urls);

  //     // Generate slug
  //     const slug = body.name
  //       .toLowerCase()
  //       .replace(/\s+/g, "-")
  //       .replace(/[^a-z0-9\-]/g, "");

  //     // Parse arrays from FormData
  //     const amenities = readArray(body, "amenities");
  //     const services = readArray(body, "services");
  //     // Parse tags from request
  //   const tags = readArray(body, "tags");
  //   console.log("🏷️ Parsed tags:", tags);


  //     // Parse terms data
  //     const termsData = parseTermsData(body.terms_json, body.terms_conditions);
      
  //     console.log("📝 Parsed terms data:", {
  //       termsCount: termsData.terms_json?.length || 0,
  //       hasTermsText: !!termsData.terms_conditions
  //     });

  //     // Create property with all fields - INCLUDING STATE
  //     const newId = await PropertyModel.create({
  //       name: body.name.trim(),
  //       slug,
  //       city_id: body.city_id.trim(),
  //       state: body.state.trim(), // ADDED STATE FIELD
  //       area: body.area.trim(),
  //       address: body.address?.trim() || null,
  //       total_rooms: parseInt(body.total_rooms || 0),
  //       total_beds: parseInt(body.total_beds || 0),
  //       occupied_beds: parseInt(body.occupied_beds || 0),
  //       starting_price: parseFloat(body.starting_price || 0),
  //       security_deposit: parseFloat(body.security_deposit || 0),
  //       description: body.description?.trim() || null,
  //       property_manager_name: body.property_manager_name?.trim() || null,
  //       property_manager_phone: body.property_manager_phone?.trim() || null,
  //       amenities: amenities,
  //       services: services,
  //       photo_urls: photo_urls,
  //       property_rules: body.property_rules?.trim() || null,
  //       is_active:
  //         body.is_active !== undefined
  //           ? body.is_active === true ||
  //             body.is_active === "true" ||
  //             body.is_active === "1"
  //           : true,
  //       rating: body.rating ? parseFloat(body.rating) : null,
        
  //       // Lock-in period fields
  //       lockin_period_months: parseInt(body.lockin_period_months || 0),
  //       lockin_penalty_amount: parseFloat(body.lockin_penalty_amount || 0),
  //       lockin_penalty_type: body.lockin_penalty_type || 'fixed',
        
  //       // Notice period fields
  //       notice_period_days: parseInt(body.notice_period_days || 0),
  //       notice_penalty_amount: parseFloat(body.notice_penalty_amount || 0),
  //       notice_penalty_type: body.notice_penalty_type || 'fixed',
        
  //       // Terms and conditions
  //       terms_conditions: termsData.terms_conditions,
  //       terms_json: termsData.terms_json,
  //       additional_terms: body.additional_terms?.trim() || null,
  //        tags: tags, 
  //     });

  //     console.log("✅ Property created with ID:", newId);

  //     return res.status(201).json({
  //       success: true,
  //       message: "Property created successfully",
  //       id: newId,
  //     });
  //   } catch (error) {
  //     console.error("PropertyController.create error:", error);
  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to create property",
  //       error:
  //         process.env.NODE_ENV === "development" ? error.message : undefined,
  //     });
  //   }
  // },


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

      total_rooms: parseInt(body.total_rooms || 0),
      total_beds: parseInt(body.total_beds || 0),
      floor: parseInt(body.floor || 0),

      starting_price: parseFloat(body.starting_price || 0),
      security_deposit: parseFloat(body.security_deposit || 0),

      description: body.description?.trim() || null,

      property_manager_name:
        body.property_manager_name?.trim() || null,
      property_manager_phone:
        body.property_manager_phone?.trim() || null,
        property_manager_email: body.property_manager_email?.trim() || null,  // ← ADD
property_manager_role: body.property_manager_role?.trim() || null,    // ← ADD
staff_id: body.staff_id ? parseInt(body.staff_id) || null : null,     // ← ADD

      amenities,
      services,
      photo_urls,

      property_rules: body.property_rules?.trim() || null,

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

      lockin_period_months: parseInt(
        body.lockin_period_months || 0
      ),
      lockin_penalty_amount: parseFloat(
        body.lockin_penalty_amount || 0
      ),
      lockin_penalty_type:
        body.lockin_penalty_type || "fixed",

      // =====================
      // NOTICE PERIOD
      // =====================

      notice_period_days: parseInt(
        body.notice_period_days || 0
      ),
      notice_penalty_amount: parseFloat(
        body.notice_penalty_amount || 0
      ),
      notice_penalty_type:
        body.notice_penalty_type || "fixed",

      // =====================
      // TERMS
      // =====================

      terms_conditions: termsData.terms_conditions,
      terms_json: termsData.terms_json,
      additional_terms:
        body.additional_terms?.trim() || null,

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
//   async update(req, res) {
//     try {
//       const { id } = req.params;
//       const body = req.body || {};

//       console.log("📥 UPDATE Property Request for ID:", id);
//       console.log("Request Body:", JSON.stringify(body, null, 2));
//       console.log("Uploaded Files:", req.files?.length || 0);

//       // Check if property exists
//       const existing = await PropertyModel.findById(id);
//       if (!existing) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Property not found" });
//       }

//       console.log("📸 Existing photos from DB:", existing.photo_urls);

//       // Read removed photos from request
//       const removedPhotos = readArray(body, "removed_photos");
//       console.log("🗑️  Removed photos from request:", removedPhotos);

//       // Delete removed photos from filesystem
//       if (removedPhotos.length > 0) {
//         console.log("🔄 Deleting photos from filesystem...");
//         deletePhotoFiles(removedPhotos);
//       }

//       // Get existing photos from database
//       const existingPhotoUrls = Array.isArray(existing.photo_urls)
//         ? existing.photo_urls
//         : [];

//       // Filter out removed photos from existing
//       const filteredExistingPhotoUrls = existingPhotoUrls.filter(
//         (photo) => !removedPhotos.includes(photo)
//       );

//       console.log(
//         "✅ Existing photos after removal:",
//         filteredExistingPhotoUrls
//       );

//       // Add new uploaded photos
//       const newPhotoUrls =
//         req.files && req.files.length > 0
//           ? req.files.map((f) => `/uploads/properties/${f.filename}`)
//           : [];

//       console.log("🆕 New uploaded photos:", newPhotoUrls);

//       // Combine existing (filtered) and new photos
//       const finalPhotoUrls = [...filteredExistingPhotoUrls, ...newPhotoUrls];

//       console.log("🖼️  Final photo URLs for database:", finalPhotoUrls);

//       // Parse terms data
//       const termsData = parseTermsData(body.terms_json, body.terms_conditions);
//       console.log("📝 Updated terms data:", {
//         termsCount: termsData.terms_json?.length || 0,
//         hasTermsText: !!termsData.terms_conditions
//       });

//       // Prepare update data
//       const updateData = {
//         photo_urls: finalPhotoUrls,
//       };

//       // Update other fields if provided
//       if (body.name !== undefined && body.name.trim() !== "") {
//         updateData.name = body.name.trim();
//         updateData.slug = body.name
//           .trim()
//           .toLowerCase()
//           .replace(/\s+/g, "-")
//           .replace(/[^a-z0-9\-]/g, "");
//       }

//       if (body.city_id !== undefined && body.city_id.trim() !== "") {
//         updateData.city_id = body.city_id.trim();
//       }

//       // ADD STATE FIELD UPDATE
//       if (body.state !== undefined && body.state.trim() !== "") {
//         updateData.state = body.state.trim();
//           console.log("🏷️ Updated state:", updateData.state); // Add logging
//       }

//       if (body.area !== undefined && body.area.trim() !== "") {
//         updateData.area = body.area.trim();
//       }

//       if (body.address !== undefined) {
//         updateData.address = body.address.trim() || null;
//       }

//       console.log("🏷️ State value received:", body.state);
// console.log("🏷️ State will be updated to:", updateData.state);

//       // Handle numeric fields
//       const numericFields = [
//         "total_rooms",
//         "total_beds",
//         "occupied_beds",
//         "starting_price",
//         "security_deposit",
//       ];

//       numericFields.forEach((field) => {
//         if (body[field] !== undefined) {
//           updateData[field] = parseFloat(body[field]) || 0;
//         }
//       });

//       // Handle text fields
//       if (body.description !== undefined) {
//         updateData.description = body.description.trim() || null;
//       }

//       if (body.property_manager_name !== undefined) {
//         updateData.property_manager_name =
//           body.property_manager_name.trim() || null;
//       }

//       if (body.property_manager_phone !== undefined) {
//         updateData.property_manager_phone =
//           body.property_manager_phone.trim() || null;
//       }

//       // Handle array fields
//       if (body["amenities[]"] !== undefined || body.amenities !== undefined) {
//         updateData.amenities = readArray(body, "amenities");
//       }

//       if (body["services[]"] !== undefined || body.services !== undefined) {
//         updateData.services = readArray(body, "services");
//       }

//       // Handle other fields
//       if (body.property_rules !== undefined) {
//         updateData.property_rules = body.property_rules.trim() || null;
//       }

//       if (body.is_active !== undefined) {
//         updateData.is_active =
//           body.is_active === true ||
//           body.is_active === "true" ||
//           body.is_active === "1";
//       }

//       if (body.rating !== undefined && body.rating !== "") {
//         updateData.rating = parseFloat(body.rating);
//       }

//       // Handle lock-in period fields
//       if (body.lockin_period_months !== undefined) {
//         updateData.lockin_period_months = parseInt(body.lockin_period_months) || 0;
//       }
      
//       if (body.lockin_penalty_amount !== undefined) {
//         updateData.lockin_penalty_amount = parseFloat(body.lockin_penalty_amount) || 0;
//       }
      
//       if (body.lockin_penalty_type !== undefined) {
//         updateData.lockin_penalty_type = body.lockin_penalty_type.trim();
//       }

//       // Handle notice period fields
//       if (body.notice_period_days !== undefined) {
//         updateData.notice_period_days = parseInt(body.notice_period_days) || 0;
//       }
      
//       if (body.notice_penalty_amount !== undefined) {
//         updateData.notice_penalty_amount = parseFloat(body.notice_penalty_amount) || 0;
//       }
      
//       if (body.notice_penalty_type !== undefined) {
//         updateData.notice_penalty_type = body.notice_penalty_type.trim();
//       }

//       // Handle terms and conditions
//       if (body.terms_json !== undefined || body.terms_conditions !== undefined) {
//         updateData.terms_conditions = termsData.terms_conditions;
//         updateData.terms_json = termsData.terms_json;
//       }
      
//       if (body.additional_terms !== undefined) {
//         updateData.additional_terms = body.additional_terms.trim() || null;
//       }

//        // Parse tags from request
//     if (body["tags[]"] !== undefined || body.tags !== undefined) {
//       updateData.tags = readArray(body, "tags");
//       console.log("🏷️ Updated tags:", updateData.tags);
//     }

//       // Update timestamp
//       updateData.updated_at = new Date();

//       console.log("📊 Update data to save in database:", updateData);

//       // Perform database update
//       const updated = await PropertyModel.update(id, updateData);

//       if (!updated) {
//         console.error("❌ Database update failed");
//         return res.status(500).json({
//           success: false,
//           message: "Failed to update property in database",
//         });
//       }

//       console.log("✅ Property updated successfully in database");

//       // Fetch updated property to verify
//       const updatedProperty = await PropertyModel.findById(id);
      
//       // Ensure terms_json is included in response
//       if (!updatedProperty.terms_json && updatedProperty.terms_conditions) {
//         updatedProperty.terms_json = parseTermsData(null, updatedProperty.terms_conditions).terms_json;
//       }

//       console.log("🔄 Updated property from DB:", {
//         id: updatedProperty.id,
//         name: updatedProperty.name,
//         state: updatedProperty.state, // ADDED FOR DEBUGGING
//         photo_urls: updatedProperty.photo_urls,
//         photo_count: Array.isArray(updatedProperty.photo_urls)
//           ? updatedProperty.photo_urls.length
//           : 0,
//         terms_count: updatedProperty.terms_json?.length || 0
//       });

//       return res.json({
//         success: true,
//         message: "Property updated successfully",
//         data: updatedProperty,
//       });
//     } catch (error) {
//       console.error("❌ PropertyController.update error:", error);
//       return res.status(500).json({
//         success: false,
//         message: "Failed to update property",
//         error:
//           process.env.NODE_ENV === "development" ? error.message : undefined,
//       });
//     }
//   },

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

    // Read removed photos from request
    const removedPhotos = readArray(body, "removed_photos");
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

    console.log("🏷️ State value received:", body.state);
    console.log("🏷️ State will be updated to:", updateData.state);

    // Handle numeric fields
    const numericFields = [
      "total_rooms",
      "total_beds",
      "floor",
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

// FIND THIS:
if (body.property_manager_phone !== undefined) {
  updateData.property_manager_phone =
    body.property_manager_phone.trim() || null;
}

// ← ADD THESE 3 BLOCKS RIGHT HERE:
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
      updateData.property_rules = body.property_rules.trim() || null;
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
        body.additional_terms.trim() || null;
    }

    // Parse tags from request
    if (body["tags[]"] !== undefined || body.tags !== undefined) {
      updateData.tags = readArray(body, "tags");
      console.log("🏷️ Updated tags:", updateData.tags);
    }

    // Update timestamp
    updateData.updated_at = new Date();

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
}
};

module.exports = PropertyController;





