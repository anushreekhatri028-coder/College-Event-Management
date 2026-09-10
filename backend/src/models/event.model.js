const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true
        },

        date: {
            type: Date,
            required: true
        },

        venue: {
            type: String,
            required: true
        },

        category: {
            type: String,
            required: true
        },

        capacity: {
            type: Number,
            required: true
        },

        organizer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            required: true
}
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Event", eventSchema);