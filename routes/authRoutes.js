// routes/authRoutes.js
const express = require("express");
const AuthController = require("../controllers/authController");

const router = express.Router();

// login route
router.post("/login", AuthController.login);

router.get("/get-user-details/:email", AuthController.getUserDetails)

router.get("/users", AuthController.getAllUsers);
router.put("/users/:id/permissions", AuthController.updateUserPermissions);

router.get("/roles", AuthController.getRoles);
router.put("/roles/:roleName/permissions", AuthController.updateRolePermissions);

router.put("/users/:id/permissions/reset", AuthController.resetUserPermissions);

module.exports = router;
