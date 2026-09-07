const express = require("express");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();

router.get(
    "/profile",
    protect,
    (req, res) => {
        res.json({
            message: "This is a protected route",
            user: req.user
        });
    }
);

router.get(
    "/student-only",
    protect,
    authorize("student"),
    (req, res) => {
        res.json({
            message: "Welcome student"
        });
    }
);

module.exports = router;