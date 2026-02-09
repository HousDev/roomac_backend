const db = require('../config/db');
const bcrypt = require('bcrypt');

class TenantCredential {
  // Find credential by email
  static async findByEmail(email) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM tenant_credentials WHERE email = ? AND is_active = 1',
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding tenant credential by email:', error);
      throw error;
    }
  }

  // Find credential by tenant_id
  static async findByTenantId(tenantId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM tenant_credentials WHERE tenant_id = ? AND is_active = 1',
        [tenantId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding tenant credential by tenant_id:', error);
      throw error;
    }
  }

  // Create new tenant credential with bcrypt
  static async create(tenantId, email, password) {
    try {
      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const [result] = await db.query(
        `INSERT INTO tenant_credentials (tenant_id, email, password_hash, is_active, created_at) 
         VALUES (?, ?, ?, 1, NOW())`,
        [tenantId, email, password_hash]
      );
      return { id: result.insertId, tenant_id: tenantId, email };
    } catch (error) {
      console.error('Error creating tenant credential:', error);
      throw error;
    }
  }

  // Update password with bcrypt
  static async updatePassword(tenantId, newPassword) {
    try {
      // Hash new password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      const [result] = await db.query(
        'UPDATE tenant_credentials SET password_hash = ?, updated_at = NOW() WHERE tenant_id = ?',
        [password_hash, tenantId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating tenant password:', error);
      throw error;
    }
  }

  // Verify password with bcrypt
  static async verifyPassword(email, password) {
    try {
      const credential = await this.findByEmail(email);
      if (!credential) return null;
      
      // Compare password with bcrypt
      const isValid = await bcrypt.compare(password, credential.password_hash);
      return isValid ? credential : null;
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  }

  // Activate/deactivate credential
  static async updateStatus(tenantId, isActive) {
    try {
      const [result] = await db.query(
        'UPDATE tenant_credentials SET is_active = ?, updated_at = NOW() WHERE tenant_id = ?',
        [isActive ? 1 : 0, tenantId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating credential status:', error);
      throw error;
    }
  }

  // Delete credential by tenant_id
  static async deleteByTenantId(tenantId) {
    try {
      const [result] = await db.query(
        'DELETE FROM tenant_credentials WHERE tenant_id = ?',
        [tenantId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting tenant credential:', error);
      throw error;
    }
  }

  // Get tenant details with credential and portal access check
  static async getTenantWithCredential(tenantId) {
    try {
      const [rows] = await db.query(
        `SELECT 
          t.*, 
          tc.email as credential_email, 
          tc.is_active as credential_active,
          tc.created_at as credential_created,
          tc.updated_at as credential_updated
         FROM tenants t
         LEFT JOIN tenant_credentials tc ON t.id = tc.tenant_id
         WHERE t.id = ?`,
        [tenantId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting tenant with credential:', error);
      throw error;
    }
  }

  // Check if tenant has portal access enabled (from tenants table) and credential is active
  static async checkPortalAccess(tenantId) {
    try {
      const [rows] = await db.query(
        `SELECT 
          t.id,
          t.full_name,
          t.email as tenant_email,
          t.portal_access_enabled,
          tc.email as credential_email,
          tc.is_active as credential_active
         FROM tenants t
         LEFT JOIN tenant_credentials tc ON t.id = tc.tenant_id
         WHERE t.id = ? 
           AND t.portal_access_enabled = 1 
           AND tc.is_active = 1
           AND tc.email IS NOT NULL`,
        [tenantId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error checking portal access:', error);
      throw error;
    }
  }

  // Get all tenants with their credential status
  static async getAllTenantsWithCredentials() {
    try {
      const [rows] = await db.query(
        `SELECT 
          t.id,
          t.full_name,
          t.email as tenant_email,
          t.phone,
          t.portal_access_enabled,
          tc.email as credential_email,
          tc.is_active as credential_active,
          tc.created_at as credential_created
         FROM tenants t
         LEFT JOIN tenant_credentials tc ON t.id = tc.tenant_id
         ORDER BY t.full_name`
      );
      return rows;
    } catch (error) {
      console.error('Error getting all tenants with credentials:', error);
      throw error;
    }
  }

  // Check if email already exists (for new credential creation)
  static async emailExists(email) {
    try {
      const [rows] = await db.query(
        'SELECT COUNT(*) as count FROM tenant_credentials WHERE email = ?',
        [email]
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
  }
}

module.exports = TenantCredential;