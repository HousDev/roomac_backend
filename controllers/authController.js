// controllers/AuthController.js
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserModel = require("../models/authModel");
const db = require("../config/db");
const { error } = require("pdf-lib");


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

      // If password already hashed (bcrypt typical prefixes: $2a$ $2b$ $2y$)
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
        // stored password is plain-text: compare, then hash & update DB for future
        if (password !== stored) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid email or password" });
        }

        // Hash the plain password and update DB (auto-migrate)
        const newHashed = await bcrypt.hash(stored, 10);
        try {
          await UserModel.updatePassword(user.id, newHashed);
        } catch (err) {
          console.error("Failed to update password hash for user:", email, err);
          // proceed without failing login - password already matched
        }
      }

if (user.is_active == 0) {
  return res.status(403).json({
    success: false,
    message: "Your account has been deactivated."
  });
}
      // Generate JWT
      const token = jwt.sign({ id: user.id, email: user.email, type:'admin' }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });


      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: { id: user.id, email: user.email , role:user.role},
      });
    } catch (err) {
      console.error("AuthController.login error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  async getUserDetails(req, res){
    const {email} = req.params;
    try{
      const [user] = await db.query(`select s.* , r.name as role_name from staff as s  LEFT JOIN master_item_values r ON r.id = s.role where email = ?   `,[email])
   
      return res.status(200).json({message:"successsfulyyyy ", user:user[0]})
  }catch(error) {
    console.log(error)
      return res.status(500).json({message:"internal server error "})
    }
  }
};

module.exports = AuthController;
