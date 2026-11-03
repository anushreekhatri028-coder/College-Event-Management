const mongoose = require("mongoose");

const Event = require("../models/event.model");
const Club = require("../models/club.model");
const Notification = require("../models/notification.model");

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Get the logged-in user's MongoDB ID.
// Supports both the old JWT format (userId) and DB user format (_id).
const getUserId = (req) => {
    return String(req.user?.userId || req.user?._id || "");
};

// Compare MongoDB IDs safely.
const isSameId = (id1, id2) => {
    if (!id1 || !id2) return false;

    return String(id1) === String(id2);
};

// Check whether the logged-in user is a dean or superadmin.
const isGlobalAdmin = (req) => {
    return ["dean", "superadmin"].includes(req.user?.role);
};

// Check whether the logged-in faculty member coordinates this club.
const isClubFacultyCoordinator = (req, club) => {
    return (
        req.user?.role === "faculty" &&
        isSameId(club?.facultyCoordinator, getUserId(req))
    );
};

// Check whether the logged-in organizer is the currently appointed
// president of this club.
const isCurrentClubPresident = (req, club) => {
    return (
        req.user?.role === "organizer" &&
        isSameId(club?.president, getUserId(req))
    );
};

// Check whether the user can manage a particular club.
const canManageClub = (req, club) => {
    if (isGlobalAdmin(req)) return true;

    if (isClubFacultyCoordinator(req, club)) return true;

    if (isCurrentClubPresident(req, club)) return true;

    return false;
};

// Check whether the user can review/approve/reject an event.
// Only faculty coordinators, deans and superadmins can review events.
const canReviewClub = (req, club) => {
    if (isGlobalAdmin(req)) return true;

    return isClubFacultyCoordinator(req, club);
};

// Escape special characters in user-provided search text.
const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Get the clubs accessible to the current user.
//
// Students: no club restriction here; they are restricted to approved events.
// Organizers: only clubs where they are the current president.
// Faculty: only clubs where they are the faculty coordinator.
// Dean/superadmin: all clubs.
const getAccessibleClubIds = async (req) => {
    const role = req.user?.role;
    const userId = getUserId(req);

    if (isGlobalAdmin(req)) {
        return null; // null means no club restriction.
    }

    if (role === "student") {
        return null;
    }

    if (!mongoose.isValidObjectId(userId)) {
        return [];
    }

    if (role === "organizer") {
        const clubs = await Club.find({
            president: userId
        }).select("_id");

        return clubs.map((club) => club._id);
    }

    if (role === "faculty") {
        const clubs = await Club.find({
            facultyCoordinator: userId
        }).select("_id");

        return clubs.map((club) => club._id);
    }

    return [];
};

// Apply visibility restrictions to an event query.
const applyEventVisibility = async (req, filter) => {
    // Students can see approved events only.
    if (req.user?.role === "student") {
        filter.approvalStatus = "approved";
        return filter;
    }

    // Dean and superadmin can access all events.
    if (isGlobalAdmin(req)) {
        return filter;
    }

    // Faculty and current presidents can access only their clubs.
    const accessibleClubIds = await getAccessibleClubIds(req);

    filter.club = {
        $in: accessibleClubIds
    };

    return filter;
};

// Find a club and check whether the logged-in user can manage it.
const findManageableClub = async (req, clubId) => {
    if (!mongoose.isValidObjectId(clubId)) {
        return {
            error: "Invalid club ID",
            status: 400
        };
    }

    const club = await Club.findById(clubId);

    if (!club) {
        return {
            error: "Club not found",
            status: 404
        };
    }

    if (!canManageClub(req, club)) {
        return {
            error: "You are not authorized to manage this club",
            status: 403
        };
    }

    return { club };
};

// Find an event and its club, then check permissions.
const findManageableEvent = async (req, eventId) => {
    if (!mongoose.isValidObjectId(eventId)) {
        return {
            error: "Invalid event ID",
            status: 400
        };
    }

    const event = await Event.findById(eventId);

    if (!event) {
        return {
            error: "Event not found",
            status: 404
        };
    }

    const club = await Club.findById(event.club);

    if (!club) {
        return {
            error: "Club not found",
            status: 404
        };
    }

    if (!canManageClub(req, club)) {
        return {
            error: "You are not authorized to manage this event",
            status: 403
        };
    }

    return { event, club };
};

