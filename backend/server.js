const dotenv = require("dotenv");
const app = require("./src/app");
const connectDB = require("./src/db/db");

dotenv.config();

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});