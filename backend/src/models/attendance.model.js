const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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

        checkInTime: {
            type: Date,
            default: Date.now
        },

        status: {
            type: String,
            enum: ["present"],
            default: "present"
        }
    },
    {
        timestamps: true
    }
);

// One student can check in only once for one event
attendanceSchema.index(
    {
        student: 1,
        event: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model(
    "Attendance",
    attendanceSchema
);