// // middleware/tenantAuth.js
// const jwt = require('jsonwebtoken');

// const tenantAuth = (req, res, next) => {
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
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tenant-secret-key-123');
    
//     // Check if it's a tenant token
//     if (decoded.type !== 'tenant') {
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid token type'
//       });
//     }

//     // Add tenant info to request
//     req.user = {
//       tenantId: decoded.tenantId,
//       email: decoded.email,
//       type: decoded.type
//     };

//     console.log('✅ Auth middleware: Tenant authenticated', decoded.tenantId);
//     next();
//   } catch (error) {
//     console.error('❌ Auth middleware error:', error.message);
    
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
//       error: 'Authentication failed'
//     });
//   }
// };

// module.exports = tenantAuth;

// middleware/tenantAuth.js - ADD DEBUGGING
const jwt = require('jsonwebtoken');

const tenantAuth = (req, res, next) => {
  try {
    console.log('🔐 Tenant Auth Middleware called for path:', req.path);
    console.log('📤 Headers:', req.headers);
    
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No token or Bearer prefix');
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token received (first 20 chars):', token.substring(0, 20) + '...');
    console.log('🔑 Full token:', token);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tenant-secret-key-123');
    console.log('🔓 Decoded token FULL:', JSON.stringify(decoded, null, 2));
    console.log('🔓 Token type:', decoded.type);
    console.log('🔓 Token has tenantId?', 'tenantId' in decoded);
    console.log('🔓 Token has id?', 'id' in decoded);
    
    // Check token structure
    if (decoded.type && decoded.type !== 'tenant') {
      console.warn('⚠️ Token type is not tenant:', decoded.type);
      return res.status(401).json({
        success: false,
        message: 'Invalid token type - tenant access required'
      });
    }

    // Add user info to request - handle both id and tenantId
    req.user = {
      id: decoded.tenantId || decoded.id,  // Handle both cases
      tenantId: decoded.tenantId || decoded.id, // Keep both for compatibility
      email: decoded.email,
      type: decoded.type || 'tenant'
    };

    console.log('✅ Tenant authenticated:', req.user);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.name, error.message);
    
    if (error.name === 'JsonWebTokenError') {
      console.error('   JWT Error details:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid token: ' + error.message
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.error('   Token expired at:', error.expiredAt);
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication failed: ' + error.message
    });
  }
};

module.exports = tenantAuth;

