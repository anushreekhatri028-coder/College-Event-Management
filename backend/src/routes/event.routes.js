const express = require("express");

const {
    createEvent,
    getEvents
} = require("../controllers/event.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, createEvent);

router.get("/", getEvents);

module.exports = router;