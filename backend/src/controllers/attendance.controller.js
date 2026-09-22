const Attendance = require("../models/attendance.model");
const Registration = require("../models/registration.model");
const Event = require("../models/event.model");

const checkIn = async (req, res) => {
    try {

        const { eventId } = req.params;

        // Check event
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Event must be approved
        if (event.approvalStatus !== "approved") {
            return res.status(400).json({
                message: "This event is not approved"
            });
        }

        // Check whether student registered
        const registration = await Registration.findOne({
            student: req.user.userId,
            event: eventId
        });

        if (!registration) {
            return res.status(400).json({
                message: "You are not registered for this event"
            });
        }

        // Check duplicate attendance
        const existingAttendance =
            await Attendance.findOne({
                student: req.user.userId,
                event: eventId
            });

        if (existingAttendance) {
            return res.status(400).json({
                message: "Attendance already marked"
            });
        }

        // Create attendance
        const attendance = await Attendance.create({
            student: req.user.userId,
            event: eventId,
            checkInTime: new Date(),
            status: "present"
        });

        res.status(201).json({
            message: "Attendance marked successfully",
            attendance
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getEventAttendance = async (req, res) => {
    try {

        const { eventId } = req.params;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const attendance = await Attendance.find({
            event: eventId
        })
            .populate(
                "student",
                "name email role"
            )
            .sort({
                checkInTime: 1
            });

        res.status(200).json({
            event: {
                id: event._id,
                title: event.title
            },
            totalAttendance: attendance.length,
            attendance
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getAttendanceCount = async (req, res) => {
    try {

        const { eventId } = req.params;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const attendanceCount =
            await Attendance.countDocuments({
                event: eventId
            });

        const registrationCount =
            await Registration.countDocuments({
                event: eventId
            });

        res.status(200).json({
            eventId,
            registrationCount,
            attendanceCount
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getMyAttendance = async (req, res) => {
    try {

        const attendance = await Attendance.find({
            student: req.user.userId
        })
            .populate(
                "event",
                "title date venue category"
            )
            .sort({
                checkInTime: -1
            });

        res.status(200).json({
            totalAttendance: attendance.length,
            attendance
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    checkIn,
    getEventAttendance,
    getAttendanceCount,
    getMyAttendance
};