const TenantCredential = require('../models/tenantAuthModel');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const bcrypt = require('bcrypt');

// Generate JWT token
const generateToken = (tenantId, email,type) => {
  return jwt.sign(
    { tenantId, email, type: type },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Send OTP (for demo - in production use email service)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs in memory (in production use Redis)
const otpStore = new Map();

class TenantAuthController {
  // Login with email and password
 static async login(req, res) {
  try {
    console.log('🔍 Login attempt:', req.body);

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // ============================================
    // 1️⃣ CHECK TENANT LOGIN FIRST
    // ============================================

    const [credentials] = await db.query(
      'SELECT * FROM tenant_credentials WHERE email = ? AND is_active = 1',
      [email]
    );

    if (credentials.length > 0) {
      const credential = credentials[0];

      let isValid = false;

      // Check bcrypt or plain text
      if (
        credential.password_hash.startsWith('$2b$') ||
        credential.password_hash.startsWith('$2a$') ||
        credential.password_hash.startsWith('$2y$')
      ) {
        isValid = await bcrypt.compare(password, credential.password_hash);
      } else {
        isValid = password === credential.password_hash;
      }

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Check tenant details
      const [tenant] = await db.query(
        'SELECT id, full_name, email, phone, portal_access_enabled FROM tenants WHERE id = ?',
        [credential.tenant_id]
      );

      if (tenant.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      if (!tenant[0].portal_access_enabled) {
        return res.status(403).json({
          success: false,
          error: 'Portal access is not enabled for your account.'
        });
      }

      const token = generateToken({
        id: credential.tenant_id,
        email: credential.email,
        role: 'tenant',
        type: 'tenant'
      });

      return res.json({
        success: true,
        token,
        role: 'tenant',
        user: tenant[0],
        message: 'Tenant login successful'
      });
    }

    // ============================================
    // 2️⃣ IF NOT TENANT → CHECK ADMIN
    // ============================================

    const [admins] = await db.query(
      'SELECT * FROM users WHERE email = ? ',
      [email]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const admin = admins[0];

    const isAdminValid = await bcrypt.compare(password, admin.password);

    if (!isAdminValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: 'admin',
     type: 'admin'

    });

    return res.json({
      success: true,
      token,
      role: 'admin',
      user: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email
      },
      message: 'Admin login successful'
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}


  // Send OTP to email (alternative login method)
  static async sendOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      console.log('🔍 OTP request for:', email);

      // Check if tenant has credential and portal access
      const credential = await TenantCredential.findByEmail(email);
      
      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'No active account found with this email'
        });
      }

      // Check portal access
      const portalAccess = await TenantCredential.checkPortalAccess(credential.tenant_id);
      if (!portalAccess) {
        return res.status(403).json({
          success: false,
          error: 'Portal access is not enabled for your account'
        });
      }

      // Check if credential is active
      if (!credential.is_active) {
        return res.status(403).json({
          success: false,
          error: 'Your account is deactivated'
        });
      }

      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP with expiration (10 minutes)
      otpStore.set(email, {
        otp,
        tenantId: credential.tenant_id,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
      });

      // In production: Send OTP via email/SMS
      console.log(`OTP for ${email}: ${otp}`);

      res.json({
        success: true,
        otp, // Remove this in production - for demo only
        message: 'OTP sent successfully'
      });

    } catch (error) {
      console.error('❌ Send OTP error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send OTP'
      });
    }
  }

  // Verify OTP and login
  static async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Email and OTP are required'
        });
      }

      console.log('🔍 OTP verification for:', email);

      // Get stored OTP
      const storedData = otpStore.get(email);
      
      if (!storedData) {
        return res.status(400).json({
          success: false,
          error: 'OTP expired or not requested'
        });
      }

      // Check expiration
      if (Date.now() > storedData.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({
          success: false,
          error: 'OTP has expired'
        });
      }

      // Verify OTP
      if (storedData.otp !== otp) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP'
        });
      }

      const tenantId = storedData.tenantId;

      // Check portal access again (security)
      const portalAccess = await TenantCredential.checkPortalAccess(tenantId);
      if (!portalAccess) {
        otpStore.delete(email);
        return res.status(403).json({
          success: false,
          error: 'Portal access is not enabled for your account'
        });
      }

      // Generate token
      const token = generateToken(tenantId, email);

      // Get tenant details
      const tenant = await TenantCredential.getTenantWithCredential(tenantId);

      // Clear OTP after successful verification
      otpStore.delete(email);

      console.log('✅ OTP login successful for tenant:', tenantId);

      res.json({
        success: true,
        token,
        tenant_id: tenantId,
        tenant_email: email,
        tenant: tenant || null,
        message: 'OTP verified successfully'
      });

    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      res.status(500).json({
        success: false,
        error: 'OTP verification failed'
      });
    }
  }

