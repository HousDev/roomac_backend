// // routes/authRoutes.js
// const express = require("express");
// const AuthController = require("../controllers/authController");

// const router = express.Router();

// // login route
// router.post("/login", AuthController.login);

// module.exports = router;

const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");

router.post("/login", AuthController.login);

module.exports = router;
