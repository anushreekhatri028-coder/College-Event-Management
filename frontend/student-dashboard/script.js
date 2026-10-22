
/*
 * College Event Management System
 * Student Dashboard — Day 35 + Day 36
 *
 * File:
 * frontend/student-dashboard/script.js
 */

const API_BASE_URL = "http://localhost:5000/api";

// IMPORTANT:
// Confirm these paths against backend/src/routes/registration.routes.js,
// attendance.routes.js, and certificate.routes.js.
// Change them if your actual backend uses different paths.
const API = {
    registrations: `${API_BASE_URL}/registrations/my`,
    attendance: `${API_BASE_URL}/attendance/my`,
    certificates: `${API_BASE_URL}/certificates/my`
};

// --------------------------------------------------
// 1. AUTHENTICATION HELPERS
// --------------------------------------------------

function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("authToken")
    );
}

function getSavedStudentName() {
    return (
        localStorage.getItem("studentName") ||
        sessionStorage.getItem("studentName") ||
        ""
    );
}

// --------------------------------------------------
// 2. API REQUEST HELPER
// --------------------------------------------------

async function fetchStudentData(url, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error(
            "Your login token was not found. Please log in as a student."
        );
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    let data = {};

    try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        throw new Error("The server returned an invalid JSON response.");
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}

// --------------------------------------------------
// 3. RESPONSE HELPERS
// --------------------------------------------------

function extractList(data, possibleKeys) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        return [];
    }

    for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    // Support common nested response formats.
    if (data.data && typeof data.data === "object") {
        if (Array.isArray(data.data)) {
            return data.data;
        }

        for (const key of possibleKeys) {
            if (Array.isArray(data.data[key])) {
                return data.data[key];
            }
        }
    }

    return [];
}

