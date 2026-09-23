const express = require("express");

const {
    registerForEvent,
    getParticipants,
    cancelRegistration,
    getMyRegistrations,
    getDashboardData
} = require("../controllers/registration.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();

router.post(
    "/events/:eventId/register",
    protect,
    authorize("student"),
    registerForEvent
);

router.get(
    "/events/:eventId/participants",
    protect,
    authorize(
        "organizer",
        "faculty",
        "dean",
        "superadmin"
    ),
    getParticipants
);

router.delete(
    "/events/:eventId/register",
    protect,
    authorize("student"),
    cancelRegistration
);

router.get(
    "/registrations/my",
    protect,
    authorize("student"),
    getMyRegistrations
);

router.get(
    "/dashboard",
    protect,
    authorize("student"),
    getDashboardData
);

router.delete(
    "/event/:eventId",
    protect,
    authorize("student"),
    cancelRegistration
);

module.exports = router;