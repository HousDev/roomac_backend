// // controllers/paymentController.js
// const razorpay = require("../config/razorpay");
// const crypto = require("crypto");

// /**
//  * CREATE ORDER
//  */
// const createOrder = async (req, res) => {
//   try {
//     const { amount } = req.body;

//     const order = await razorpay.orders.create({
//       amount: amount * 100, // INR → paise
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//     });

//     res.json({
//       success: true,
//       order,
//       key: process.env.RAZORPAY_KEY_ID,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /**
//  * VERIFY PAYMENT
//  */
// const verifyPayment = async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
//       req.body;

//     const body = razorpay_order_id + "|" + razorpay_payment_id;

//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(body)
//       .digest("hex");

//     if (expectedSignature === razorpay_signature) {
//       return res.json({ success: true });
//     }

//     res.status(400).json({
//       success: false,
//       message: "Invalid signature",
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// module.exports = {
//   createOrder,
//   verifyPayment,
// };


// controllers/paymentController.js
const crypto = require("crypto");
const { getRazorpayInstance, getRazorpayKeyId, isRazorpayEnabled } = require("../config/razorpay");

/**
 * CREATE ORDER
 */
const createOrder = async (req, res) => {
  try {
    // Check if Razorpay is enabled
    const enabled = await isRazorpayEnabled();
    if (!enabled) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment gateway is not configured. Please contact administrator."
      });
    }

    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    // Get Razorpay instance from database settings
    const razorpay = await getRazorpayInstance();
    
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway not configured. Please check Razorpay settings."
      });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // INR → paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture payment
    });

    // Get Key ID for frontend
    const keyId = await getRazorpayKeyId();

    res.json({
      success: true,
      order,
      key: keyId,
    });
  } catch (error) {
    console.error("❌ Create order error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment order"
    });
  }
};

/**
 * VERIFY PAYMENT
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification details"
      });
    }

    // Get Razorpay instance to get secret for verification
    const razorpay = await getRazorpayInstance();
    
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway not configured"
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    // Get secret from the instance
    const expectedSignature = crypto
      .createHmac("sha256", razorpay.key_secret)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment is verified
      return res.json({ 
        success: true,
        message: "Payment verified successfully"
      });
    }

    res.status(400).json({
      success: false,
      message: "Invalid payment signature",
    });
  } catch (error) {
    console.error("❌ Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment"
    });
  }
};

/**
 * Get Razorpay configuration status
 */
const getRazorpayStatus = async (req, res) => {
  try {
    const enabled = await isRazorpayEnabled();
    const keyId = await getRazorpayKeyId();
    
    res.json({
      success: true,
      data: {
        enabled,
        hasKeyId: !!keyId,
        mode: keyId && keyId.startsWith('rzp_live_') ? 'live' : 'test'
      }
    });
  } catch (error) {
    console.error("❌ Get Razorpay status error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getRazorpayStatus
};