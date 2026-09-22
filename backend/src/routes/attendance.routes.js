const express = require("express");

const {
    checkIn,
    getEventAttendance,
    getAttendanceCount,
    getMyAttendance
} = require("../controllers/attendance.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();


// Student checks in
router.post(
    "/event/:eventId/check-in",
    protect,
    authorize("student"),
    checkIn
);


// Student sees their attendance
router.get(
    "/my",
    protect,
    authorize("student"),
    getMyAttendance
);


// Faculty/Organizer sees event attendance
router.get(
    "/event/:eventId",
    protect,
    authorize(
        "organizer",
        "faculty",
        "dean",
        "superadmin"
    ),
    getEventAttendance
);


// Attendance statistics
router.get(
    "/event/:eventId/count",
    protect,
    authorize(
        "organizer",
        "faculty",
        "dean",
        "superadmin"
    ),
    getAttendanceCount
);


module.exports = router;