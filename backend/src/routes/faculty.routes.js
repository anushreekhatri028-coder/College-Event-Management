
const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const {
    createClub,
    getMyClubs,
    appointPresident,
    removePresident,
    getPresidentHistory
} = require("../controllers/faculty.controller");

// Every faculty route requires authentication and faculty role.
router.use(protect);
router.use(authorize("faculty"));
// Create a club.
router.post("/clubs", createClub);
// Get clubs assigned to logged-in faculty.
router.get("/clubs", getMyClubs);

// Appoint a new president or replace the current one.
router.post(
    "/clubs/:clubId/appoint-president",
    appointPresident
);

// Remove the current president.
router.delete(
    "/clubs/:clubId/remove-president",
    removePresident
);

// View appointment history for a club.
router.get(
    "/clubs/:clubId/president-history",
    getPresidentHistory
);

module.exports = router;
