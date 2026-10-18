const Event = require("../models/event.model");
const Club = require("../models/club.model");
const Notification =
    require("../models/notification.model");

// CREATE EVENT
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

        // Check required fields
        if (
            !title ||
            !description ||
            !date ||
            !venue ||
            !category ||
            !capacity ||
            !club
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Check if club exists
        const existingClub = await Club.findById(club);

        if (!existingClub) {
            return res.status(404).json({
                message: "Club not found"
            });
        }
        if (
            req.user.role === "organizer" &&
            existingClub.president.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                message: "You can only create events for your own club"
            });
        }

        // Create event
        const event = await Event.create({
            title,
            description,
            date,
            venue,
            category,
            capacity,
            club,
            organizer: req.user.userId,
            approvalStatus: "pending"
        });

        res.status(201).json({
            message: "Event created successfully",
            event
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// GET ALL EVENTS

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

        // 1. Validate pagination
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
                message:
                    "Page must be positive and limit must be between 1 and 100"
            });
        }

        // 2. Validate event lifecycle status
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

        // 3. Validate approval status
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

        // 4. Validate time filter
        if (time && !["upcoming", "past"].includes(time)) {
            return res.status(400).json({
                message: "Time must be upcoming or past"
            });
        }

        // 5. Build database filter
        const filter = {};

        // Students can see only approved events
        if (req.user.role === "student") {
            filter.approvalStatus = "approved";
        }

        // Search by event title
        if (search) {
            filter.title = {
                $regex: search,
                $options: "i"
            };
        }

        // Filter by category
        if (category) {
            filter.category = category;
        }

        // Filter by club
        if (club) {
            filter.club = club;
        }

        // Filter by approval status
        // Students cannot override the approved-only restriction
        if (status && req.user.role !== "student") {
            filter.approvalStatus = status;
        }

        // Filter by event lifecycle status
        if (eventStatus) {
            filter.status = eventStatus;
        }

        // Filter upcoming or past events
        if (time === "upcoming") {
            filter.date = { $gte: new Date() };
        } else if (time === "past") {
            filter.date = { $lt: new Date() };
        }

        // 6. Pagination
        const skip = (pageNumber - 1) * limitNumber;

        const totalEvents = await Event.countDocuments(filter);

        // 7. Sorting
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
                allowedSortOptions: [
                    "date",
                    "newest",
                    "oldest"
                ]
            });
        }

        // 8. Fetch events
        const events = await Event.find(filter)
            .populate("organizer", "name email role")
            .populate("club", "name category")
            .sort(sortOption)
            .skip(skip)
            .limit(limitNumber);

        // 9. Calculate total pages
        const totalPages = Math.ceil(
            totalEvents / limitNumber
        );

        // 10. Send response
        return res.status(200).json({
            currentPage: pageNumber,
            limit: limitNumber,
            totalEvents,
            totalPages,
            events
        });

    } catch (error) {
        console.error("Get events error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch events"
        });
    }
};


// UPDATE EVENT
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Find the club of this event
        const club = await Club.findById(event.club);

        if (!club) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        // Check if organizer/president belongs to this club
        if (
            req.user.role === "organizer" &&
            club.president.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                message: "You can only update events of your own club"
            });
        }

        // Only update these fields
        const {
            title,
            description,
            date,
            venue,
            category,
            capacity
        } = req.body;

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description,
                date,
                venue,
                category,
                capacity
            },
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            message: "Event updated successfully",
            event: updatedEvent
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// DELETE EVENT
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        // Check if event exists
        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // Find the club to which this event belongs
        const club = await Club.findById(event.club);

        // Check if club exists
        if (!club) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        // Check permission for organizer/president
        if (
            req.user.role === "organizer" &&
            club.president.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                message: "You can only delete events of your own club"
            });
        }

        // Delete event
        await Event.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Event deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


// GET EVENTS OF A PARTICULAR CLUB
const getClubEvents = async (req, res) => {
    try {
        const { clubId } = req.params;

        // Check if club exists
        const existingClub = await Club.findById(clubId);

        if (!existingClub) {
            return res.status(404).json({
                message: "Club not found"
            });
        }

        const events = await Event.find({
            club: clubId
        })
            .populate("organizer", "name email role")
            .populate("club", "name category");

        res.status(200).json({
            events
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const searchEvents = async (req, res) => {
    try {
        const {
            search,
            category,
            club,
            date
        } = req.query;

        let filter = {};

        // Search by title
        if (search) {
            filter.title = {
                $regex: search,
                $options: "i"
            };
        }

        // Filter by category
        if (category) {
            filter.category = category;
        }

        // Filter by club
        if (club) {
            filter.club = club;
        }

        // Filter by date
        if (date) {
            filter.date = {
                $gte: new Date(date),
                $lt: new Date(
                    new Date(date).setDate(
                        new Date(date).getDate() + 1
                    )
                )
            };
        }

        const events = await Event.find(filter)
            .populate("organizer", "name email role")
            .populate("club", "name category")
            .sort({ date: 1 });

        res.status(200).json({
            totalEvents: events.length,
            events
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getUpcomingEvents = async (req, res) => {
    try {
        const events = await Event.find({
            date: { $gte: new Date() }
        })
            .populate("organizer", "name email role")
            .populate("club", "name category")
            .sort({ date: 1 });

        res.status(200).json({
            totalEvents: events.length,
            events
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate("organizer", "name email role")
            .populate("club", "name category");

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        res.status(200).json({
            event
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


const approveEvent = async (req, res) => {
    try {

        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.approvalStatus === "approved") {
            return res.status(400).json({
                message: "Event is already approved"
            });
        }

        event.approvalStatus = "approved";

        await event.save();

        await Notification.create({
           user: event.organizer,
           message: `Your event "${event.title}" has been approved`,
           type: "event_approved"
        });

        res.status(200).json({
            message: "Event approved successfully",
            event
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const rejectEvent = async (req, res) => {
    try {

        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.approvalStatus === "rejected") {
            return res.status(400).json({
                message: "Event is already rejected"
            });
        }

        event.approvalStatus = "rejected";

        await event.save();

        await Notification.create({
           user: event.organizer,
           message: `Your event "${event.title}" has been rejected`,
           type: "event_rejected"
        });

        res.status(200).json({
            message: "Event rejected successfully",
            event
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getPendingEvents = async (req, res) => {
    try {

        const events = await Event.find({
            approvalStatus: "pending"
        })
            .populate("organizer", "name email role")
            .populate("club", "name category")
            .sort({ createdAt: -1 });

        res.status(200).json({
            totalPending: events.length,
            events
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const cancelEvent = async (req, res) => {
    try {
        const { reason } = req.body;

        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.status === "cancelled") {
            return res.status(400).json({
                message: "Event is already cancelled"
            });
        }

        if (!reason) {
            return res.status(400).json({
                message: "Cancellation reason is required"
            });
        }

        // Organizer can cancel only their own club's event
        if (req.user.role === "organizer") {

            const club = await Club.findById(event.club);

            if (!club) {
                return res.status(404).json({
                    message: "Club not found"
                });
            }

            if (
                club.president.toString() !== req.user.userId
            ) {
                return res.status(403).json({
                    message: "You can only cancel your own club's events"
                });
            }
        }

        event.status = "cancelled";
        event.cancellationReason = reason;

        await event.save();

        res.status(200).json({
            message: "Event cancelled successfully",
            event
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


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