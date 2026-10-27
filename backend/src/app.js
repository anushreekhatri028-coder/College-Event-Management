
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const eventRoutes = require("./routes/event.routes");
const registrationRoutes = require("./routes/registration.routes");
const clubRoutes = require("./routes/club.routes");
const adminRoutes = require("./routes/admin.routes");
const notificationRoutes = require("./routes/notification.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const waitlistRoutes = require("./routes/waitlist.routes");
const certificateRoutes = require("./routes/certificate.routes");

const app = express();

// Allow requests from your local frontend (Live Server)
app.use(
    cors({
        origin: [
            "http://127.0.0.1:5500",
            "http://localhost:5500"
        ],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

// Parse incoming JSON requests
app.use(express.json());

// API health check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "College Event Management API is running"
    });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// User routes
app.use("/api/users", userRoutes);

// Event routes
app.use("/api/events", eventRoutes);

// Event registration routes
app.use("/api", registrationRoutes);

// Waitlist routes
app.use("/api/waitlist", waitlistRoutes);

// Club routes
app.use("/api/clubs", clubRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// Notification routes
app.use("/api/notifications", notificationRoutes);

// Attendance routes
app.use("/api/attendance", attendanceRoutes);

// Certificate routes
app.use("/api/certificates", certificateRoutes);

// Feedback routes
app.use("/api/feedback", feedbackRoutes);

// Analytics routes
app.use("/api/analytics", analyticsRoutes);

module.exports = app;
