const Registration = require("../models/registration.model");
const Event = require("../models/event.model");
const Notification =
    require("../models/notification.model");

const registerForEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        // Check if event exists
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }
        if (event.status === "cancelled") {
            return res.status(400).json({
            message: "Registration is closed because this event is cancelled"
            });
        }

        // Check if student already registered
        const existingRegistration = await Registration.findOne({
            student: req.user.userId,
            event: eventId
        });

        if (existingRegistration) {
            return res.status(400).json({
                message: "You are already registered for this event"
            });
        }

        // Count current registrations
        const registrationCount = await Registration.countDocuments({
            event: eventId
        });

        // Check capacity
        if (registrationCount >= event.capacity) {
            return res.status(400).json({
                message: "Event is full"
            });
        }

        // Create registration
        const registration = await Registration.create({
            student: req.user.userId,
            event: eventId
        });

        await Notification.create({
            user: req.user.userId,
            message: `You successfully registered for ${event.title}`,
            type: "registration"
        });

        res.status(201).json({
            message: "Registered successfully",
            registration
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getParticipants = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const registrations =
            await Registration.find({
                event: eventId
            }).populate(
                "student",
                "name email"
            );

        res.status(200).json({
            event: event.title,
            totalParticipants: registrations.length,
            participants: registrations
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const cancelRegistration = async (req, res) => {
    try {
        const { eventId } = req.params;

        const registration = await Registration.findOne({
            student: req.user.userId,
            event: eventId
        });

        if (!registration) {
            return res.status(404).json({
                message: "Registration not found"
            });
        }

        await Registration.findByIdAndDelete(
            registration._id
        );

        res.status(200).json({
            message: "Registration cancelled successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
const getMyRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({
            student: req.user.userId
        })
            .populate(
                "event",
                "title description date venue category capacity club"
            )
            .populate({
                path: "event",
                populate: {
                    path: "club",
                    select: "name category"
                }
            });

        res.status(200).json({
            totalRegistrations: registrations.length,
            registrations
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getDashboardData = async (req, res) => {
    try {
        const registrations = await Registration.find({
            student: req.user.userId
        })
            .populate({
                path: "event",
                populate: {
                    path: "club",
                    select: "name category"
                }
            })
            .sort({ createdAt: -1 });

        const upcomingRegistrations = registrations.filter(
            (registration) =>
                registration.event &&
                new Date(registration.event.date) >= new Date()
        );

        res.status(200).json({
            totalRegistrations: registrations.length,
            upcomingRegistrations: upcomingRegistrations.length,
            registrations
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
module.exports = {
    registerForEvent,
    getParticipants,
    cancelRegistration,
    getMyRegistrations,
    getDashboardData
};