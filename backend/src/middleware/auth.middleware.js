
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

const protect = async (req, res, next) => {
    try {
        // 1. Check whether Authorization header exists.
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please login first."
            });
        }

        // 2. Extract JWT token.
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token is missing"
            });
        }

        // 3. Verify JWT token.
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing from environment variables");

            return res.status(500).json({
                success: false,
                message: "Server authentication configuration error"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // 4. Check whether token contains a user ID.
        if (!decoded.userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token"
            });
        }

        // 5. Fetch the latest user information from MongoDB.
        // Do NOT trust the role stored inside the JWT.
        const user = await User.findById(decoded.userId)
            .select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account no longer exists"
            });
        }

        // 6. Attach current database information to req.user.
        req.user = {
            userId: user._id.toString(),
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            presidentId: user.presidentId || null,
            facultyId: user.facultyId || null,
            profilePicture: user.profilePicture || ""
        };

        // 7. Continue to the next middleware/controller.
        next();

    } catch (error) {
        // Invalid, expired or malformed JWT.
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token. Please login again."
            });
        }

        console.error("Authentication middleware error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication failed due to a server error"
        });
    }
};

// ============================================================
// EXPORT MIDDLEWARE
// ============================================================

module.exports = protect;
