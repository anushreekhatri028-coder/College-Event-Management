
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

// ============================================================
// AUTHENTICATION
// ============================================================

// All event routes require a valid login.
router.use(protect);


// ============================================================
// CREATE EVENT
// ============================================================

// Only the current appointed president can create an event.
// The controller also verifies that the president belongs to the club.
router.post(
    "/",
    authorize("organizer"),
    createEvent
);


// ============================================================
// GET PENDING EVENTS
// ============================================================

// Faculty can see pending events only for clubs they coordinate.
// Dean and superadmin can see all pending events.
router.get(
    "/pending",
    authorize("faculty", "dean", "superadmin"),
    getPendingEvents
);


// ============================================================
// GET UPCOMING EVENTS
// ============================================================

router.get(
    "/upcoming",
    getUpcomingEvents
);


// ============================================================
// SEARCH EVENTS
// ============================================================

router.get(
    "/search",
    searchEvents
);


// ============================================================
// GET EVENTS FOR A PARTICULAR CLUB
// ============================================================

router.get(
    "/club/:clubId",
    validateObjectId("clubId"),
    getClubEvents
);


// ============================================================
// APPROVE EVENT
// ============================================================

// Only faculty coordinators, dean and superadmin can approve.
// The controller verifies that faculty coordinates this club.
router.patch(
    "/:id/approve",
    authorize("faculty", "dean", "superadmin"),
    validateObjectId("id"),
    approveEvent
);


// ============================================================
// REJECT EVENT
// ============================================================

router.patch(
    "/:id/reject",
    authorize("faculty", "dean", "superadmin"),
    validateObjectId("id"),
    rejectEvent
);


// ============================================================
// CANCEL EVENT
// ============================================================

// The controller checks club ownership/coordination permissions.
router.patch(
    "/:id/cancel",
    authorize("organizer", "faculty", "dean", "superadmin"),
    validateObjectId("id"),
    cancelEvent
);


// ============================================================
// GET A SINGLE EVENT
// ============================================================

router.get(
    "/:id",
    validateObjectId("id"),
    getEventById
);


// ============================================================
// UPDATE EVENT
// ============================================================

router.put(
    "/:id",
    authorize("organizer", "faculty", "dean", "superadmin"),
    validateObjectId("id"),
    updateEvent
);


// ============================================================
// DELETE EVENT
// ============================================================

router.delete(
    "/:id",
    authorize("organizer", "faculty", "dean", "superadmin"),
    validateObjectId("id"),
    deleteEvent
);


// ============================================================
// GET ALL EVENTS
// ============================================================

router.get(
    "/",
    getEvents
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
