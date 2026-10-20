
const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },

        certificateId: {
            type: String,
            required: true,
            unique: true
        },

        issuedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// A student can receive only one certificate per event.
certificateSchema.index(
    { student: 1, event: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "Certificate",
    certificateSchema
);
