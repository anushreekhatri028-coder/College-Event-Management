const Feedback = require("../models/feedback.model");
const Event = require("../models/event.model");
const Attendance = require("../models/attendance.model");

const submitFeedback = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating, comment } = req.body;

        if (!rating || !comment) {
            return res.status(400).json({
                message: "Rating and comment are required"
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5"
            });
        }

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Check whether student attended
        const attendance = await Attendance.findOne({
            student: req.user.userId,
            event: eventId
        });

        if (!attendance) {
            return res.status(403).json({
                message: "You can give feedback only after attending the event"
            });
        }

        // Check duplicate feedback
        const existingFeedback = await Feedback.findOne({
            student: req.user.userId,
            event: eventId
        });

        if (existingFeedback) {
            return res.status(400).json({
                message: "You have already submitted feedback"
            });
        }

        const feedback = await Feedback.create({
            student: req.user.userId,
            event: eventId,
            rating,
            comment
        });

        res.status(201).json({
            message: "Feedback submitted successfully",
            feedback
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getEventFeedback = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const feedback = await Feedback.find({
            event: eventId
        })
            .populate("student", "name email")
            .sort({ createdAt: -1 });

        const totalFeedback = feedback.length;

        let averageRating = 0;

        if (totalFeedback > 0) {
            const totalRating = feedback.reduce(
                (sum, item) => sum + item.rating,
                0
            );

            averageRating = totalRating / totalFeedback;
        }

        res.status(200).json({
            event: {
                id: event._id,
                title: event.title
            },
            totalFeedback,
            averageRating: Number(averageRating.toFixed(1)),
            feedback
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getMyFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find({
            student: req.user.userId
        })
            .populate("event", "title date venue")
            .sort({ createdAt: -1 });

        res.status(200).json({
            totalFeedback: feedback.length,
            feedback
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    submitFeedback,
    getEventFeedback,
    getMyFeedback
};