
const cron = require("node-cron");
const Event = require("../models/event.model");

const startEventStatusJob = () => {
  // Run every day at 12:05 AM
  cron.schedule("5 0 * * *", async () => {
    try {
      const now = new Date();

      const result = await Event.updateMany(
        {
          date: { $lt: now },
          status: "scheduled",
          approvalStatus: "approved",
        },
        {
          $set: { status: "completed" },
        }
      );

      console.log(
        `Event status job completed. Updated ${result.modifiedCount} events.`
      );
    } catch (error) {
      console.error("Event status job failed:", error.message);
    }
  });

  console.log("Event status job scheduled.");
};

module.exports = { startEventStatusJob };
