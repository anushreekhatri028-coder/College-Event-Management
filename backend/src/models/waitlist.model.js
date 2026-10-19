
const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    status: {
      type: String,
      enum: ["waiting", "promoted", "cancelled"],
      default: "waiting",
    },
  },
  { timestamps: true }
);

// A student can have only one waitlist record per event.
waitlistSchema.index(
  { student: 1, event: 1 },
  { unique: true }
);

module.exports = mongoose.model("Waitlist", waitlistSchema);
