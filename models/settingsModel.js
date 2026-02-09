// model/settingsModel.js
const db = require('../config/db');

class Setting {
  // Get all settings
  static async findAll() {
    const [rows] = await db.query('SELECT * FROM app_settings ORDER BY setting_key');
    return rows;
  }

  // Get setting by key
  static async findByKey(key) {
    const [rows] = await db.query('SELECT * FROM app_settings WHERE setting_key = ?', [key]);
    return rows[0];
  }

  // Update setting
  static async update(key, value) {
    const [result] = await db.query(
      'UPDATE app_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
      [value, key]
    );
    
    if (result.affectedRows > 0) {
      const [updated] = await db.query('SELECT * FROM app_settings WHERE setting_key = ?', [key]);
      return updated[0];
    }
    return null;
  }

  // Update multiple settings
  static async updateMultiple(settingsData) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      for (const [key, value] of Object.entries(settingsData)) {
        // Check if setting exists
        const [existing] = await connection.query(
          'SELECT id FROM app_settings WHERE setting_key = ?',
          [key]
        );
        
        if (existing.length > 0) {
          // Update existing
          await connection.query(
            'UPDATE app_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
            [value || '', key]
          );
        } else {
          // Insert new
          await connection.query(
            'INSERT INTO app_settings (setting_key, value) VALUES (?, ?)',
            [key, value || '']
          );
        }
      }
      
      await connection.commit();
      
      // Get updated settings
      const [settings] = await connection.query('SELECT * FROM app_settings ORDER BY setting_key');
      return settings;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Create or update setting
  static async upsert(key, value) {
    const existing = await this.findByKey(key);
    
    if (existing) {
      return await this.update(key, value);
    } else {
      const [result] = await db.query(
        'INSERT INTO app_settings (setting_key, value) VALUES (?, ?)',
        [key, value]
      );
      
      if (result.insertId) {
        const [newSetting] = await db.query('SELECT * FROM app_settings WHERE id = ?', [result.insertId]);
        return newSetting[0];
      }
      return null;
    }
  }

  // Get settings as key-value object
  static async getAllAsObject() {
    const settings = await this.findAll();
    const settingsObj = {};
    
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        id: setting.id,
        value: setting.value,
        created_at: setting.created_at,
        updated_at: setting.updated_at
      };
    });
    
    return settingsObj;
  }

  // Initialize default settings
  static async initializeDefaults() {
    const defaultSettings = {
      // General Settings
      'site_name': 'ROOMAC',
      'site_tagline': 'Comfort, Care, and Quality Accommodation',
      'contact_email': 'info@roomac.com',
      'contact_phone': '+919876543210',
      'contact_address': 'Hinjawadi, Pune, Maharashtra 411057',
      'whatsapp_number': '919876543210',
      'currency': 'INR',
      'facebook_url': '',
      'instagram_url': '',
      'linkedin_url': '',

      // Branding Settings
      'logo_header': '',
      'logo_footer': '',
      'logo_admin_sidebar': '',
      'favicon_url': '',
      'primary_color': '#004AAD',
      'secondary_color': '#FFC107',

      // SMS Settings
      'sms_enabled': 'false',
      'sms_provider': 'MSG91',
      'sms_sender_id': 'ROOMAC',
      'sms_api_key': '',
      'sms_route': 'transactional',

      // Email Settings
      'email_enabled': 'false',
      'smtp_host': '',
      'smtp_port': '587',
      'smtp_username': '',
      'smtp_password': '',
      'smtp_from_email': '',
      'smtp_from_name': 'ROOMAC',

      // Payment Settings
      'razorpay_enabled': 'false',
      'razorpay_key_id': '',
      'razorpay_key_secret': '',
      'razorpay_webhook_secret': '',

      // Notification Settings
      'notify_new_booking': 'true',
      'notify_payment_received': 'true',
      'notify_maintenance_request': 'true',
      'notify_complaint': 'true',
      'admin_notification_email': '',
      'admin_notification_phone': '',

      // Advanced Settings
      'timezone': 'Asia/Kolkata',
      'date_format': 'DD/MM/YYYY',
      'google_analytics_id': '',
      'facebook_pixel_id': '',
      'terms_url': '/terms',
      'privacy_url': '/privacy',
      'maintenance_mode': 'false'
    };

    await this.updateMultiple(defaultSettings);
  }
}

module.exports = Setting;