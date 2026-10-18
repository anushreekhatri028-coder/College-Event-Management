
const dotenv = require("dotenv");
dotenv.config();

const app = require("./src/app");
const connectDB = require("./src/db/db");
const {
  startEventStatusJob,
} = require("./src/services/eventStatus.service");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Start the automatic event status scheduler
    startEventStatusJob();

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