// Validate event date.
const isValidDate = (date) => {
    return date && !Number.isNaN(new Date(date).getTime());
};

// ============================================================
// CREATE EVENT
// ============================================================

const createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            date,
            venue,
            category,
            capacity,
            club
        } = req.body;

        // Only the currently appointed president can create events.
        if (req.user?.role !== "organizer") {
            return res.status(403).json({
                message: "Only the appointed club president can create events"
            });
        }

        // Check required fields.
        if (
            !title ||
            !description ||
            !date ||
            !venue ||
            !category ||
            capacity === undefined ||
            capacity === null ||
            !club
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Validate capacity.
        const eventCapacity = Number(capacity);

        if (
            !Number.isInteger(eventCapacity) ||
            eventCapacity <= 0
        ) {
            return res.status(400).json({
                message: "Capacity must be a positive whole number"
            });
        }

        // Validate date.
        if (!isValidDate(date)) {
            return res.status(400).json({
                message: "Please provide a valid event date"
            });
        }

        // Check whether the club exists and the user can manage it.
        const result = await findManageableClub(req, club);

        if (result.error) {
            return res.status(result.status).json({
                message: result.error
            });
        }

        // Extra check: user must be the current president.
        if (!isCurrentClubPresident(req, result.club)) {
            return res.status(403).json({
                message: "Only the current president can create events for this club"
            });
        }

        // Create event.
        const event = await Event.create({
            title: title.trim(),
            description: description.trim(),
            date: new Date(date),
            venue: venue.trim(),
            category: category.trim(),
            capacity: eventCapacity,
            club: result.club._id,
            organizer: getUserId(req),
            approvalStatus: "pending"
        });

        return res.status(201).json({
            message: "Event created successfully. Waiting for faculty approval.",
            event
        });

    } catch (error) {
        console.error("Create event error:", error);

        return res.status(500).json({
            message: "Failed to create event"
        });
    }
};

// ============================================================
// GET ALL EVENTS
// ============================================================

const getEvents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            category,
            club,
            status,
            eventStatus,
            sort = "date",
            time
        } = req.query;

        // Validate pagination.
        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        if (
            !Number.isInteger(pageNumber) ||
            pageNumber < 1 ||
            !Number.isInteger(limitNumber) ||
            limitNumber < 1 ||
            limitNumber > 100
        ) {
            return res.status(400).json({
                message: "Page must be positive and limit must be between 1 and 100"
            });
        }

        // Validate event lifecycle status.
        const allowedEventStatuses = [
            "scheduled",
            "cancelled",
            "completed"
        ];

        if (
            eventStatus &&
            !allowedEventStatuses.includes(eventStatus)
        ) {
            return res.status(400).json({
                message: "Invalid event status",
                allowedStatuses: allowedEventStatuses
            });
        }

        // Validate approval status.
        const allowedApprovalStatuses = [
            "pending",
            "approved",
            "rejected"
        ];

        if (
            status &&
            !allowedApprovalStatuses.includes(status)
        ) {
            return res.status(400).json({
                message: "Invalid approval status",
                allowedStatuses: allowedApprovalStatuses
            });
        }

        // Validate time filter.
        if (time && !["upcoming", "past"].includes(time)) {
            return res.status(400).json({
                message: "Time must be upcoming or past"
            });
        }

        // Build database filter.
        const filter = {};

        // Apply role-based visibility.
        await applyEventVisibility(req, filter);

        // Search by title.
        if (search?.trim()) {
            filter.title = {
                $regex: escapeRegex(search.trim()),
                $options: "i"
            };
        }

        // Filter by category.
        if (category) {
            filter.category = category;
        }

        // Filter by club.
        if (club) {
            if (!mongoose.isValidObjectId(club)) {
                return res.status(400).json({
                    message: "Invalid club ID"
                });
            }

            if (filter.club?.$in) {
                const allowedIds = filter.club.$in.map(String);

                if (!allowedIds.includes(String(club))) {
                    return res.status(403).json({
                        message: "You cannot access events of this club"
                    });
                }
            }

            filter.club = club;
        }

        // Apply approval status for non-students.
        // Students always see approved events only.
        if (status && req.user?.role !== "student") {
            filter.approvalStatus = status;
        }

        // Filter by event lifecycle status.
        if (eventStatus) {
            filter.status = eventStatus;
        }

        // Filter upcoming or past events.
        if (time === "upcoming") {
            filter.date = { $gte: new Date() };
        } else if (time === "past") {
            filter.date = { $lt: new Date() };
        }

        // Pagination.
        const skip = (pageNumber - 1) * limitNumber;

        const totalEvents = await Event.countDocuments(filter);

        // Sorting.
        let sortOption = {};

        if (sort === "date") {
            sortOption = { date: 1 };
        } else if (sort === "newest") {
            sortOption = { createdAt: -1 };
        } else if (sort === "oldest") {
            sortOption = { createdAt: 1 };
        } else {
            return res.status(400).json({
                message: "Invalid sort option",
                allowedSortOptions: ["date", "newest", "oldest"]
            });
        }

        // Fetch events.
        const events = await Event.find(filter)
            .populate("organizer", "name email role presidentId")
            .populate("club", "name category")
            .sort(sortOption)
            .skip(skip)
            .limit(limitNumber);

        const totalPages = Math.ceil(totalEvents / limitNumber);

        return res.status(200).json({
            currentPage: pageNumber,
            limit: limitNumber,
            totalEvents,
            totalPages,
            events
        });

    } catch (error) {
        console.error("Get events error:", error);

        return res.status(500).json({
            message: "Failed to fetch events"
        });
    }
};

