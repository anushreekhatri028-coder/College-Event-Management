
const authService = require("../services/auth.service");

// Register a new student account
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required"
            });
        }

        // Public registration always creates a student account.
        // Any role sent in req.body is intentionally ignored.
        const user = await authService.registerUser(
            name,
            email,
            password
        );

        return res.status(201).json({
            success: true,
            message: "Student registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        // Expected validation and duplicate-account errors
        const clientErrors = [
            "User already exists",
            "Invalid email format",
            "Only college email addresses are allowed",
            "Name is required",
            "Password must be at least 8 characters long"
        ];

        if (clientErrors.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again later."
        });
    }
};

// Login an existing user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const result = await authService.loginUser(email, password);

        const { user, token } = result;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        const clientErrors = [
            "Invalid email or password",
            "Only college email addresses are allowed",
            "Invalid email format"
        ];

        if (clientErrors.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again later."
        });
    }
};

// IMPORTANT: These names must match auth.routes.js
module.exports = {
    register,
    login
};
