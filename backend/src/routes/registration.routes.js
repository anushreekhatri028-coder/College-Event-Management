const express = require("express");

const {
    registerForEvent,
    getParticipants,
    cancelRegistration
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

module.exports = router;