// ============================================================
// UPDATE EVENT
// ============================================================

const updateEvent = async (req, res) => {
    try {
        const result = await findManageableEvent(req, req.params.id);

        if (result.error) {
            return res.status(result.status).json({
                message: result.error
            });
        }

        const {
            title,
            description,
            date,
            venue,
            category,
            capacity
        } = req.body;

        const updateData = {};

        // Only update fields that were actually supplied.
        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({
                    message: "Title cannot be empty"
                });
            }

            updateData.title = title.trim();
        }

        if (description !== undefined) {
            if (!description.trim()) {
                return res.status(400).json({
                    message: "Description cannot be empty"
                });
            }

            updateData.description = description.trim();
        }

        if (date !== undefined) {
            if (!isValidDate(date)) {
                return res.status(400).json({
                    message: "Please provide a valid event date"
                });
            }

            updateData.date = new Date(date);
        }

        if (venue !== undefined) {
            if (!venue.trim()) {
                return res.status(400).json({
                    message: "Venue cannot be empty"
                });
            }

            updateData.venue = venue.trim();
        }

        if (category !== undefined) {
            if (!category.trim()) {
                return res.status(400).json({
                    message: "Category cannot be empty"
                });
            }

            updateData.category = category.trim();
        }

        if (capacity !== undefined) {
            const eventCapacity = Number(capacity);

            if (
                !Number.isInteger(eventCapacity) ||
                eventCapacity <= 0
            ) {
                return res.status(400).json({
                    message: "Capacity must be a positive whole number"
                });
            }

            updateData.capacity = eventCapacity;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: "No valid fields provided for update"
            });
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            {
                new: true,
                runValidators: true
            }
        )
            .populate("organizer", "name email role presidentId")
            .populate("club", "name category");

        return res.status(200).json({
            message: "Event updated successfully",
            event: updatedEvent
        });

    } catch (error) {
        console.error("Update event error:", error);

        return res.status(500).json({
            message: "Failed to update event"
        });
    }
};

// ============================================================
// DELETE EVENT
// ============================================================

const deleteEvent = async (req, res) => {
    try {
        const result = await findManageableEvent(req, req.params.id);

        if (result.error) {
            return res.status(result.status).json({
                message: result.error
            });
        }

        await Event.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            message: "Event deleted successfully"
        });

    } catch (error) {
        console.error("Delete event error:", error);

        return res.status(500).json({
            message: "Failed to delete event"
        });
    }
};

