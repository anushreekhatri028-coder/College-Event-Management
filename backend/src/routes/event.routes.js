const express = require("express");

const {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent
} = require("../controllers/event.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();

router.post(
    "/",
    protect,
    authorize("organizer", "faculty", "dean", "superadmin"),
    createEvent
);

router.put(
    "/:id",
    protect,
    authorize("organizer", "faculty", "dean", "superadmin"),
    updateEvent
);

router.delete(
    "/:id",
    protect,
    authorize("organizer", "faculty", "dean", "superadmin"),
    deleteEvent
);

router.get("/", getEvents);

module.exports = router;