
const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const {
  joinWaitlist,
  getMyWaitlist,
  getEventWaitlist,
  leaveWaitlist,
} = require("../controllers/waitlist.controller");

// Student endpoints
router.post(
  "/event/:eventId",
  protect,
  authorize("student"),
  joinWaitlist
);

router.get(
  "/my",
  protect,
  authorize("student"),
  getMyWaitlist
);

router.delete(
  "/event/:eventId",
  protect,
  authorize("student"),
  leaveWaitlist
);

// Authorized event management roles
router.get(
  "/event/:eventId",
  protect,
  authorize("organizer", "faculty", "dean", "superadmin"),
  getEventWaitlist
);

module.exports = router;