function formatDate(value) {
    if (!value) {
        return "Not provided";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getEvent(registration) {
    return (
        registration.event ||
        registration.eventId ||
        registration.eventDetails ||
        {}
    );
}

function getEventId(registration) {
    const event = getEvent(registration);

    if (typeof event === "string") {
        return event;
    }

    return (
        event._id ||
        event.id ||
        (typeof registration.eventId === "string"
            ? registration.eventId
            : null) ||
        registration.event?._id ||
        null
    );
}

function addText(parent, tag, text, className = "") {
    const element = document.createElement(tag);

    // textContent avoids treating API-provided text as HTML.
    element.textContent = String(text ?? "");

    if (className) {
        element.className = className;
    }

    parent.appendChild(element);

    return element;
}

function renderEmpty(containerId, message) {
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    container.replaceChildren();
    addText(container, "p", message, "empty-state");
}

function setPageMessage(message) {
    const element = document.getElementById("page-message");

    if (element) {
        element.textContent = message;
    }
}

// --------------------------------------------------
// 4. STUDENT PROFILE
// --------------------------------------------------

function renderStudentProfile() {
    const name = getSavedStudentName();

    const nameElement = document.getElementById("student-name");
    const avatarElement = document.getElementById("avatar");

    if (name && nameElement) {
        nameElement.textContent = name;
    }

    if (name && avatarElement) {
        avatarElement.textContent = name.charAt(0).toUpperCase();
    }
}

// --------------------------------------------------
// 5. REGISTERED EVENTS
// --------------------------------------------------

function canCancelRegistration(registration) {
    const event = getEvent(registration);

    const eventStatus = String(event.status || "").toLowerCase();
    const registrationStatus = String(
        registration.status || ""
    ).toLowerCase();

    // Do not show cancellation for completed/cancelled events.
    if (
        eventStatus === "cancelled" ||
        eventStatus === "completed"
    ) {
        return false;
    }

    if (
        registrationStatus === "cancelled" ||
        registrationStatus === "canceled" ||
        registrationStatus === "completed"
    ) {
        return false;
    }

    // Do not offer cancellation after the event has started.
    // The backend must enforce the actual cancellation policy too.
    const eventDate = event.date || event.eventDate;

    if (eventDate) {
        const parsedDate = new Date(eventDate);

        if (
            !Number.isNaN(parsedDate.getTime()) &&
            parsedDate <= new Date()
        ) {
            return false;
        }
    }

    return Boolean(getEventId(registration));
}

function renderRegistrations(registrations) {
    const container = document.getElementById("events-list");

    if (!container) {
        return;
    }

    container.replaceChildren();

    const countElement = document.getElementById("registered-count");

    if (countElement) {
        countElement.textContent = registrations.length;
    }

    if (registrations.length === 0) {
        renderEmpty(
            "events-list",
            "You have not registered for any events yet."
        );
        return;
    }

    registrations.forEach((registration) => {
        const event = getEvent(registration);

        const card = document.createElement("article");
        card.className = "data-item";

        const details = document.createElement("div");

        addText(
            details,
            "h3",
            event.title || event.name || "Untitled event"
        );

        addText(
            details,
            "p",
            `Date: ${formatDate(event.date || event.eventDate)}`
        );

        addText(
            details,
            "p",
            `Venue: ${event.venue || "Not provided"}`
        );

        if (event.club && typeof event.club === "object") {
            addText(
                details,
                "p",
                `Club: ${event.club.name || "Not provided"}`
            );
        }

        addText(
            card,
            "span",
            registration.status || "Registered",
            "status"
        );

        card.prepend(details);

        if (canCancelRegistration(registration)) {
            const cancelButton = document.createElement("button");

            cancelButton.type = "button";
            cancelButton.className = "cancel-button";
            cancelButton.textContent = "Cancel registration";

            cancelButton.addEventListener("click", async () => {
                cancelButton.disabled = true;
                cancelButton.textContent = "Cancelling...";

                try {
                    await cancelRegistration(registration);
                } finally {
                    cancelButton.disabled = false;
                    cancelButton.textContent = "Cancel registration";
                }
            });

            card.appendChild(cancelButton);
        }

        container.appendChild(card);
    });
}

// --------------------------------------------------
// 6. CANCEL REGISTRATION
// --------------------------------------------------

async function cancelRegistration(registration) {
    const eventId = getEventId(registration);

    if (!eventId) {
        alert(
            "The event ID was not found in this registration. " +
            "Check the registration API response."
        );
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to cancel your registration for this event?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const result = await fetchStudentData(
            `${API_BASE_URL}/registrations/event/${encodeURIComponent(eventId)}`,
            {
                method: "DELETE"
            }
        );

        alert(
            result.message ||
            "Registration cancellation request completed."
        );

        // Reload all sections from the server.
        await loadDashboard();

    } catch (error) {
        console.error("Cancellation error:", error);

        alert(
            error.message ||
            "Unable to cancel the registration."
        );
    }
}

// --------------------------------------------------
// 7. ATTENDANCE
// --------------------------------------------------

function renderAttendance(records) {
    const container = document.getElementById("attendance-list");

    if (!container) {
        return;
    }

    container.replaceChildren();

    const countElement = document.getElementById("attendance-count");

    if (countElement) {
        countElement.textContent = records.length;
    }

    if (records.length === 0) {
        renderEmpty(
            "attendance-list",
            "No attendance records found."
        );
        return;
    }

    records.forEach((record) => {
        const event = getEvent(record);

        const card = document.createElement("article");
        card.className = "data-item";

        const details = document.createElement("div");

        addText(
            details,
            "h3",
            event.title || event.name || "Event attendance"
        );

        addText(
            details,
            "p",
            `Check-in: ${formatDate(record.checkInTime)}`
        );

        addText(
            details,
            "p",
            `Event date: ${formatDate(event.date || event.eventDate)}`
        );

        addText(
            card,
            "span",
            record.status || "Recorded",
            "status"
        );

        card.prepend(details);
        container.appendChild(card);
    });
}

// --------------------------------------------------
// 8. CERTIFICATES
// --------------------------------------------------

function renderCertificates(certificates) {
    const container = document.getElementById("certificates-list");

    if (!container) {
        return;
    }

    container.replaceChildren();

    const countElement = document.getElementById("certificate-count");

    if (countElement) {
        countElement.textContent = certificates.length;
    }

    if (certificates.length === 0) {
        renderEmpty(
            "certificates-list",
            "No certificates are available in your account yet."
        );
        return;
    }

    certificates.forEach((certificate) => {
        const card = document.createElement("article");
        card.className = "data-item";

        const details = document.createElement("div");

        addText(
            details,
            "h3",
            certificate.eventTitle ||
            certificate.event?.title ||
            certificate.title ||
            "Event certificate"
        );

        addText(
            details,
            "p",
            `Certificate ID: ${
                certificate.certificateId ||
                certificate.verificationId ||
                "Not provided"
            }`
        );

        addText(
            details,
            "p",
            `Issued: ${formatDate(
                certificate.issuedAt || certificate.createdAt
            )}`
        );

        card.appendChild(details);
        container.appendChild(card);
    });
}

// --------------------------------------------------
// 9. LOAD THE DASHBOARD
// --------------------------------------------------

async function loadDashboard() {
    setPageMessage("Loading your dashboard...");

    renderStudentProfile();

    const token = getToken();

    if (!token) {
        setPageMessage(
            "Please log in first. Your student login token was not found."
        );

        renderEmpty(
            "events-list",
            "Log in to load your registrations."
        );

        renderEmpty(
            "attendance-list",
            "Log in to load your attendance."
        );

        renderEmpty(
            "certificates-list",
            "Log in to load your certificates."
        );

        [
            "registered-count",
            "attendance-count",
            "certificate-count"
        ].forEach((id) => {
            const element = document.getElementById(id);

            if (element) {
                element.textContent = "—";
            }
        });

        return;
    }

    // Each section loads independently, so one failed API
    // does not prevent the other sections from loading.
    const results = await Promise.allSettled([
        fetchStudentData(API.registrations),
        fetchStudentData(API.attendance),
        fetchStudentData(API.certificates)
    ]);

    const failures = [];

    if (results[0].status === "fulfilled") {
        const registrations = extractList(
            results[0].value,
            ["registrations", "data", "results"]
        );

        renderRegistrations(registrations);
    } else {
        const count = document.getElementById("registered-count");

        if (count) {
            count.textContent = "—";
        }

        renderEmpty(
            "events-list",
            "Could not load registrations. Check the API route and server logs."
        );

        failures.push(`Registrations: ${results[0].reason.message}`);
    }

    if (results[1].status === "fulfilled") {
        const records = extractList(
            results[1].value,
            ["attendance", "records", "data", "results"]
        );

        renderAttendance(records);
    } else {
        const count = document.getElementById("attendance-count");

        if (count) {
            count.textContent = "—";
        }

        renderEmpty(
            "attendance-list",
            "Could not load attendance. Check the API route and server logs."
        );

        failures.push(`Attendance: ${results[1].reason.message}`);
    }

    if (results[2].status === "fulfilled") {
        const certificates = extractList(
            results[2].value,
            ["certificates", "data", "results"]
        );

        renderCertificates(certificates);
    } else {
        const count = document.getElementById("certificate-count");

        if (count) {
            count.textContent = "—";
        }

        renderEmpty(
            "certificates-list",
            "Could not load certificates. Check the API route and server logs."
        );

        failures.push(`Certificates: ${results[2].reason.message}`);
    }

    if (failures.length > 0) {
        setPageMessage(
            "Some dashboard sections could not load. " +
            failures.join(" | ")
        );

        console.error("Dashboard API errors:", failures);
    } else {
        setPageMessage("Your dashboard has been loaded successfully.");
    }
}

// --------------------------------------------------
// 10. LOGOUT
// --------------------------------------------------

function logoutStudent() {
    const confirmed = window.confirm("Do you want to log out?");

    if (!confirmed) {
        return;
    }

    // Remove the known token/name keys used by this example.
    // If your login page uses a different key, clear that key too.
    [
        "token",
        "authToken",
        "studentName"
    ].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    // Change this URL if your login page is located elsewhere.
    window.location.href = "../login/index.html";
}

// --------------------------------------------------
// 11. INITIALIZE THE PAGE
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutStudent);
    }

    loadDashboard().catch((error) => {
        console.error("Dashboard initialization error:", error);

        setPageMessage(
            "Unable to initialize the dashboard. " +
            "Check the browser console for details."
        );
    });
});
