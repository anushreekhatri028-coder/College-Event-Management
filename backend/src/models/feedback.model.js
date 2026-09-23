const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
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

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },

        comment: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// One student can give feedback only once for an event
feedbackSchema.index(
    { student: 1, event: 1 },
    { unique: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);