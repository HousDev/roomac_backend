// routes/authRoutes.js
const express = require("express");
const AuthController = require("../controllers/authController");

const router = express.Router();

// login route
router.post("/login", AuthController.login);

router.get("/get-user-details/:email", AuthController.getUserDetails)

module.exports = router;