// Get current tenant profile
  static async getProfile(req, res) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      console.log('🔍 Getting profile for tenant:', tenantId);

      const [tenant] = await db.query(
        `SELECT t.*, tc.email as credential_email
         FROM tenants t
         LEFT JOIN tenant_credentials tc ON t.id = tc.tenant_id
         WHERE t.id = ?`,
        [tenantId]
      );

      if (tenant.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Remove sensitive information
      const safeTenantData = { ...tenant[0] };
      delete safeTenantData.password_hash;

      res.json({
        success: true,
        data: safeTenantData
      });

    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile'
      });
    }
  }


  // Change password (requires current password)
  static async changePassword(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      const { currentPassword, newPassword } = req.body;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }

      console.log('🔍 Password change request for tenant:', tenantId);

      // Get current credential
      const credential = await TenantCredential.findByTenantId(tenantId);
      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      // Verify current password with bcrypt
      const isValid = await bcrypt.compare(currentPassword, credential.password_hash);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Update password with bcrypt hashing
      const updated = await TenantCredential.updatePassword(tenantId, newPassword);

      if (updated) {
        console.log('✅ Password updated for tenant:', tenantId);
        res.json({
          success: true,
          message: 'Password updated successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update password'
        });
      }

    } catch (error) {
      console.error('❌ Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  }

  // Request password reset (forgot password)
  static async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      console.log('🔍 Password reset request for:', email);

      // Check if tenant exists and has active credential
      const credential = await TenantCredential.findByEmail(email);
      if (!credential) {
        // For security, don't reveal if email exists
        return res.json({
          success: true,
          message: 'If your email is registered, you will receive reset instructions'
        });
      }

      // Generate reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { 
          tenantId: credential.tenant_id, 
          email: credential.email,
          type: 'password_reset' 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      // In production: Send email with reset link
      // Example: https://yourdomain.com/tenant/reset-password?token=xyz
      console.log(`Reset token for ${email}: ${resetToken}`);

      res.json({
        success: true,
        resetToken, // In production, send via email only
        message: 'Password reset instructions sent'
      });

    } catch (error) {
      console.error('❌ Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process reset request'
      });
    }
  }

  // Reset password with token (from forgot password)
  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token and new password are required'
        });
      }

      console.log('🔍 Password reset with token');

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      } catch (err) {
        console.error('❌ Invalid reset token:', err.message);
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset link'
        });
      }

      if (decoded.type !== 'password_reset') {
        return res.status(400).json({
          success: false,
          error: 'Invalid token type'
        });
      }

      // Update password with bcrypt
      const updated = await TenantCredential.updatePassword(decoded.tenantId, newPassword);

      if (updated) {
        console.log('✅ Password reset successful for tenant:', decoded.tenantId);
        res.json({
          success: true,
          message: 'Password reset successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to reset password'
        });
      }

    } catch (error) {
      console.error('❌ Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password'
      });
    }
  }

// Logout
  static async logout(req, res) {
    try {
      console.log('🔍 Tenant logout:', req.user?.tenantId);
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

// Check authentication
  static async checkAuth(req, res) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      res.json({
        success: true,
        authenticated: true,
        tenantId,
        tenant_email: req.user?.email
      });

    } catch (error) {
      console.error('❌ Check auth error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication check failed'
      });
    }
  }


 static async test(req, res) {
    try {
      console.log('✅ Tenant Auth Test endpoint called');
      res.json({
        success: true,
        message: 'Tenant Auth API is working!',
        timestamp: new Date().toISOString(),
        endpoints: [
          'POST /login',
          'POST /send-otp',
          'POST /verify-otp',
          'GET /profile',
          'POST /logout'
        ]
      });
    } catch (error) {
      console.error('Test error:', error);
      res.status(500).json({
        success: false,
        error: 'Test failed'
      });
    }
  }

 // Get all tenants with credentials (admin)
  static async getAllTenantsCredentials(req, res) {
    try {
      const [tenants] = await db.query(
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
      
      res.json({
        success: true,
        data: tenants,
        count: tenants.length
      });
    } catch (error) {
      console.error('❌ Get all tenants credentials error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant credentials'
      });
    }
  }
}


module.exports = TenantAuthController;