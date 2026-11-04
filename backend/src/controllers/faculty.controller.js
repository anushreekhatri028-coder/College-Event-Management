
const mongoose = require("mongoose");

const User = require("../models/user.model");
const Club = require("../models/club.model");
const PresidentAssignment = require("../models/presidentAssignment.model");

// --------------------------------------------------
// Helper: Check whether an ID is a valid MongoDB ID
// --------------------------------------------------
const isValidId = (id) => mongoose.isValidObjectId(id);

// --------------------------------------------------
// Helper: Check whether faculty owns this club
// --------------------------------------------------
const findFacultyClub = async (clubId, facultyId) => {
    return await Club.findOne({
        _id: clubId,
        facultyCoordinator: facultyId
    });
};

// --------------------------------------------------
// 1. GET ALL CLUBS ASSIGNED TO LOGGED-IN FACULTY
// GET /api/faculty/clubs
// --------------------------------------------------
const getMyClubs = async (req, res) => {
    try {
        const facultyId = req.user.userId;

        const clubs = await Club.find({
            facultyCoordinator: facultyId
        })
            .populate("president", "name email presidentId role")
            .sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: clubs.length,
            clubs
        });

    } catch (error) {
        console.error("Get faculty clubs error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch assigned clubs"
        });
    }
};

// --------------------------------------------------
// 2. APPOINT OR REPLACE CLUB PRESIDENT
// POST /api/faculty/clubs/:clubId/appoint-president
//
// Request body:
// {
//   "studentId": "MongoDB student user ID"
// }
// --------------------------------------------------
const appointPresident = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { clubId } = req.params;
        const { studentId } = req.body;
        const facultyId = req.user.userId;

        if (!isValidId(clubId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid club ID"
            });
        }

        if (!studentId || !isValidId(studentId)) {
            return res.status(400).json({
                success: false,
                message: "A valid studentId is required"
            });
        }

        const club = await findFacultyClub(clubId, facultyId);

        if (!club) {
            return res.status(403).json({
                success: false,
                message: "You are not the faculty coordinator of this club"
            });
        }

        const student = await User.findById(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student account not found"
            });
        }

        if (student.role !== "student") {
            return res.status(400).json({
                success: false,
                message: "Only a student can be appointed as president"
            });
        }

        // Do not allow students with an existing active appointment.
        const existingStudentAssignment =
            await PresidentAssignment.findOne({
                student: studentId,
                status: "active"
            });

        if (existingStudentAssignment) {
            return res.status(409).json({
                success: false,
                message: "This student already has an active president appointment"
            });
        }

        // Generate a unique President ID.
        // Example: PRES-2026-483921
        const year = new Date().getFullYear();
        const randomNumber = Math.floor(
            100000 + Math.random() * 900000
        );

        const newPresidentId = `PRES-${year}-${randomNumber}`;

        await session.startTransaction();

        // Find the current active president of this club.
        const currentAssignment = await PresidentAssignment.findOne({
            club: clubId,
            status: "active"
        }).session(session);

        // If a president already exists, remove their active appointment.
        if (currentAssignment) {
            currentAssignment.status = "removed";
            currentAssignment.removedAt = new Date();

            await currentAssignment.save({ session });

            // Restore the previous president's student privileges.
            await User.updateOne(
                {
                    _id: currentAssignment.student,
                    presidentId: currentAssignment.presidentId
                },
                {
                    $set: {
                        role: "student",
                        presidentId: null
                    }
                },
                { session }
            );
        }

        // Create the new appointment record.
        const assignment = new PresidentAssignment({
            student: studentId,
            club: clubId,
            appointedBy: facultyId,
            presidentId: newPresidentId,
            status: "active",
            appointedAt: new Date()
        });

        await assignment.save({ session });

        // Update the student's role and official President ID.
        await User.updateOne(
            { _id: studentId },
            {
                $set: {
                    role: "organizer",
                    presidentId: newPresidentId
                }
            },
            { session }
        );

        // Update the club's current president.
        await Club.updateOne(
            { _id: clubId },
            {
                $set: {
                    president: studentId
                }
            },
            { session }
        );

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: currentAssignment
                ? "Club president replaced successfully"
                : "Club president appointed successfully",
            president: {
                studentId: student._id,
                name: student.name,
                email: student.email,
                presidentId: newPresidentId,
                role: "organizer"
            }
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        console.error("Appoint president error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A duplicate appointment or President ID was detected. Please try again."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to appoint club president"
        });

    } finally {
        await session.endSession();
    }
};

// --------------------------------------------------
// 3. REMOVE CURRENT CLUB PRESIDENT
// DELETE /api/faculty/clubs/:clubId/remove-president
// --------------------------------------------------
const removePresident = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { clubId } = req.params;
        const facultyId = req.user.userId;

        if (!isValidId(clubId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid club ID"
            });
        }

        const club = await findFacultyClub(clubId, facultyId);

        if (!club) {
            return res.status(403).json({
                success: false,
                message: "You are not the faculty coordinator of this club"
            });
        }

        await session.startTransaction();

        const assignment = await PresidentAssignment.findOne({
            club: clubId,
            status: "active"
        }).session(session);

        if (!assignment) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "This club does not have an active president"
            });
        }

        // Mark appointment as removed, retaining its history.
        assignment.status = "removed";
        assignment.removedAt = new Date();

        await assignment.save({ session });

        // Restore the previous president's student role.
        await User.updateOne(
            {
                _id: assignment.student,
                presidentId: assignment.presidentId
            },
            {
                $set: {
                    role: "student",
                    presidentId: null
                }
            },
            { session }
        );

        // Remove the current president from the club.
        await Club.updateOne(
            {
                _id: clubId,
                president: assignment.student
            },
            {
                $set: {
                    president: null
                }
            },
            { session }
        );

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "President removed successfully. Student privileges have been restored.",
            removedPresident: {
                studentId: assignment.student,
                presidentId: assignment.presidentId,
                removedAt: assignment.removedAt
            }
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        console.error("Remove president error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to remove club president"
        });

    } finally {
        await session.endSession();
    }
};

// --------------------------------------------------
// 4. GET PRESIDENT APPOINTMENT HISTORY FOR A CLUB
// GET /api/faculty/clubs/:clubId/president-history
// --------------------------------------------------
const getPresidentHistory = async (req, res) => {
    try {
        const { clubId } = req.params;
        const facultyId = req.user.userId;

        if (!isValidId(clubId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid club ID"
            });
        }

        const club = await findFacultyClub(clubId, facultyId);

        if (!club) {
            return res.status(403).json({
                success: false,
                message: "You are not the faculty coordinator of this club"
            });
        }

        const history = await PresidentAssignment.find({
            club: clubId
        })
            .populate("student", "name email")
            .populate("appointedBy", "name email facultyId")
            .sort({ appointedAt: -1 });

        return res.status(200).json({
            success: true,
            club: {
                id: club._id,
                name: club.name
            },
            count: history.length,
            history
        });

    } catch (error) {
        console.error("President history error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch president appointment history"
        });
    }
};

module.exports = {
    getMyClubs,
    appointPresident,
    removePresident,
    getPresidentHistory
};
