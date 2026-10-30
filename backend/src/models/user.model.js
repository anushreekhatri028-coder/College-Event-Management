
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        // User's full name
        name: {
            type: String,
            required: true,
            trim: true
        },

        // User's email address
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        // Password is optional for Google-only accounts
        // Existing email/password users will continue working
        password: {
            type: String,
            required: false,
            default: null
        },

        // Google account's unique ID
        googleId: {
            type: String,
            unique: true,
            sparse: true,
            default: null
        },

        // Google profile picture
        profilePicture: {
            type: String,
            default: ""
        },

        // User role
        role: {
            type: String,
            enum: [
                "student",
                "organizer",
                "faculty",
                "dean",
                "superadmin"
            ],
            default: "student"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
