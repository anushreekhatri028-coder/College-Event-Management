const User = require("../models/user.model");
const Event = require("../models/event.model");
const Club = require("../models/club.model");
const Registration = require("../models/registration.model");

const getAdminDashboard = async (req, res) => {
    try {

        // Total students
        const totalStudents = await User.countDocuments({
            role: "student"
        });

        // Total clubs
        const totalClubs = await Club.countDocuments();

        // Total events
        const totalEvents = await Event.countDocuments();

        // Total registrations
        const totalRegistrations = await Registration.countDocuments();

        // Upcoming events
        const upcomingEvents = await Event.countDocuments({
            date: {
                $gte: new Date()
            }
        });

        res.status(200).json({
            totalStudents,
            totalClubs,
            totalEvents,
            totalRegistrations,
            upcomingEvents
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getPopularEvents = async (req, res) => {
    try {

        const popularEvents = await Registration.aggregate([
            {
                $group: {
                    _id: "$event",
                    registrationCount: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    registrationCount: -1
                }
            },
            {
                $limit: 5
            }
        ]);

        const events = await Promise.all(
            popularEvents.map(async (item) => {

                const event = await Event.findById(item._id)
                    .populate("club", "name category");

                return {
                    event,
                    registrationCount: item.registrationCount
                };
            })
        );

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
    getAdminDashboard,
    getPopularEvents
};