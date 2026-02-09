const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AddOnModel {
  // Create new add-on
  static async create(data, createdBy) {
    const uuid = uuidv4();
    const query = `
      INSERT INTO add_ons 
      (uuid, name, description, price, billing_type, category, icon, 
       is_popular, is_featured, is_active, sort_order, max_per_tenant, 
       requires_approval, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      uuid,
      data.name,
      data.description || null,
      data.price,
      data.billing_type || 'monthly',
      data.category || 'lifestyle',
      data.icon || 'package',
      data.is_popular || false,
      data.is_featured || false,
      data.is_active !== undefined ? data.is_active : true,
      data.sort_order || 0,
      data.max_per_tenant || 1,
      data.requires_approval || false,
      createdBy
    ];
    
    const [result] = await db.query(query, values);
    return this.findById(result.insertId);
  }

  // Get all add-ons with filters
  static async findAll(filters = {}) {
    let query = `
      SELECT a.*, 
        u.name as created_by_name,
        COUNT(ta.id) as total_subscribers
      FROM add_ons a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN tenant_add_ons ta ON a.id = ta.add_on_id AND ta.status = 'active'
      WHERE a.deleted_at IS NULL
    `;
    
    const values = [];
    let conditions = [];
    
    // Apply filters
    if (filters.category) {
      conditions.push('a.category = ?');
      values.push(filters.category);
    }
    
    if (filters.billing_type) {
      conditions.push('a.billing_type = ?');
      values.push(filters.billing_type);
    }
    
    if (filters.is_active !== undefined) {
      conditions.push('a.is_active = ?');
      values.push(filters.is_active);
    }
    
    if (filters.is_popular !== undefined) {
      conditions.push('a.is_popular = ?');
      values.push(filters.is_popular);
    }
    
    if (filters.is_featured !== undefined) {
      conditions.push('a.is_featured = ?');
      values.push(filters.is_featured);
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY a.id';
    
    // Sorting
    const orderBy = filters.order_by || 'sort_order';
    const orderDir = filters.order_dir === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${orderBy} ${orderDir}, a.created_at DESC`;
    
    const [rows] = await db.query(query, values);
    return rows;
  }

  // Get add-on by ID
  static async findById(id) {
    const query = `
      SELECT a.*, u.name as created_by_name
      FROM add_ons a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ? AND a.deleted_at IS NULL
    `;
    
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Get add-on by UUID
  static async findByUuid(uuid) {
    const query = `
      SELECT a.*, u.name as created_by_name
      FROM add_ons a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.uuid = ? AND a.deleted_at IS NULL
    `;
    
    const [rows] = await db.query(query, [uuid]);
    return rows[0];
  }

  // Update add-on
  static async update(id, data) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'name', 'description', 'price', 'billing_type', 'category', 'icon',
      'is_popular', 'is_featured', 'is_active', 'sort_order', 
      'max_per_tenant', 'requires_approval'
    ];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    });
    
    if (fields.length === 0) {
      return this.findById(id);
    }
    
    values.push(id);
    
    const query = `
      UPDATE add_ons 
      SET ${fields.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `;
    
    await db.query(query, values);
    return this.findById(id);
  }

  // Soft delete add-on
  static async delete(id) {
    const query = `
      UPDATE add_ons 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;
    
    await db.query(query, [id]);
    return true;
  }

  // Toggle add-on status
  static async toggleStatus(id) {
    const query = `
      UPDATE add_ons 
      SET is_active = NOT is_active 
      WHERE id = ? AND deleted_at IS NULL
    `;
    
    await db.query(query, [id]);
    return this.findById(id);
  }

  // Get add-ons by tenant
  static async getByTenant(tenantId) {
    const query = `
      SELECT a.*, ta.id as subscription_id, ta.quantity, ta.start_date, ta.end_date, ta.status
      FROM tenant_add_ons ta
      JOIN add_ons a ON ta.add_on_id = a.id
      WHERE ta.tenant_id = ? 
        AND ta.status = 'active' 
        AND a.is_active = true
        AND a.deleted_at IS NULL
      ORDER BY a.sort_order, a.name
    `;
    
    const [rows] = await db.query(query, [tenantId]);
    return rows;
  }

  // Get statistics
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_popular = true THEN 1 ELSE 0 END) as popular,
        SUM(CASE WHEN is_featured = true THEN 1 ELSE 0 END) as featured,
        (SELECT COUNT(DISTINCT tenant_id) FROM tenant_add_ons WHERE status = 'active') as total_subscribers,
        (SELECT SUM(a.price * ta.quantity) 
         FROM tenant_add_ons ta 
         JOIN add_ons a ON ta.add_on_id = a.id 
         WHERE ta.status = 'active' 
           AND a.billing_type = 'monthly') as monthly_revenue
      FROM add_ons 
      WHERE deleted_at IS NULL
    `;
    
    const [rows] = await db.query(query);
    return rows[0];
  }
}

module.exports = AddOnModel;