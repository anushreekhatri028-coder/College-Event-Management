
const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");

const {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent,
    getClubEvents,
    searchEvents,
    getUpcomingEvents,
    getEventById,
    approveEvent,
    rejectEvent,
    getPendingEvents,
    cancelEvent
} = require("../controllers/event.controller");


// CREATE EVENT
router.post(
    "/",
    protect,
    authorize("organizer", "faculty", "dean", "superadmin"),
    createEvent
);


// GET PENDING EVENTS
// Keep this before /:id
router.get(
    "/pending",
    protect,
    authorize("faculty", "dean", "superadmin"),
    getPendingEvents
);


// GET UPCOMING EVENTS
router.get(
    "/upcoming",
    protect,
    getUpcomingEvents
);


// SEARCH EVENTS
router.get(
    "/search",
    protect,
    searchEvents
);


// GET EVENTS FOR A PARTICULAR CLUB
router.get(
    "/club/:clubId",
    protect,
    validateObjectId("clubId"),
    getClubEvents
);


// APPROVE EVENT
router.patch(
    "/:id/approve",
    protect,
    authorize("faculty", "dean", "superadmin"),
    validateObjectId("id"),
    approveEvent
);


// REJECT EVENT
router.patch(
    "/:id/reject",
    protect,
    authorize("faculty", "dean", "superadmin"),
    validateObjectId("id"),
    rejectEvent
);


// CANCEL EVENT
router.patch(
    "/:id/cancel",
    protect,
    authorize("organizer", "faculty", "dean", "superadmin"),
    validateObjectId("id"),
    cancelEvent
);


// GET A SINGLE EVENT
router.get(
    "/:id",
    protect,
    validateObjectId("id"),
    getEventById
);


// UPDATE EVENT
router.put(
    "/:id",
    protect,
    authorize("organizer", "faculty", "dean", "superadmin"),
    validateObjectId("id"),
    updateEvent
);


// DELETE EVENT
router.delete(
    "/:id",
    protect,
    authorize("organizer", "faculty", "dean", "superadmin"),
    validateObjectId("id"),
    deleteEvent
);


// GET ALL EVENTS
router.get(
    "/",
    protect,
    getEvents
);


module.exports = router;
