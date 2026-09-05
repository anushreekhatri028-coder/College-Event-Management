const express = require("express");

const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "College Event Management API is running"
    });
});

app.use("/api/auth", authRoutes);

module.exports = app;