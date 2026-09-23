const express = require("express");

const {
    getEventAnalytics
} = require("../controllers/analytics.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();

router.get(
    "/event/:eventId",
    protect,
    authorize(
        "organizer",
        "faculty",
        "dean",
        "superadmin"
    ),
    getEventAnalytics
);

module.exports = router;