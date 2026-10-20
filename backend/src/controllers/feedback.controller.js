
const Feedback = require("../models/feedback.model");
const Event = require("../models/event.model");
const Attendance = require("../models/attendance.model");
const Club = require("../models/club.model");

// Helper: check whether an organizer owns the club associated with an event
const checkEventOwnership = async (event, user) => {
    if (user.role !== "organizer") {
        return true;
    }

    if (!event.club) {
        return false;
    }

    const club = await Club.findById(event.club);

    if (!club || !club.president) {
        return false;
    }

    return club.president.toString() === user.userId;
};


// 1. Submit feedback for an event
const submitFeedback = async (req, res) => {
    try {
        const { rating, comment } = req.body || {};
        const studentId = req.user.userId;
        const { eventId } = req.params;

        // Validate rating
        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            return res.status(400).json({
                message: "Rating must be an integer between 1 and 5"
            });
        }

        // Validate comment
        if (
            typeof comment !== "string" ||
            !comment.trim()
        ) {
            return res.status(400).json({
                message: "Comment is required"
            });
        }

        // Check whether the event exists
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Feedback is accepted only for completed events
        if (event.status !== "completed") {
            return res.status(400).json({
                message: "Feedback can only be submitted for completed events"
            });
        }

        // Only students who attended can submit feedback
        const attendance = await Attendance.findOne({
            student: studentId,
            event: eventId,
            status: "present"
        });

        if (!attendance) {
            return res.status(403).json({
                message: "You must attend the event before submitting feedback"
            });
        }

        // Prevent duplicate feedback
        const existingFeedback = await Feedback.findOne({
            student: studentId,
            event: eventId
        });

        if (existingFeedback) {
            return res.status(409).json({
                message: "You have already submitted feedback for this event"
            });
        }

        // Create feedback
        const feedback = await Feedback.create({
            student: studentId,
            event: eventId,
            rating,
            comment: comment.trim()
        });

        return res.status(201).json({
            message: "Feedback submitted successfully",
            feedback
        });

    } catch (error) {
        // Handles duplicate submissions caught by the unique database index
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You have already submitted feedback for this event"
            });
        }

        console.error("Submit feedback error:", error);

        return res.status(500).json({
            message: "Server error while submitting feedback"
        });
    }
};


// 2. Get feedback submitted by the logged-in student
const getMyFeedback = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const feedback = await Feedback.find({
            student: studentId
        })
            .populate("event", "title date venue category status")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: feedback.length,
            feedback
        });

    } catch (error) {
        console.error("Get my feedback error:", error);

        return res.status(500).json({
            message: "Server error while fetching your feedback"
        });
    }
};


// 3. Get all feedback for a particular event
const getEventFeedback = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Organizers can view feedback only for their own club's events
        const hasOwnership = await checkEventOwnership(event, req.user);

        if (!hasOwnership) {
            return res.status(403).json({
                message: "You are not authorized to view feedback for this event"
            });
        }

        const feedback = await Feedback.find({
            event: eventId
        })
            .populate("student", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            event: {
                id: event._id,
                title: event.title
            },
            count: feedback.length,
            feedback
        });

    } catch (error) {
        console.error("Get event feedback error:", error);

        return res.status(500).json({
            message: "Server error while fetching event feedback"
        });
    }
};


// 4. Get feedback summary for an event
const getEventFeedbackSummary = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Organizers can view summaries only for their own club's events
        const hasOwnership = await checkEventOwnership(event, req.user);

        if (!hasOwnership) {
            return res.status(403).json({
                message: "You are not authorized to view this feedback summary"
            });
        }

        const summary = await Feedback.aggregate([
            {
                $match: {
                    event: event._id
                }
            },
            {
                $group: {
                    _id: null,
                    totalFeedback: { $sum: 1 },
                    averageRating: { $avg: "$rating" }
                }
            }
        ]);

        // Count how many feedback entries have each rating (1–5)
        const distribution = await Feedback.aggregate([
            {
                $match: {
                    event: event._id
                }
            },
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 }
                }
            }
        ]);

        const ratingDistribution = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        };

        distribution.forEach((item) => {
            ratingDistribution[item._id] = item.count;
        });

        const result = summary.length > 0
            ? summary[0]
            : {
                totalFeedback: 0,
                averageRating: 0
            };

        return res.status(200).json({
            event: {
                id: event._id,
                title: event.title
            },
            totalFeedback: result.totalFeedback,
            averageRating: Number(
                result.averageRating.toFixed(2)
            ),
            ratingDistribution
        });

    } catch (error) {
        console.error("Get feedback summary error:", error);

        return res.status(500).json({
            message: "Server error while fetching feedback summary"
        });
    }
};


module.exports = {
    submitFeedback,
    getMyFeedback,
    getEventFeedback,
    getEventFeedbackSummary
};
