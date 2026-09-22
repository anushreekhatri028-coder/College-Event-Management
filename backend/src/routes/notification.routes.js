const express = require("express");

const {
    getMyNotifications,
    getUnreadCount,
    markNotificationAsRead
} = require("../controllers/notification.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();


// Get my notifications
router.get(
    "/",
    protect,
    getMyNotifications
);


// Get unread notification count
router.get(
    "/unread-count",
    protect,
    getUnreadCount
);


// Mark notification as read
router.patch(
    "/:id/read",
    protect,
    markNotificationAsRead
);


module.exports = router;