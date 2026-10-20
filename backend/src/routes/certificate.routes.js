
const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");

const {
    generateCertificate,
    getMyCertificates
} = require("../controllers/certificate.controller");

// Get certificates belonging to the logged-in student
router.get(
    "/my",
    protect,
    authorize("student"),
    getMyCertificates
);

// Generate or download a certificate for an attended event
router.get(
    "/event/:eventId",
    protect,
    authorize("student"),
    validateObjectId("eventId"),
    generateCertificate
);

module.exports = router;
