const Event = require("../models/event.model");
const Registration = require("../models/registration.model");
const Attendance = require("../models/attendance.model");
const Feedback = require("../models/feedback.model");

const getEventAnalytics = async (req, res) => {
    try {
        const { eventId } = req.params;

        // Check event
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Count registrations
        const registrationCount = await Registration.countDocuments({
            event: eventId
        });

        // Count attendance
        const attendanceCount = await Attendance.countDocuments({
            event: eventId
        });

        // Get feedback
        const feedback = await Feedback.find({
            event: eventId
        });

        const feedbackCount = feedback.length;

        // Calculate average rating
        let averageRating = 0;

        if (feedbackCount > 0) {
            const totalRating = feedback.reduce(
                (sum, item) => sum + item.rating,
                0
            );

            averageRating = totalRating / feedbackCount;
        }

        // Calculate attendance percentage
        let attendancePercentage = 0;

        if (registrationCount > 0) {
            attendancePercentage =
                (attendanceCount / registrationCount) * 100;
        }

        res.status(200).json({
            event: {
                id: event._id,
                title: event.title,
                date: event.date,
                venue: event.venue
            },

            analytics: {
                totalRegistrations: registrationCount,
                totalAttendance: attendanceCount,
                attendancePercentage:
                    Number(attendancePercentage.toFixed(1)),
                totalFeedback: feedbackCount,
                averageRating:
                    Number(averageRating.toFixed(1))
            }
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    getEventAnalytics
};