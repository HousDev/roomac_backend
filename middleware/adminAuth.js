// // middleware/adminAuth.js
// const jwt = require('jsonwebtoken');

// const adminAuth = (req, res, next) => {
//   try {
//     // Get token from header
//     const authHeader = req.headers.authorization;
    
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({
//         success: false,
//         error: 'No token provided'
//       });
//     }

//     const token = authHeader.split(' ')[1];

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-secret-key-123');
    
//     // Check if it's an admin token
//     if (decoded.type !== 'admin') {
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid token type - admin access required'
//       });
//     }

//     // Add admin info to request
//     req.user = {
//       adminId: decoded.adminId,
//       email: decoded.email,
//       type: decoded.type,
//       role: decoded.role || 'admin'
//     };

//     console.log('✅ Admin Auth middleware: Admin authenticated', decoded.adminId);
//     next();
//   } catch (error) {
//     console.error('❌ Admin Auth middleware error:', error.message);
    
//     if (error.name === 'JsonWebTokenError') {
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid token'
//       });
//     }
    
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({
//         success: false,
//         error: 'Token expired'
//       });
//     }

//     res.status(500).json({
//       success: false,
//       error: 'Admin authentication failed'
//     });
//   }
// };

// module.exports = adminAuth;

// middleware/adminAuth.js - CORRECT VERSION
const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  try {
    console.log('🔍 ADMIN AUTH MIDDLEWARE STARTED');
    
    // Get token from header
    const authHeader = req.headers.authorization;
    
    console.log('📋 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token in header');
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token received (first 30 chars):', token.substring(0, 30) + '...');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-secret-key-123');
    
    console.log('✅ Token verified successfully');
    console.log('📝 Decoded token payload:', decoded);
    console.log('🔍 Available fields in token:', Object.keys(decoded));
    
    // Check if it's an admin token
    if (decoded.type !== 'admin') {
      console.log('❌ Token type is not "admin":', decoded.type);
      return res.status(401).json({
        success: false,
        error: 'Invalid token type - admin access required'
      });
    }

    // ✅ CRITICAL FIX: Extract adminId from "id" field (your token has "id", not "adminId")
    const adminId = decoded.id;  // NOT decoded.adminId!
    
    console.log('🔍 Extracted adminId from decoded.id:', adminId);
    console.log('🔍 decoded.adminId would be:', decoded.adminId);
    
    if (!adminId) {
      console.error('❌ No admin ID found in token payload');
      console.error('Full decoded token:', decoded);
      return res.status(401).json({
        success: false,
        error: 'Invalid token - no admin ID found'
      });
    }

    // Add admin info to request
    req.user = {
      adminId: adminId,  // ✅ This will now be 1 (from decoded.id)
      email: decoded.email,
      type: decoded.type,
      role: decoded.role || 'admin'
    };

    console.log('✅ Admin authenticated with ID:', adminId);
    console.log('📋 Final req.user object:', req.user);
    next();
    
  } catch (error) {
    console.error('❌ Admin Auth middleware error:', error.name, error.message);
    
    if (error.name === 'JsonWebTokenError') {
      console.error('   JWT Error details:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid token: ' + error.message
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.error('   Token expired at:', error.expiredAt);
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    console.error('   Unknown error:', error);
    res.status(500).json({
      success: false,
      error: 'Admin authentication failed: ' + error.message
    });
  }
};

module.exports = adminAuth;