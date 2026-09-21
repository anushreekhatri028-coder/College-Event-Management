const Club = require("../models/club.model");
const Event = require("../models/event.model");
const User = require("../models/user.model");

// CREATE CLUB
const createClub = async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            president,
            facultyCoordinator
        } = req.body;

        if (!name || !description || !category || !president) {
            return res.status(400).json({
                message: "Name, description, category and president are required"
            });
        }

        // Check if club already exists
        const existingClub = await Club.findOne({ name });

        if (existingClub) {
            return res.status(400).json({
                message: "Club already exists"
            });
        }

        // Check whether president exists
        const presidentUser = await User.findById(president);

        if (!presidentUser) {
            return res.status(404).json({
                message: "President not found"
            });
        }

        const club = await Club.create({
            name,
            description,
            category,
            president,
            facultyCoordinator
        });

        res.status(201).json({
            message: "Club created successfully",
            club
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// GET ALL CLUBS
const getClubs = async (req, res) => {
    try {

        const clubs = await Club.find()
            .populate(
                "president",
                "name email role"
            )
            .populate(
                "facultyCoordinator",
                "name email role"
            );

        res.status(200).json({
            totalClubs: clubs.length,
            clubs
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// GET CLUB WITH EVENTS
const getClubWithEvents = async (req, res) => {
    try {

        const club = await Club.findById(req.params.id)
            .populate(
                "president",
                "name email role"
            )
            .populate(
                "facultyCoordinator",
                "name email role"
            );

        if (!club) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        const events = await Event.find({
            club: club._id
        })
            .populate(
                "organizer",
                "name email role"
            )
            .sort({
                date: 1
            });

        res.status(200).json({
            club,
            totalEvents: events.length,
            events
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// UPDATE CLUB
const updateClub = async (req, res) => {
    try {

        const club = await Club.findById(req.params.id);

        if (!club) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        // Organizer can update only their own club
        if (
            req.user.role === "organizer" &&
            club.president.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                message: "You can only update your own club"
            });
        }

        const {
            name,
            description,
            category,
            facultyCoordinator
        } = req.body;

        // Check if another club already has this name
        if (name && name !== club.name) {

            const existingClub = await Club.findOne({
                name,
                _id: { $ne: req.params.id }
            });

            if (existingClub) {
                return res.status(400).json({
                    message: "Another club with this name already exists"
                });
            }
        }

        const updatedClub = await Club.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                category,
                facultyCoordinator
            },
            {
                new: true,
                runValidators: true
            }
        )
            .populate(
                "president",
                "name email role"
            )
            .populate(
                "facultyCoordinator",
                "name email role"
            );

        res.status(200).json({
            message: "Club updated successfully",
            club: updatedClub
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// CHANGE CLUB PRESIDENT
const changeClubPresident = async (req, res) => {
    try {

        const {
            president
        } = req.body;

        if (!president) {
            return res.status(400).json({
                message: "President ID is required"
            });
        }

        // Check whether new president exists
        const user = await User.findById(president);

        if (!user) {
            return res.status(404).json({
                message: "President not found"
            });
        }

        const club = await Club.findByIdAndUpdate(
            req.params.id,
            {
                president
            },
            {
                new: true,
                runValidators: true
            }
        )
            .populate(
                "president",
                "name email role"
            )
            .populate(
                "facultyCoordinator",
                "name email role"
            );

        if (!club) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        res.status(200).json({
            message: "Club president changed successfully",
            club
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// DELETE CLUB
const deleteClub = async (req, res) => {
    try {

        const club = await Club.findById(req.params.id);

        if (!club) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        // Delete all events belonging to this club
        await Event.deleteMany({
            club: club._id
        });

        // Delete the club
        await Club.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Club and its events deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


module.exports = {
    createClub,
    getClubs,
    getClubWithEvents,
    updateClub,
    changeClubPresident,
    deleteClub
};