const express = require("express");

const {
    createClub,
    getClubs,
    getClubWithEvents,
    updateClub,
    changeClubPresident,
    deleteClub
} = require("../controllers/club.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();


// CREATE CLUB
// Faculty, Dean and Superadmin can create clubs
router.post(
    "/",
    protect,
    authorize("faculty", "dean", "superadmin"),
    createClub
);


// GET ALL CLUBS
// Any logged-in user can view clubs
router.get(
    "/",
    protect,
    getClubs
);


// GET CLUB WITH EVENTS
// Any logged-in user can view a club and its events
router.get(
    "/:id",
    protect,
    getClubWithEvents
);


// UPDATE CLUB
// Organizer can update their own club
// Faculty, Dean and Superadmin can update clubs
router.put(
    "/:id",
    protect,
    authorize("organizer", "faculty", "dean", "superadmin"),
    updateClub
);


// CHANGE CLUB PRESIDENT
// Only Faculty, Dean and Superadmin can change president
router.patch(
    "/:id/president",
    protect,
    authorize("faculty", "dean", "superadmin"),
    changeClubPresident
);


// DELETE CLUB
// Only Faculty, Dean and Superadmin can delete clubs
router.delete(
    "/:id",
    protect,
    authorize("faculty", "dean", "superadmin"),
    deleteClub
);


module.exports = router;