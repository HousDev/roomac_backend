
// middleware/tenantAuth.js - ADD DEBUGGING
const jwt = require('jsonwebtoken');

const tenantAuth = (req, res, next) => {
  try {
    
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

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tenant-secret-key-123');
    
    
    // Check token structure
    if (decoded.type && decoded.type !== 'tenant') {
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

