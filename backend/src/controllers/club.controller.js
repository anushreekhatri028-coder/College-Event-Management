const Club = require("../models/club.model");

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

        const existingClub = await Club.findOne({ name });

        if (existingClub) {
            return res.status(400).json({
                message: "Club already exists"
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

const getClubs = async (req, res) => {
    try {
        const clubs = await Club.find()
            .populate("president", "name email role")
            .populate("facultyCoordinator", "name email role");

        res.status(200).json({
            clubs
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    createClub,
    getClubs
};