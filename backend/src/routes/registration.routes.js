const express = require("express");

const {
    registerForEvent,
    getParticipants,
    cancelRegistration,
    getMyRegistrations
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

module.exports = router;