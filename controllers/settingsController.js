

const Setting = require("../models/settingsModel");
const { sendEmail } = require("../utils/emailService");
const path = require("path");
const fs = require("fs").promises;

class SettingsController {
  // Get all settings
  async getSettings(req, res) {
    try {
      const settings = await Setting.getAllAsObject();

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("❌ Error fetching settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch settings",
      });
    }
  }

  // SMTP Test Email
  async testEmail(req, res) {
    try {
      const testEmail = req.body.email || "roomac.in@gmail.com";

      await sendEmail(
        testEmail,
        "SMTP Test",
        "<h2>Email system working 🚀</h2>",
      );

      res.json({
        success: true,
        message: "SMTP test email sent successfully",
      });
    } catch (error) {
      console.error("❌ SMTP test failed:", error);
      res.status(500).json({
        success: false,
        error: "SMTP test failed",
      });
    }
  }

  // Update settings
  async updateSettings(req, res) {
    try {
      const { settings } = req.body;

      

      if (!settings || typeof settings !== "object") {
        return res.status(400).json({
          success: false,
          error: "Settings data is required",
        });
      }

      const updatedSettings = await Setting.updateMultiple(settings);

      // Convert to object format
      const settingsObj = {};
      updatedSettings.forEach((setting) => {
        settingsObj[setting.setting_key] = {
          id: setting.id,
          value: setting.value,
          created_at: setting.created_at,
          updated_at: setting.updated_at,
        };
      });

      

      res.json({
        success: true,
        data: settingsObj,
        message: "Settings updated successfully",
      });
    } catch (error) {
      console.error("❌ Error updating settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update settings",
      });
    }
  }

  // Update single setting
  async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          error: "Key and value are required",
        });
      }

      const updatedSetting = await Setting.upsert(key, value);

      if (!updatedSetting) {
        return res.status(500).json({
          success: false,
          error: "Failed to update setting",
        });
      }


      res.json({
        success: true,
        data: updatedSetting,
        message: "Setting updated successfully",
      });
    } catch (error) {
      console.error(`❌ Error updating setting ${req.params.key}:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to update setting",
      });
    }
  }

  // Upload file
  async uploadFile(req, res) {
    try {
      const { bucket, path: filePath } = req.body;
      const file = req.file;


      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      // Generate public URL
      const publicUrl = `/uploads/logos/${file.filename}`;
      const fullUrl = `${req.protocol}://${req.get("host")}${publicUrl}`;


      res.json({
        success: true,
        url: publicUrl,
        fullUrl: fullUrl,
        fileName: file.filename,
        originalName: file.originalname,
        size: file.size,
        message: "File uploaded successfully",
      });
    } catch (error) {
      console.error("❌ Error uploading file:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload file: " + error.message,
      });
    }
  }

  // Initialize default settings
  async initializeSettings(req, res) {
    try {
      await Setting.initializeDefaults();

      const settings = await Setting.getAllAsObject();



      res.json({
        success: true,
        data: settings,
        message: "Default settings initialized successfully",
      });
    } catch (error) {
      console.error("❌ Error initializing settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to initialize settings",
      });
    }
  }
}

module.exports = new SettingsController();