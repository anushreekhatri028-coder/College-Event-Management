const express = require("express");

const {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent,
    getClubEvents,
    searchEvents,
    getUpcomingEvents,
    getEventById
} = require("../controllers/event.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const {
    approveEvent,
    rejectEvent
} = require("../controllers/event.controller");

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
router.get("/upcoming", getUpcomingEvents);
router.get("/search", searchEvents);
router.get("/club/:clubId", getClubEvents);

router.get(
    "/pending",
    protect,
    authorize("faculty", "dean", "superadmin"),
    getPendingEvents
);

router.patch(
    "/:id/approve",
    protect,
    authorize("faculty", "dean", "superadmin"),
    approveEvent
);

router.patch(
    "/:id/reject",
    protect,
    authorize("faculty", "dean", "superadmin"),
    rejectEvent
);


router.get("/:id", getEventById);



module.exports = router;