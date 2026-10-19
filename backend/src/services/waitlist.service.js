
const Waitlist = require("../models/waitlist.model");
const Event = require("../models/event.model");
const Registration = require("../models/registration.model");

const promoteNextWaitlistStudent = async (eventId) => {
  const event = await Event.findById(eventId);

  if (
    !event ||
    event.status !== "scheduled" ||
    event.approvalStatus !== "approved" ||
    new Date(event.date) <= new Date()
  ) {
    return null;
  }

  const registrationCount = await Registration.countDocuments({
    event: eventId,
  });

  if (registrationCount >= event.capacity) {
    return null;
  }

  // FIFO: promote the student who joined earliest.
  const nextEntry = await Waitlist.findOne({
    event: eventId,
    status: "waiting",
  }).sort({ createdAt: 1, _id: 1 });

  if (!nextEntry) {
    return null;
  }

  // Create their registration before marking them promoted.
  // If creation fails, the entry remains waiting.
  await Registration.create({
    student: nextEntry.student,
    event: eventId,
  });

  nextEntry.status = "promoted";
  await nextEntry.save();

  return nextEntry;
};

module.exports = { promoteNextWaitlistStudent };
