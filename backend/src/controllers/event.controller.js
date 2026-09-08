const Event = require("../models/event.model");

const createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            date,
            venue,
            category,
            capacity
        } = req.body;

        if (
            !title ||
            !description ||
            !date ||
            !venue ||
            !category ||
            !capacity
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const event = await Event.create({
            title,
            description,
            date,
            venue,
            category,
            capacity,
            organizer: req.user.userId
        });

        res.status(201).json({
            message: "Event created successfully",
            event
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .populate("organizer", "name email role");

        res.status(200).json({
            events
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.organizer.toString() !== req.user.userId &&
            !["faculty", "dean", "superadmin"].includes(req.user.role)) {
            return res.status(403).json({
                message: "You are not allowed to update this event"
            });
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            message: "Event updated successfully",
            event: updatedEvent
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.organizer.toString() !== req.user.userId &&
            !["faculty", "dean", "superadmin"].includes(req.user.role)) {
            return res.status(403).json({
                message: "You are not allowed to delete this event"
            });
        }

        await Event.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Event deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent
};