// ============================================================
// GET EVENTS OF A PARTICULAR CLUB
// ============================================================

const getClubEvents = async (req, res) => {
    try {
        const { clubId } = req.params;

        if (!mongoose.isValidObjectId(clubId)) {
            return res.status(400).json({
                message: "Invalid club ID"
            });
        }

        const club = await Club.findById(clubId);

        if (!club) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        // Students may view approved events only.
        // Other roles must have access to this particular club.
        if (req.user?.role !== "student" && !canManageClub(req, club)) {
            return res.status(403).json({
                message: "You cannot access events of this club"
            });
        }

        const filter = {
            club: clubId
        };

        if (req.user?.role === "student") {
            filter.approvalStatus = "approved";
        }

        const events = await Event.find(filter)
            .populate("organizer", "name email role presidentId")
            .populate("club", "name category")
            .sort({ date: 1 });

        return res.status(200).json({
            totalEvents: events.length,
            events
        });

    } catch (error) {
        console.error("Get club events error:", error);

        return res.status(500).json({
            message: "Failed to fetch club events"
        });
    }
};

// ============================================================
// SEARCH EVENTS
// ============================================================

const searchEvents = async (req, res) => {
    try {
        const {
            search,
            category,
            club,
            date
        } = req.query;

        const filter = {};

        // Apply role-based visibility.
        await applyEventVisibility(req, filter);

        // Search by title.
        if (search?.trim()) {
            filter.title = {
                $regex: escapeRegex(search.trim()),
                $options: "i"
            };
        }

        // Filter by category.
        if (category) {
            filter.category = category;
        }

        // Filter by club.
        if (club) {
            if (!mongoose.isValidObjectId(club)) {
                return res.status(400).json({
                    message: "Invalid club ID"
                });
            }

            if (filter.club?.$in) {
                const allowedIds = filter.club.$in.map(String);

                if (!allowedIds.includes(String(club))) {
                    return res.status(403).json({
                        message: "You cannot access events of this club"
                    });
                }
            }

            filter.club = club;
        }

        // Filter by date.
        if (date) {
            if (!isValidDate(date)) {
                return res.status(400).json({
                    message: "Please provide a valid date"
                });
            }

            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);

            filter.date = {
                $gte: startDate,
                $lt: endDate
            };
        }

        const events = await Event.find(filter)
            .populate("organizer", "name email role presidentId")
            .populate("club", "name category")
            .sort({ date: 1 });

        return res.status(200).json({
            totalEvents: events.length,
            events
        });

    } catch (error) {
        console.error("Search events error:", error);

        return res.status(500).json({
            message: "Failed to search events"
        });
    }
};

// ============================================================
// GET UPCOMING EVENTS
// ============================================================

const getUpcomingEvents = async (req, res) => {
    try {
        const filter = {
            date: { $gte: new Date() },
            status: "scheduled"
        };

        await applyEventVisibility(req, filter);

        const events = await Event.find(filter)
            .populate("organizer", "name email role presidentId")
            .populate("club", "name category")
            .sort({ date: 1 });

        return res.status(200).json({
            totalEvents: events.length,
            events
        });

    } catch (error) {
        console.error("Get upcoming events error:", error);

        return res.status(500).json({
            message: "Failed to fetch upcoming events"
        });
    }
};

// ============================================================
// GET EVENT BY ID
// ============================================================

const getEventById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        const event = await Event.findById(req.params.id)
            .populate("organizer", "name email role presidentId")
            .populate("club", "name category");

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Students can view approved events only.
        if (
            req.user?.role === "student" &&
            event.approvalStatus !== "approved"
        ) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Faculty and presidents can view events of their own clubs only.
        if (!["student", "dean", "superadmin"].includes(req.user?.role)) {
            const club = await Club.findById(event.club?._id || event.club);

            if (!club || !canManageClub(req, club)) {
                return res.status(404).json({
                    message: "Event not found"
                });
            }
        }

        return res.status(200).json({
            event
        });

    } catch (error) {
        console.error("Get event by ID error:", error);

        return res.status(500).json({
            message: "Failed to fetch event details"
        });
    }
};

