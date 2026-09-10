const Event = require("../models/event.model");
const Club = require("../models/club.model");

// CREATE EVENT
const createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            date,
            venue,
            category,
            capacity,
            club
        } = req.body;

        // Check required fields
        if (
            !title ||
            !description ||
            !date ||
            !venue ||
            !category ||
            !capacity ||
            !club
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Check if club exists
        const existingClub = await Club.findById(club);

        if (!existingClub) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        // Create event
        const event = await Event.create({
            title,
            description,
            date,
            venue,
            category,
            capacity,
            club,
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


// GET ALL EVENTS
const getEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .populate("organizer", "name email role")
            .populate("club", "name category");

        res.status(200).json({
            events
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// UPDATE EVENT
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Check permission
        if (
            event.organizer.toString() !== req.user.userId &&
            !["faculty", "dean", "superadmin"].includes(req.user.role)
        ) {
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


// DELETE EVENT
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Check permission
        if (
            event.organizer.toString() !== req.user.userId &&
            !["faculty", "dean", "superadmin"].includes(req.user.role)
        ) {
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


// GET EVENTS OF A PARTICULAR CLUB
const getClubEvents = async (req, res) => {
    try {
        const { clubId } = req.params;

        // Check if club exists
        const existingClub = await Club.findById(clubId);

        if (!existingClub) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        const events = await Event.find({
            club: clubId
        })
            .populate("organizer", "name email role")
            .populate("club", "name category");

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
    getEvents,
    updateEvent,
    deleteEvent,
    getClubEvents
};