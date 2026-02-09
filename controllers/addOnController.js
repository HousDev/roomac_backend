const db = require('../config/db');

class AddOnController {
  // Get all add-ons
async getAll(req, res) {
  try {
    console.log('GET /add-ons called with query:', req.query);
    
    const {
      category,
      billing_type,
      is_active,
      is_popular,
      is_featured,
      order_by = 'sort_order',
      order_dir = 'asc'
    } = req.query;
    
    let query = 'SELECT * FROM add_ons WHERE deleted_at IS NULL';
    const values = [];
    
    if (category) {
      query += ' AND category = ?';
      values.push(category);
    }
    
    if (billing_type) {
      query += ' AND billing_type = ?';
      values.push(billing_type);
    }
    
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      values.push(is_active === 'true');
    }
    
    if (is_popular !== undefined) {
      query += ' AND is_popular = ?';
      values.push(is_popular === 'true');
    }
    
    if (is_featured !== undefined) {
      query += ' AND is_featured = ?';
      values.push(is_featured === 'true');
    }
    
    // Validate order_by to prevent SQL injection
    const allowedOrderBy = ['name', 'price', 'sort_order', 'created_at', 'category'];
    const safeOrderBy = allowedOrderBy.includes(order_by) ? order_by : 'sort_order';
    const safeOrderDir = order_dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY ${safeOrderBy} ${safeOrderDir}`;
    
    console.log('Executing query:', query, 'with values:', values);
    
    const [rows] = await db.query(query, values);
    
    console.log(`Found ${rows.length} add-ons`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching add-ons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch add-ons',
      error: error.message
    });
  }
}

  // Get single add-on
  async getOne(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await db.query(
        'SELECT * FROM add_ons WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Add-on not found'
        });
      }
      
      res.json({
        success: true,
        data: rows[0]
      });
    } catch (error) {
      console.error('Error fetching add-on:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch add-on'
      });
    }
  }

  // Create add-on
  async create(req, res) {
    try {
      const {
        name,
        description = '',
        price,
        billing_type = 'monthly',
        category = 'lifestyle',
        icon = 'package',
        is_popular = false,
        is_featured = false,
        is_active = true,
        sort_order = 0,
        max_per_tenant = 1
      } = req.body;
      
      // Validation
      if (!name || !price) {
        return res.status(400).json({
          success: false,
          message: 'Name and price are required'
        });
      }
      
      const query = `
        INSERT INTO add_ons 
        (name, description, price, billing_type, category, icon, 
         is_popular, is_featured, is_active, sort_order, max_per_tenant)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        name,
        description,
        price,
        billing_type,
        category,
        icon,
        is_popular,
        is_featured,
        is_active,
        sort_order,
        max_per_tenant
      ];
      
      const [result] = await db.query(query, values);
      
      // Get the created add-on
      const [rows] = await db.query(
        'SELECT * FROM add_ons WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json({
        success: true,
        message: 'Add-on created successfully',
        data: rows[0]
      });
    } catch (error) {
      console.error('Error creating add-on:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create add-on'
      });
    }
  }

  // Update add-on
  async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // Check if add-on exists
      const [existing] = await db.query(
        'SELECT * FROM add_ons WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Add-on not found'
        });
      }
      
      // Build update query dynamically
      const fields = [];
      const values = [];
      
      const allowedFields = [
        'name', 'description', 'price', 'billing_type', 'category', 'icon',
        'is_popular', 'is_featured', 'is_active', 'sort_order', 'max_per_tenant'
      ];
      
      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(data[field]);
        }
      });
      
      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }
      
      values.push(id);
      
      const query = `UPDATE add_ons SET ${fields.join(', ')} WHERE id = ?`;
      
      await db.query(query, values);
      
      // Get updated add-on
      const [updated] = await db.query(
        'SELECT * FROM add_ons WHERE id = ?',
        [id]
      );
      
      res.json({
        success: true,
        message: 'Add-on updated successfully',
        data: updated[0]
      });
    } catch (error) {
      console.error('Error updating add-on:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update add-on'
      });
    }
  }

  // Delete add-on
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      const [existing] = await db.query(
        'SELECT * FROM add_ons WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Add-on not found'
        });
      }
      
      // Soft delete
      await db.query(
        'UPDATE add_ons SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      res.json({
        success: true,
        message: 'Add-on deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting add-on:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete add-on'
      });
    }
  }

  // Toggle add-on status
  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      
      const [existing] = await db.query(
        'SELECT * FROM add_ons WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Add-on not found'
        });
      }
      
      const currentStatus = existing[0].is_active;
      
      await db.query(
        'UPDATE add_ons SET is_active = ? WHERE id = ?',
        [!currentStatus, id]
      );
      
      const [updated] = await db.query(
        'SELECT * FROM add_ons WHERE id = ?',
        [id]
      );
      
      res.json({
        success: true,
        message: `Add-on ${!currentStatus ? 'activated' : 'deactivated'}`,
        data: updated[0]
      });
    } catch (error) {
      console.error('Error toggling add-on status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update add-on status'
      });
    }
  }

  // Get statistics
  async getStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_popular = true THEN 1 ELSE 0 END) as popular,
          SUM(CASE WHEN is_featured = true THEN 1 ELSE 0 END) as featured,
          0 as total_subscribers, -- Will implement later
          0 as monthly_revenue -- Will implement later
        FROM add_ons 
        WHERE deleted_at IS NULL
      `;
      
      const [rows] = await db.query(statsQuery);
      
      res.json({
        success: true,
        data: rows[0]
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  }

  // Get categories
  async getCategories(req, res) {
    try {
      const categories = [
        { value: 'lifestyle', label: 'Lifestyle', icon: 'sparkles', color: 'purple' },
        { value: 'meal', label: 'Meal Plans', icon: 'coffee', color: 'orange' },
        { value: 'utility', label: 'Utilities', icon: 'zap', color: 'blue' },
        { value: 'security', label: 'Security', icon: 'shield', color: 'green' },
        { value: 'mobility', label: 'Mobility', icon: 'bike', color: 'red' },
        { value: 'productivity', label: 'Productivity', icon: 'monitor', color: 'indigo' },
        { value: 'other', label: 'Other', icon: 'package', color: 'gray' }
      ];
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  }
}

module.exports = new AddOnController();