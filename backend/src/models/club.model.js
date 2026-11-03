
const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        description: {
            type: String,
            required: true
        },

        category: {
            type: String,
            required: true
        },

        // Current appointed student president
        president: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        // Faculty responsible for this club
        facultyCoordinator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Club", clubSchema);
