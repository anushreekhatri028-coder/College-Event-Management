const express = require("express");

const {
    register,
    login,
    googleLogin
} = require("../controllers/auth.controller");

const router = express.Router();

// Existing authentication routes
router.post("/register", register);
router.post("/login", login);

// New Google authentication route
router.post("/google", googleLogin);

module.exports = router;