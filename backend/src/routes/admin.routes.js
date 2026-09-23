const express = require("express");

const router = express.Router();

const {
    getAdminDashboard,
    getPopularEvents
} = require("../controllers/admin.controller");
const protect  = require("../middleware/auth.middleware");
const authorize  = require("../middleware/role.middleware");

router.get(
    "/dashboard",
    protect,
    authorize("faculty", "dean", "superadmin"),
    getAdminDashboard
);

router.get(
    "/popular-events",
    protect,
    authorize("faculty", "dean", "superadmin"),
    getPopularEvents
);

module.exports = router;