const express = require("express");

const {
    createClub,
    getClubs,
    getClubWithEvents
} = require("../controllers/club.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();

router.post(
    "/",
    protect,
    authorize("faculty", "dean", "superadmin"),
    createClub
);

router.get("/", getClubs);
router.get("/:id", getClubWithEvents);

module.exports = router