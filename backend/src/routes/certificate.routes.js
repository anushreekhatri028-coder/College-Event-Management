
const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");

const {
    generateCertificate,
    getMyCertificates,
    verifyCertificate
} = require("../controllers/certificate.controller");

// PUBLIC: Verify a certificate using its unique ID
router.get(
    "/verify/:certificateId",
    verifyCertificate
);

// STUDENT: Get certificates belonging to the logged-in student
router.get(
    "/my",
    protect,
    authorize("student"),
    getMyCertificates
);

// STUDENT: Generate or download a certificate for an event
router.get(
    "/event/:eventId",
    protect,
    authorize("student"),
    validateObjectId("eventId"),
    generateCertificate
);

module.exports = router;
