const crypto = require("crypto");
const QRCode = require("qrcode");

const Event = require("../models/event.model");
const Registration = require("../models/registration.model");
const Attendance = require("../models/attendance.model");
const Club = require("../models/club.model");

const checkIn = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { token } = req.body;

        if (!token || typeof token !== "string") {
            return res.status(400).json({
                message: "QR token is required"
            });
        }

        const event = await Event.findById(eventId)
            .select("+attendanceQrTokenHash +attendanceQrExpiresAt");

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.approvalStatus !== "approved") {
            return res.status(400).json({
                message: "This event is not approved"
            });
        }

        if (event.status !== "scheduled") {
            return res.status(400).json({
                message: "Attendance is unavailable for this event"
            });
        }

        if (
            !event.attendanceQrTokenHash ||
            !event.attendanceQrExpiresAt
        ) {
            return res.status(400).json({
                message: "No active QR code exists for this event"
            });
        }

        if (event.attendanceQrExpiresAt.getTime() <= Date.now()) {
            return res.status(400).json({
                message: "QR code has expired. Ask the organizer to generate a new one."
            });
        }

        // Hash the submitted token before comparing it with the stored hash.
        const submittedHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const submittedBuffer = Buffer.from(submittedHash, "hex");
        const storedBuffer = Buffer.from(
            event.attendanceQrTokenHash,
            "hex"
        );

        if (
            submittedBuffer.length !== storedBuffer.length ||
            !crypto.timingSafeEqual(submittedBuffer, storedBuffer)
        ) {
            return res.status(401).json({
                message: "Invalid QR token"
            });
        }

        // Check whether the student registered for this event.
        const registration = await Registration.findOne({
            student: req.user.userId,
            event: eventId
        });

        if (!registration) {
            return res.status(403).json({
                message: "You must register for this event before checking in"
            });
        }

        // Prevent duplicate attendance.
        const existingAttendance = await Attendance.findOne({
            student: req.user.userId,
            event: eventId
        });

        if (existingAttendance) {
            return res.status(409).json({
                message: "You have already checked in for this event"
            });
        }

        const attendance = await Attendance.create({
            student: req.user.userId,
            event: eventId,
            checkInTime: new Date(),
            status: "present"
        });

        return res.status(201).json({
            message: "Attendance marked successfully",
            attendance
        });

    } catch (error) {
        // Handles a duplicate insert if two requests arrive simultaneously.
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You have already checked in for this event"
            });
        }

        console.error("Check-in error:", error.message);

        return res.status(500).json({
            message: "Failed to mark attendance"
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

const generateEventQR = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.approvalStatus !== "approved") {
            return res.status(400).json({
                message: "QR code can only be generated for approved events"
            });
        }

        if (event.status !== "scheduled") {
            return res.status(400).json({
                message: "QR code is available only for scheduled events"
            });
        }

        // Organizers can generate QR codes only for their own clubs' events.
        if (req.user.role === "organizer") {
            const club = await Club.findById(event.club);

            if (!club) {
                return res.status(404).json({
                    message: "Event club not found"
                });
            }

            if (club.president.toString() !== req.user.userId) {
                return res.status(403).json({
                    message: "You can generate QR codes only for your own club's events"
                });
            }
        }

        // Generate a cryptographically secure random token.
        const token = crypto.randomBytes(32).toString("hex");

        // Store only the token hash in the database.
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Token remains valid for 10 minutes.
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        event.attendanceQrTokenHash = tokenHash;
        event.attendanceQrExpiresAt = expiresAt;

        await event.save();

        // The QR code contains the event ID and secret token.
        const qrPayload = JSON.stringify({
            eventId: event._id.toString(),
            token
        });

        const qrCodeDataURL = await QRCode.toDataURL(qrPayload);

        return res.status(200).json({
            message: "Attendance QR code generated successfully",
            eventId: event._id,
            expiresAt,
            qrCode: qrCodeDataURL
        });

    } catch (error) {
        console.error("Generate QR error:", error.message);

        return res.status(500).json({
            message: "Failed to generate attendance QR code"
        });
    }
};

module.exports = {
    checkIn,
    getEventAttendance,
    getAttendanceCount,
    getMyAttendance,
    generateEventQR
};