
const Waitlist = require("../models/waitlist.model");
const Event = require("../models/event.model");
const Registration = require("../models/registration.model");
const Club = require("../models/club.model");

// Join an event waitlist
const joinWaitlist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user.userId;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.approvalStatus !== "approved") {
      return res.status(400).json({
        message: "This event is not approved",
      });
    }

    if (event.status !== "scheduled") {
      return res.status(400).json({
        message: "This event is not accepting waitlist entries",
      });
    }

    if (new Date(event.date) <= new Date()) {
      return res.status(400).json({
        message: "This event has already started or ended",
      });
    }

    // Check whether the student is already registered.
    const existingRegistration = await Registration.findOne({
      student: studentId,
      event: eventId,
    });

    if (existingRegistration) {
      return res.status(400).json({
        message: "You are already registered for this event",
      });
    }

    // Count current registrations.
    const registrationCount = await Registration.countDocuments({
      event: eventId,
    });

    if (registrationCount < event.capacity) {
      return res.status(400).json({
        message:
          "Seats are available. Please register for the event directly.",
      });
    }

    const existingEntry = await Waitlist.findOne({
      student: studentId,
      event: eventId,
    });

    if (existingEntry) {
      return res.status(409).json({
        message: "You already have a waitlist entry for this event",
        status: existingEntry.status,
      });
    }

    const entry = await Waitlist.create({
      student: studentId,
      event: eventId,
    });

    const position =
      (await Waitlist.countDocuments({
        event: eventId,
        status: "waiting",
        createdAt: { $lte: entry.createdAt },
      }));

    return res.status(201).json({
      message: "You have joined the event waitlist successfully",
      position,
      waitlist: entry,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You already have a waitlist entry for this event",
      });
    }

    console.error("Join waitlist error:", error.message);

    return res.status(500).json({
      message: "Failed to join waitlist",
    });
  }
};

// View the logged-in student's waitlist entries
const getMyWaitlist = async (req, res) => {
  try {
    const entries = await Waitlist.find({
      student: req.user.userId,
    })
      .populate("event", "title date venue capacity status approvalStatus")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: entries.length,
      waitlist: entries,
    });
  } catch (error) {
    console.error("Get my waitlist error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch your waitlist",
    });
  }
};

// Organizer or authorized staff views an event's queue
const getEventWaitlist = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    // Organizers can view waitlists only for their own club's events.
    if (req.user.role === "organizer") {
      const club = await Club.findById(event.club);

      if (!club) {
        return res.status(404).json({
          message: "Club not found",
        });
      }

      if (club.president.toString() !== req.user.userId) {
        return res.status(403).json({
          message: "You can only view your own club's event waitlists",
        });
      }
    }

    const entries = await Waitlist.find({
      event: eventId,
      status: "waiting",
    })
      .populate("student", "name email")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      event: event.title,
      count: entries.length,
      waitlist: entries.map((entry, index) => ({
        position: index + 1,
        _id: entry._id,
        student: entry.student,
        status: entry.status,
        joinedAt: entry.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get event waitlist error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch event waitlist",
    });
  }
};

// Leave the waitlist
const leaveWaitlist = async (req, res) => {
  try {
    const { eventId } = req.params;

    const entry = await Waitlist.findOne({
      student: req.user.userId,
      event: eventId,
      status: "waiting",
    });

    if (!entry) {
      return res.status(404).json({
        message: "Active waitlist entry not found",
      });
    }

    entry.status = "cancelled";
    await entry.save();

    return res.status(200).json({
      message: "You have left the waitlist successfully",
    });
  } catch (error) {
    console.error("Leave waitlist error:", error.message);

    return res.status(500).json({
      message: "Failed to leave waitlist",
    });
  }
};

module.exports = {
  joinWaitlist,
  getMyWaitlist,
  getEventWaitlist,
  leaveWaitlist,
};
