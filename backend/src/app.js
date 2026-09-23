const express = require("express");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const eventRoutes = require("./routes/event.routes");
const registrationRoutes =
    require("./routes/registration.routes");
const clubRoutes = require("./routes/club.routes");
const adminRoutes = require("./routes/admin.routes");
const notificationRoutes =
    require("./routes/notification.routes");
const attendanceRoutes =
    require("./routes/attendance.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const analyticsRoutes = require("./routes/analytics.routes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "College Event Management API is running"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use(
    "/api",
    registrationRoutes
);
app.use("/api/clubs", clubRoutes);
app.use("/api/admin", adminRoutes);
app.use(
    "/api/notifications",
    notificationRoutes
);

app.use(
    "/api/attendance",
    attendanceRoutes
);

app.use("/api/feedback", feedbackRoutes);
app.use("/api/analytics", analyticsRoutes);

module.exports = app;