// ============================================================
// APPROVE EVENT
// ============================================================

const approveEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const club = await Club.findById(event.club);

        if (!club) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        // Only the assigned faculty coordinator, dean or superadmin
        // can approve an event.
        if (!canReviewClub(req, club)) {
            return res.status(403).json({
                message: "You are not authorized to approve events for this club"
            });
        }

        if (event.approvalStatus === "approved") {
            return res.status(400).json({
                message: "Event is already approved"
            });
        }

        if (event.approvalStatus === "rejected") {
            return res.status(400).json({
                message: "A rejected event cannot be approved. Ask the organizer to submit a new event."
            });
        }

        event.approvalStatus = "approved";
        await event.save();

        await Notification.create({
            user: event.organizer,
            message: `Your event "${event.title}" has been approved`,
            type: "event_approved"
        });

        return res.status(200).json({
            message: "Event approved successfully",
            event
        });

    } catch (error) {
        console.error("Approve event error:", error);

        return res.status(500).json({
            message: "Failed to approve event"
        });
    }
};

// ============================================================
// REJECT EVENT
// ============================================================

const rejectEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const club = await Club.findById(event.club);

        if (!club) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        // Only the assigned faculty coordinator, dean or superadmin
        // can reject an event.
        if (!canReviewClub(req, club)) {
            return res.status(403).json({
                message: "You are not authorized to reject events for this club"
            });
        }

        if (event.approvalStatus === "rejected") {
            return res.status(400).json({
                message: "Event is already rejected"
            });
        }

        if (event.approvalStatus === "approved") {
            return res.status(400).json({
                message: "An approved event cannot be rejected"
            });
        }

        event.approvalStatus = "rejected";
        await event.save();

        await Notification.create({
            user: event.organizer,
            message: `Your event "${event.title}" has been rejected`,
            type: "event_rejected"
        });

        return res.status(200).json({
            message: "Event rejected successfully",
            event
        });

    } catch (error) {
        console.error("Reject event error:", error);

        return res.status(500).json({
            message: "Failed to reject event"
        });
    }
};

// ============================================================
// GET PENDING EVENTS
// ============================================================

const getPendingEvents = async (req, res) => {
    try {
        // Only faculty, dean and superadmin should access this endpoint.
        if (!["faculty", "dean", "superadmin"].includes(req.user?.role)) {
            return res.status(403).json({
                message: "You are not authorized to view pending events"
            });
        }

        const filter = {
            approvalStatus: "pending"
        };

        // Faculty can view pending events only for clubs they coordinate.
        if (req.user.role === "faculty") {
            const accessibleClubIds = await getAccessibleClubIds(req);

            filter.club = {
                $in: accessibleClubIds
            };
        }

        const events = await Event.find(filter)
            .populate("organizer", "name email role presidentId")
            .populate("club", "name category")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            totalPending: events.length,
            events
        });

    } catch (error) {
        console.error("Get pending events error:", error);

        return res.status(500).json({
            message: "Failed to fetch pending events"
        });
    }
};

// ============================================================
// CANCEL EVENT
// ============================================================

const cancelEvent = async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                message: "Cancellation reason is required"
            });
        }

        const result = await findManageableEvent(req, req.params.id);

        if (result.error) {
            return res.status(result.status).json({
                message: result.error
            });
        }

        const { event } = result;

        if (event.status === "cancelled") {
            return res.status(400).json({
                message: "Event is already cancelled"
            });
        }

        event.status = "cancelled";
        event.cancellationReason = reason.trim();

        await event.save();

        return res.status(200).json({
            message: "Event cancelled successfully",
            event
        });

    } catch (error) {
        console.error("Cancel event error:", error);

        return res.status(500).json({
            message: "Failed to cancel event"
        });
    }
};

// ============================================================
// EXPORT CONTROLLERS
// ============================================================

module.exports = {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent,
    getClubEvents,
    searchEvents,
    getUpcomingEvents,
    getEventById,
    approveEvent,
    rejectEvent,
    getPendingEvents,
    cancelEvent
};