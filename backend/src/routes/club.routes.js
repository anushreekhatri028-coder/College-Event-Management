const express = require("express");

const {
    createClub,
    getClubs
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

module.exports = router