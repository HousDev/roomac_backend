const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Helper function to format dates for MySQL
const formatDateForMySQL = (dateString) => {
  if (!dateString || dateString === '') return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string:", dateString);
      return null;
    }
    
    // Format: YYYY-MM-DD HH:MM:SS (MySQL DATETIME format)
    return date.toISOString().slice(0, 19).replace('T', ' ');
  } catch (error) {
    console.error("Error formatting date:", error);
    return null;
  }
};

// Helper function to generate random offer code
const generateOfferCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const codeLength = 8;
  
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
};

const OfferModel = {
  // Get all offers with property and room details
  async findAll() {
    const [rows] = await db.query(
      `SELECT 
        o.*,
        p.name as property_name,
        p.city_id,
        p.area,
        p.photo_urls,
        p.amenities as property_amenities,
        r.room_number,
        r.sharing_type,
        r.rent_per_bed,
        r.total_bed,
        r.occupied_beds,
        r.floor,
        r.has_attached_bathroom,
        r.has_balcony,
        r.has_ac,
        r.amenities as room_amenities,
        r.photo_urls as room_photos,
        r.is_active as room_active,
        r.description as room_description,
        r.room_gender_preference
       FROM offers o
       LEFT JOIN properties p ON o.property_id = p.id
       LEFT JOIN rooms r ON o.room_id = r.id
       ORDER BY o.display_order ASC, o.created_at ASC`
    );
    
    // Parse JSON fields
    return rows.map(row => {
      try {
        if (row.property_amenities && typeof row.property_amenities === 'string') {
          row.property_amenities = JSON.parse(row.property_amenities);
        }
        if (row.room_amenities && typeof row.room_amenities === 'string') {
          row.room_amenities = JSON.parse(row.room_amenities);
        }
        if (row.photo_urls && typeof row.photo_urls === 'string') {
          row.photo_urls = JSON.parse(row.photo_urls);
        }
        if (row.room_photos && typeof row.room_photos === 'string') {
          row.room_photos = JSON.parse(row.room_photos);
        }
      } catch (e) {
        console.error("Error parsing JSON fields:", e);
      }
      return row;
    });
  },

// Get offers with pagination
async findAllWithPagination(page = 1, limit = 10, filters = {}) {
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      o.*,
      p.name as property_name,
      p.city_id,
      p.area,
      p.photo_urls,
      p.amenities as property_amenities,
      r.room_number,
      r.sharing_type,
      r.rent_per_bed,
      r.total_bed,
      r.occupied_beds,
      r.floor,
      r.has_attached_bathroom,
      r.has_balcony,
      r.has_ac,
      r.amenities as room_amenities,
      r.photo_urls as room_photos,
      r.is_active as room_active,
      r.description as room_description,
      r.room_gender_preference
    FROM offers o
    LEFT JOIN properties p ON o.property_id = p.id
    LEFT JOIN rooms r ON o.room_id = r.id
  `;
  
  const whereClauses = [];
  const params = [];
  
  // Apply filters if provided
  if (filters.search) {
    whereClauses.push(`
      (o.code LIKE ? OR o.title LIKE ? OR o.description LIKE ? 
       OR p.name LIKE ? OR r.room_number LIKE ?)
    `);
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  if (filters.offer_type && filters.offer_type !== 'all') {
    whereClauses.push(`o.offer_type = ?`);
    params.push(filters.offer_type);
  }
  
  if (filters.property_id && filters.property_id !== 'all') {
    if (filters.property_id === 'general') {
      whereClauses.push(`o.property_id IS NULL`);
    } else {
      whereClauses.push(`o.property_id = ?`);
      params.push(filters.property_id);
    }
  }
  
  if (filters.is_active !== undefined) {
    whereClauses.push(`o.is_active = ?`);
    params.push(filters.is_active);
  }
  
  // Add WHERE clause if there are filters
  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }
  
  // ORDER BY: Latest first, then display_order
  query += ` ORDER BY o.created_at DESC, o.display_order ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const [rows] = await db.query(query, params);
  
  // Parse JSON fields
  const parsedRows = rows.map(row => {
    try {
      if (row.property_amenities && typeof row.property_amenities === 'string') {
        row.property_amenities = JSON.parse(row.property_amenities);
      }
      if (row.room_amenities && typeof row.room_amenities === 'string') {
        row.room_amenities = JSON.parse(row.room_amenities);
      }
      if (row.photo_urls && typeof row.photo_urls === 'string') {
        row.photo_urls = JSON.parse(row.photo_urls);
      }
      if (row.room_photos && typeof row.room_photos === 'string') {
        row.room_photos = JSON.parse(row.room_photos);
      }
    } catch (e) {
      console.error("Error parsing JSON fields:", e);
    }
    return row;
  });
  
  return parsedRows;
},

// Get total count for pagination
async getTotalCount(filters = {}) {
  let query = `
    SELECT COUNT(*) as total 
    FROM offers o
    LEFT JOIN properties p ON o.property_id = p.id
    LEFT JOIN rooms r ON o.room_id = r.id
  `;
  
  const whereClauses = [];
  const params = [];
  
  // Apply filters if provided
  if (filters.search) {
    whereClauses.push(`
      (o.code LIKE ? OR o.title LIKE ? OR o.description LIKE ? 
       OR p.name LIKE ? OR r.room_number LIKE ?)
    `);
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  if (filters.offer_type && filters.offer_type !== 'all') {
    whereClauses.push(`o.offer_type = ?`);
    params.push(filters.offer_type);
  }
  
  if (filters.property_id && filters.property_id !== 'all') {
    if (filters.property_id === 'general') {
      whereClauses.push(`o.property_id IS NULL`);
    } else {
      whereClauses.push(`o.property_id = ?`);
      params.push(filters.property_id);
    }
  }
  
  if (filters.is_active !== undefined) {
    whereClauses.push(`o.is_active = ?`);
    params.push(filters.is_active);
  }
  
  // Add WHERE clause if there are filters
  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }
  
  const [[result]] = await db.query(query, params);
  return result.total;
},

  // Get offer by id with property and room details
  async findById(id) {
    const [rows] = await db.query(
      `SELECT 
        o.*,
        p.name as property_name,
        p.city_id,
        p.area,
        p.address,
        p.photo_urls,
        p.amenities as property_amenities,
        p.starting_price,
        p.security_deposit,
        p.description as property_description,
        r.room_number,
        r.sharing_type,
        r.rent_per_bed,
        r.total_bed,
        r.occupied_beds,
        r.floor,
        r.has_attached_bathroom,
        r.has_balcony,
        r.has_ac,
        r.amenities as room_amenities,
        r.photo_urls as room_photos,
        r.is_active as room_active,
        r.description as room_description,
        r.room_gender_preference,
        r.room_type
       FROM offers o
       LEFT JOIN properties p ON o.property_id = p.id
       LEFT JOIN rooms r ON o.room_id = r.id
       WHERE o.id = ?`,
      [id]
    );
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    
    // Parse JSON fields
    try {
      if (row.property_amenities && typeof row.property_amenities === 'string') {
        row.property_amenities = JSON.parse(row.property_amenities);
      }
      if (row.room_amenities && typeof row.room_amenities === 'string') {
        row.room_amenities = JSON.parse(row.room_amenities);
      }
      if (row.photo_urls && typeof row.photo_urls === 'string') {
        row.photo_urls = JSON.parse(row.photo_urls);
      }
      if (row.room_photos && typeof row.room_photos === 'string') {
        row.room_photos = JSON.parse(row.room_photos);
      }
    } catch (e) {
      console.error("Error parsing JSON fields:", e);
    }
    
    return row;
  },

  // Check if offer code exists
// In offerModel.js
async checkCodeExists(code, excludeId = null) {
  if (!code) return false;
  
  try {
    let query = "SELECT id FROM offers WHERE UPPER(code) = UPPER(?)";
    const params = [code];
    
    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }
    
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  } catch (error) {
    console.error("Error checking code existence:", error);
    return false;
  }
},

  // Generate unique offer code
