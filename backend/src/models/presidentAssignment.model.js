
const mongoose = require("mongoose");

const presidentAssignmentSchema = new mongoose.Schema(
    {
        // Student who was appointed as president
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Club for which the student was appointed
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            required: true
        },

        // Faculty member who made the appointment
        appointedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Unique ID assigned to this president
        presidentId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        // Whether this appointment is currently active
        status: {
            type: String,
            enum: ["active", "removed"],
            default: "active"
        },

        appointedAt: {
            type: Date,
            default: Date.now
        },

        removedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// A student cannot have two active club-president appointments.
presidentAssignmentSchema.index(
    { student: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "active" }
    }
);

// A club can have only one active president.
presidentAssignmentSchema.index(
    { club: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "active" }
    }
);

module.exports = mongoose.model(
    "PresidentAssignment",
    presidentAssignmentSchema
);
