const express = require("express");

const {
    submitFeedback,
    getEventFeedback,
    getMyFeedback
} = require("../controllers/feedback.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();

// Student submits feedback
router.post(
    "/event/:eventId",
    protect,
    authorize("student"),
    submitFeedback
);

// Student views own feedback
router.get(
    "/my",
    protect,
    authorize("student"),
    getMyFeedback
);

// Admin/organizer views event feedback
router.get(
    "/event/:eventId",
    protect,
    authorize(
        "organizer",
        "faculty",
        "dean",
        "superadmin"
    ),
    getEventFeedback
);

module.exports = router;