// config/razorpay.js
// const Razorpay = require("razorpay");

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// module.exports = razorpay;

// config/razorpay.js
const Razorpay = require("razorpay");
const Setting = require("../models/settingsModel");

let razorpayInstance = null;

/**
 * Initialize Razorpay instance with settings from database
 */
async function getRazorpayInstance() {
  try {
    // Fetch Razorpay settings from database
    const razorpayKeyId = await Setting.findByKey('razorpay_key_id');
    const razorpayKeySecret = await Setting.findByKey('razorpay_key_secret');
    const razorpayEnabled = await Setting.findByKey('razorpay_enabled');

    if (!razorpayEnabled || razorpayEnabled.value !== 'true') {
      console.warn('⚠️ Razorpay is disabled in settings');
      return null;
    }

    if (!razorpayKeyId || !razorpayKeyId.value) {
      console.error('❌ Razorpay Key ID not found in settings');
      return null;
    }

    if (!razorpayKeySecret || !razorpayKeySecret.value) {
      console.error('❌ Razorpay Key Secret not found in settings');
      return null;
    }

    // Create new instance if not exists or if credentials changed
    if (!razorpayInstance || 
        razorpayInstance.key_id !== razorpayKeyId.value || 
        razorpayInstance.key_secret !== razorpayKeySecret.value) {
      
      razorpayInstance = new Razorpay({
        key_id: razorpayKeyId.value,
        key_secret: razorpayKeySecret.value,
      });
      
      console.log('✅ Razorpay instance initialized from database settings');
    }
    
    return razorpayInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay:', error);
    return null;
  }
}

/**
 * Get Razorpay Key ID for frontend
 */
async function getRazorpayKeyId() {
  try {
    const razorpayKeyId = await Setting.findByKey('razorpay_key_id');
    return razorpayKeyId ? razorpayKeyId.value : null;
  } catch (error) {
    console.error('❌ Failed to get Razorpay Key ID:', error);
    return null;
  }
}

/**
 * Check if Razorpay is enabled
 */
async function isRazorpayEnabled() {
  try {
    const razorpayEnabled = await Setting.findByKey('razorpay_enabled');
    return razorpayEnabled && razorpayEnabled.value === 'true';
  } catch (error) {
    console.error('❌ Failed to check Razorpay status:', error);
    return false;
  }
}

module.exports = {
  getRazorpayInstance,
  getRazorpayKeyId,
  isRazorpayEnabled
};