async generateUniqueCode() {
  let code;
  let attempts = 0;
  const maxAttempts = 50; // Increased from 10 to 50
  
  do {
    code = generateOfferCode();
    attempts++;
    
    if (attempts >= maxAttempts) {
      // Fallback: append timestamp with shorter code
      const timestamp = Date.now().toString().slice(-6);
      code = 'OFF' + timestamp;
      break;
    }
  } while (await this.checkCodeExists(code));
  
  return code;
},

  // Create new offer
  async create(data) {
    const id = uuidv4();
    const now = formatDateForMySQL(new Date().toISOString());
    const startDate = formatDateForMySQL(data.start_date);
    const endDate = formatDateForMySQL(data.end_date);
    const bonusValidUntil = formatDateForMySQL(data.bonus_valid_until);

    // Generate unique code if not provided
    let code = data.code;
    if (!code || code.trim() === '') {
      code = await this.generateUniqueCode();
    }

    await db.query(
      `INSERT INTO offers (
        id, code, title, description, offer_type,
        discount_type, discount_value, discount_percent,
        min_months, start_date, end_date,
        terms_and_conditions, is_active, display_order,
        bonus_title, bonus_description, bonus_valid_until, bonus_conditions,
        property_id, room_id,
        created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        code.toUpperCase(),
        data.title,
        data.description,
        data.offer_type,
        data.discount_type,
        data.discount_value,
        data.discount_percent,
        data.min_months,
        startDate,
        endDate,
        data.terms_and_conditions,
        data.is_active,
        data.display_order,
        data.bonus_title,
        data.bonus_description,
        bonusValidUntil,
        data.bonus_conditions,
        data.property_id || null,
        data.room_id || null,
        now,
        now,
      ]
    );
    return { id, code };
  },

  // Update offer (full update)
  async update(id, data) {
    const updatedAt = formatDateForMySQL(data.updated_at) || 
                     formatDateForMySQL(new Date().toISOString());
    const startDate = formatDateForMySQL(data.start_date);
    const endDate = formatDateForMySQL(data.end_date);
    const bonusValidUntil = formatDateForMySQL(data.bonus_valid_until);

    await db.query(
      `UPDATE offers SET
        code = COALESCE(?, code),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        offer_type = COALESCE(?, offer_type),
        discount_type = COALESCE(?, discount_type),
        discount_value = COALESCE(?, discount_value),
        discount_percent = COALESCE(?, discount_percent),
        min_months = COALESCE(?, min_months),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        terms_and_conditions = COALESCE(?, terms_and_conditions),
        is_active = COALESCE(?, is_active),
        display_order = COALESCE(?, display_order),
        bonus_title = COALESCE(?, bonus_title),
        bonus_description = COALESCE(?, bonus_description),
        bonus_valid_until = COALESCE(?, bonus_valid_until),
        bonus_conditions = COALESCE(?, bonus_conditions),
        property_id = COALESCE(?, property_id),
        room_id = COALESCE(?, room_id),
        updated_at = ?
      WHERE id = ?`,
      [
        data.code ? data.code.toUpperCase() : null,
        data.title || null,
        data.description || null,
        data.offer_type || null,
        data.discount_type || null,
        data.discount_value || null,
        data.discount_percent || null,
        data.min_months || null,
        startDate,
        endDate,
        data.terms_and_conditions || null,
        data.is_active,
        data.display_order || null,
        data.bonus_title || null,
        data.bonus_description || null,
        bonusValidUntil,
        data.bonus_conditions || null,
        data.property_id || null,
        data.room_id || null,
        updatedAt,
        id,
      ]
    );
  },

  // Update only is_active field
  async updateOnlyActive(id, isActive) {
    const updatedAt = formatDateForMySQL(new Date().toISOString());
    
    await db.query(
      `UPDATE offers SET
        is_active = ?,
        updated_at = ?
      WHERE id = ?`,
      [isActive, updatedAt, id]
    );
  },

  // Get rooms by property id
  async getRoomsByPropertyId(propertyId) {
    const [rows] = await db.query(
      `SELECT 
        id, 
        room_number, 
        sharing_type, 
        rent_per_bed, 
        total_bed,
        occupied_beds,
        floor,
        has_attached_bathroom,
        has_balcony,
        has_ac,
        amenities,
        room_type,
        is_active 
      FROM rooms WHERE property_id = ? AND is_active = 1`,
      [propertyId]
    );
    
    // Parse amenities if they're stored as JSON string
    return rows.map(room => ({
      ...room,
      amenities: room.amenities ? (typeof room.amenities === 'string' ? JSON.parse(room.amenities) : room.amenities) : []
    }));
  },

  // Delete offer
  async delete(id) {
    await db.query("DELETE FROM offers WHERE id = ?", [id]);
  },


};

module.exports = OfferModel;