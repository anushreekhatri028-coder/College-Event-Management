
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: false,
            default: null
        },

        googleId: {
            type: String,
            unique: true,
            sparse: true
        },

        profilePicture: {
            type: String,
            default: ""
        },

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
        },

        // Official ID assigned to faculty members
        facultyId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },

        // ID assigned when a student becomes club president
        presidentId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
