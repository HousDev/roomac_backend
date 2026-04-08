// controllers/AuthController.js
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserModel = require("../models/authModel");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

const AuthController = {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ success: false, message: "Email and password are required" });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
      }

      const stored = user.password || "";

      if (
        typeof stored === "string" &&
        (stored.startsWith("$2a$") ||
          stored.startsWith("$2b$") ||
          stored.startsWith("$2y$"))
      ) {
        const isMatch = await bcrypt.compare(password, stored);
        if (!isMatch) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid email or password" });
        }
      } else {
        if (password !== stored) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid email or password" });
        }
        const newHashed = await bcrypt.hash(stored, 10);
        try {
          await UserModel.updatePassword(user.id, newHashed);
        } catch (err) {
          console.error("Failed to update password hash:", err);
        }
      }

      if (user.is_active == 0) {
        return res.status(403).json({
          success: false,
          message: "Your account has been deactivated.",
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, type: "admin" },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: { id: user.id, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error("AuthController.login error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  // GET /api/auth/get-user-details/:email
  // ✅ permissions bhi return hoti hain ab
//   async getUserDetails(req, res) {
//   const { email } = req.params;
//   try {
//     // First try staff table
//     const [rows] = await db.query(
//       `SELECT s.*, r.name as role_name, u.permissions
//        FROM staff AS s
//        LEFT JOIN master_item_values r ON r.id = s.role
//        LEFT JOIN users u ON u.email = s.email
//        WHERE s.email = ?`,
//       [email]
//     );

//     let user;

//     if (rows && rows.length > 0) {
//       // Found in staff table
//       user = rows[0];
//     } else {
//       // Not in staff — check users table directly (admin@roomac.com, test@roomac.com)
//       const [userRows] = await db.query(
//         `SELECT id, email, role, permissions FROM users WHERE email = ? LIMIT 1`,
//         [email]
//       );
//       if (!userRows || userRows.length === 0) {
//         return res.status(404).json({ message: "User not found" });
//       }
//       user = userRows[0];
//       user.role_name = user.role; // normalize so can() works in frontend
//     }

//     // Parse permissions JSON if stored as string
//     if (user.permissions && typeof user.permissions === "string") {
//       try {
//         user.permissions = JSON.parse(user.permissions);
//       } catch {
//         user.permissions = {};
//       }
//     } else if (!user.permissions) {
//       user.permissions = {};
//     }

//     return res.status(200).json({ message: "success", user });
//   } catch (error) {
//     console.error("getUserDetails error:", error); // ← now you'll see the real error
//     return res.status(500).json({ message: "Internal server error" });
//   }
// },
async getUserDetails(req, res) {
  const { email } = req.params;

  const safeParse = (data) => {
    try {
      if (typeof data === "string") return JSON.parse(data);
      return data || {};
    } catch {
      return {};
    }
  };

  try {
    const [rows] = await db.query(
      `SELECT s.*, r.name as role_name, u.permissions, 
              u.role as user_role, u.has_custom_permissions
       FROM staff AS s
       LEFT JOIN master_item_values r ON r.id = s.role
       LEFT JOIN users u ON u.email = s.email
       WHERE s.email = ?`,
      [email],
    );
    let user;
    let userRoleName = null;

    if (rows.length > 0) {
      user = rows[0];
      userRoleName = user.role_name || user.user_role;
    } else {
      const [userRows] = await db.query(
        `SELECT id, email, role, permissions, has_custom_permissions 
         FROM users WHERE email = ? LIMIT 1`,
        [email],
      );

      if (!userRows.length) {
        return res.status(404).json({ message: "User not found" });
      }

      user = userRows[0];
      userRoleName = user.role;
      user.role_name = user.role;
    }

    // Safe parse
    user.permissions = safeParse(user.permissions);

    // Role permissions
    if (userRoleName) {
      const [roleRows] = await db.query(
        `SELECT permissions FROM role_permissions 
         WHERE role_name = ? LIMIT 1`,
        [userRoleName],
      );

      user.role_permissions = roleRows.length
        ? safeParse(roleRows[0].permissions)
        : {};
    } else {
      user.role_permissions = {};
    }

    return res.status(200).json({ message: "success", user });
  } catch (error) {
    console.error("getUserDetails error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
},


  // GET /api/auth/users  — all users list for permissions page dropdown
  async getAllUsers(req, res) {
    try {
      const users = await UserModel.getAllUsers();
      return res.status(200).json({ success: true, data: users });
    } catch (err) {
      console.error("getAllUsers error:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // PUT /api/auth/users/:id/permissions  — save permissions for a user
  // async updateUserPermissions(req, res) {
  //   const { id } = req.params;
  //   const { permissions } = req.body;

  //   if (!permissions || typeof permissions !== "object") {
  //     return res
  //       .status(400)
  //       .json({ success: false, message: "permissions object required" });
  //   }

  //   try {
  //     await UserModel.updatePermissions(id, permissions);
  //     return res
  //       .status(200)
  //       .json({ success: true, message: "Permissions updated successfully" });
  //   } catch (err) {
  //     console.error("updateUserPermissions error:", err);
  //     return res
  //       .status(500)
  //       .json({ success: false, message: "Internal server error" });
  //   }
  // },
  async updateUserPermissions(req, res) {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!permissions || typeof permissions !== "object") {
    return res.status(400).json({ success: false, message: "permissions object required" });
  }

  try {
    // ── Save user permissions AND mark as having custom overrides ──
    await db.query(
      `UPDATE users 
       SET permissions = ?, has_custom_permissions = 1 
       WHERE id = ?`,
      [JSON.stringify(permissions), id]
    );

    return res.status(200).json({ 
      success: true, 
      message: "User permissions updated successfully" 
    });
  } catch (err) {
    console.error("updateUserPermissions error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
},



//  async getRoles(req, res) {
//   try {
//     // Get distinct roles AND their current permissions (from first user with that role)
//     const [rows] = await db.query(`
//       SELECT 
//         u.role as name,
//         u.permissions
//       FROM users u
//       INNER JOIN (
//         SELECT role, MIN(id) as min_id
//         FROM users 
//         WHERE role IS NOT NULL AND role != ''
//         GROUP BY role
//       ) first_user ON u.id = first_user.min_id
//       ORDER BY u.role
//     `);

//     const roles = rows.map((r, i) => ({
//       id: i + 1,
//       name: r.name,
//       permissions: r.permissions
//         ? typeof r.permissions === "string"
//           ? (() => { try { return JSON.parse(r.permissions); } catch { return {}; } })()
//           : r.permissions
//         : {},
//     }));

//     console.log("Roles fetched:", roles.map(r => r.name)); // debug
//     return res.status(200).json({ success: true, data: roles });
//   } catch (err) {
//     console.error("getRoles error:", err);
//     return res.status(500).json({ success: false, message: "Internal server error" });
//   }
// },
// // PUT /api/auth/roles/:roleName/permissions  — save permissions for all users with that role
// async updateRolePermissions(req, res) {
//   const { roleName } = req.params;
//   const { permissions } = req.body;

//   if (!permissions || typeof permissions !== "object") {
//     return res.status(400).json({ success: false, message: "permissions object required" });
//   }

//   try {
//     const permissionsJson = JSON.stringify(permissions);

//     // Update ALL users in users table whose role matches
//     const [result] = await db.query(
//       "UPDATE users SET permissions = ? WHERE LOWER(role) = LOWER(?)",
//       [permissionsJson, roleName]
//     );

//     console.log(`Role '${roleName}' permissions updated, affected rows: ${result.affectedRows}`);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ 
//         success: false, 
//         message: `No users found with role '${roleName}'` 
//       });
//     }

//     return res.status(200).json({ 
//       success: true, 
//       message: `Permissions updated for ${result.affectedRows} user(s) with role '${roleName}'` 
//     });
//   } catch (err) {
//     console.error("updateRolePermissions error:", err);
//     return res.status(500).json({ success: false, message: "Internal server error" });
//   }
// },
async getRoles(req, res) {
  try {
    // Get distinct roles from users
    const [userRoles] = await db.query(
      `SELECT DISTINCT role as name FROM users 
       WHERE role IS NOT NULL AND role != '' 
       ORDER BY role`
    );

    // Get saved permissions from role_permissions table
    const [rolePerms] = await db.query(
      `SELECT role_name, permissions FROM role_permissions`
    );

    const rolePermsMap = {};
    rolePerms.forEach(r => {
      rolePermsMap[r.role_name.toLowerCase()] = 
        typeof r.permissions === "string" 
          ? JSON.parse(r.permissions) 
          : r.permissions;
    });

    const roles = userRoles.map((r, i) => ({
      id: i + 1,
      name: r.name,
      permissions: rolePermsMap[r.name.toLowerCase()] || {},
    }));

    return res.status(200).json({ success: true, data: roles });
  } catch (err) {
    console.error("getRoles error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
},

// PUT /api/auth/roles/:roleName/permissions
async updateRolePermissions(req, res) {
  const { roleName } = req.params;
  const { permissions } = req.body;

  if (!permissions || typeof permissions !== "object") {
    return res.status(400).json({ success: false, message: "permissions object required" });
  }

  try {
    const permJson = JSON.stringify(permissions);

    // Save to role_permissions table (upsert)
    await db.query(
      `INSERT INTO role_permissions (role_name, permissions)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE permissions = ?, updated_at = NOW()`,
      [roleName, permJson, permJson]
    );

    // ── KEY FIX: Only update users who DON'T have custom overrides ──
    await db.query(
      `UPDATE users 
       SET permissions = ?
       WHERE LOWER(role) = LOWER(?) 
       AND (has_custom_permissions = 0 OR has_custom_permissions IS NULL)`,
      [permJson, roleName]
    );

    return res.status(200).json({ 
      success: true, 
      message: "Role permissions updated. Users with custom overrides were NOT affected." 
    });
  } catch (err) {
    console.error("updateRolePermissions error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
},


// PUT /api/auth/users/:id/permissions/reset
async resetUserPermissions(req, res) {
  const { id } = req.params;
  try {
    await db.query(
      `UPDATE users SET permissions = '{}', has_custom_permissions = 0 WHERE id = ?`,
      [id]
    );
    return res.status(200).json({ success: true, message: "Reset to role defaults" });
  } catch (err) {
    console.error("resetUserPermissions error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
},
};

module.exports = AuthController;