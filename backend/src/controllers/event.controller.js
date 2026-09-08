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

module.exports = {
    createEvent,
    getEvents
};