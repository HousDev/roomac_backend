const Setting = require('../models/settingsModel');
const path = require('path');
const fs = require('fs').promises;

class SettingsController {
  // Get all settings
  async getSettings(req, res) {
    try {
      console.log('🔍 Getting all settings...');
      const settings = await Setting.getAllAsObject();
      
      console.log(`✅ Retrieved ${Object.keys(settings).length} settings`);
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settings'
      });
    }
  }

  // Update settings
  async updateSettings(req, res) {
    try {
      const { settings } = req.body;
      
      console.log('🔍 Updating settings with data:', Object.keys(settings || {}).length, 'keys');
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Settings data is required'
        });
      }

      const updatedSettings = await Setting.updateMultiple(settings);
      
      // Convert to object format
      const settingsObj = {};
      updatedSettings.forEach(setting => {
        settingsObj[setting.setting_key] = {
          id: setting.id,
          value: setting.value,
          created_at: setting.created_at,
          updated_at: setting.updated_at
        };
      });

      console.log(`✅ Updated ${Object.keys(settingsObj).length} settings successfully`);
      
      res.json({
        success: true,
        data: settingsObj,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings'
      });
    }
  }

  // Update single setting
  async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;

      console.log(`🔍 Updating setting: ${key} = ${value}`);

      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Key and value are required'
        });
      }

      const updatedSetting = await Setting.upsert(key, value);
      
      if (!updatedSetting) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update setting'
        });
      }

      console.log(`✅ Setting ${key} updated successfully`);
      
      res.json({
        success: true,
        data: updatedSetting,
        message: 'Setting updated successfully'
      });
    } catch (error) {
      console.error(`❌ Error updating setting ${req.params.key}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to update setting'
      });
    }
  }

  // Upload file
  async uploadFile(req, res) {
    try {
      const { bucket, path: filePath } = req.body;
      const file = req.file;

      console.log('📤 Uploading file:', file?.originalname);

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      // Generate public URL
      const publicUrl = `/uploads/logos/${file.filename}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${publicUrl}`;

      console.log(`✅ File uploaded: ${fullUrl}`);

      res.json({
        success: true,
        url: publicUrl,
        fullUrl: fullUrl,
        fileName: file.filename,
        originalName: file.originalname,
        size: file.size,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file: ' + error.message
      });
    }
  }

  // Initialize default settings
  async initializeSettings(req, res) {
    try {
      console.log('🔧 Initializing default settings...');
      await Setting.initializeDefaults();
      
      const settings = await Setting.getAllAsObject();
      
      console.log(`✅ Initialized ${Object.keys(settings).length} default settings`);
      
      res.json({
        success: true,
        data: settings,
        message: 'Default settings initialized successfully'
      });
    } catch (error) {
      console.error('❌ Error initializing settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize settings'
      });
    }
  }
}

module.exports = new SettingsController();