const Notification = require("../models/notification.model");

// GET MY NOTIFICATIONS
const getMyNotifications = async (req, res) => {
    try {

        const notifications = await Notification.find({
            user: req.user.userId
        })
            .sort({
                createdAt: -1
            });

        res.status(200).json({
            totalNotifications: notifications.length,
            notifications
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// GET UNREAD COUNT
const getUnreadCount = async (req, res) => {
    try {

        const unreadCount = await Notification.countDocuments({
            user: req.user.userId,
            isRead: false
        });

        res.status(200).json({
            unreadCount
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// MARK ONE NOTIFICATION AS READ
const markNotificationAsRead = async (req, res) => {
    try {

        const notification =
            await Notification.findOneAndUpdate(
                {
                    _id: req.params.id,
                    user: req.user.userId
                },
                {
                    isRead: true
                },
                {
                    new: true
                }
            );

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.status(200).json({
            message: "Notification marked as read",
            notification
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


module.exports = {
    getMyNotifications,
    getUnreadCount,
    markNotificationAsRead
};