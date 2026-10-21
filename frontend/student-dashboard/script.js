
const API_BASE_URL = "http://localhost:5000/api";

// Change these three paths if your backend uses different routes.
const API = {
    registrations: `${API_BASE_URL}/registrations/my`,
    attendance: `${API_BASE_URL}/attendance/my`,
    certificates: `${API_BASE_URL}/certificates/my`
};

const pageMessage = document.getElementById("page-message");

function getToken() {
    // Use the key your existing login page saves the token under.
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("authToken")
    );
}

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

    return [];
}

async function fetchStudentData(url) {
    const token = getToken();

    if (!token) {
        throw new Error("Please log in as a student to view your dashboard.");
    }

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        }
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
        throw new Error(
            data.message || `Request failed with status ${response.status}`
        );
    }

    return data;
}

function formatDate(value) {
    if (!value) return "Date not provided";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getEvent(registration) {
    return registration.event || registration.eventId || {};
}

function addText(parent, tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text;

    if (className) {
        element.className = className;
    }

    parent.appendChild(element);
    return element;
}

function renderEmpty(containerId, message) {
    const container = document.getElementById(containerId);
    container.replaceChildren();
    addText(container, "p", message, "empty-state");
}

function renderRegistrations(registrations) {
    const container = document.getElementById("events-list");
    container.replaceChildren();

    document.getElementById("registered-count").textContent =
        registrations.length;

    if (registrations.length === 0) {
        renderEmpty("events-list", "You have not registered for any events yet.");
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

        const status = registration.status || "Registered";
        addText(card, "span", status, "status");

        card.prepend(details);
        container.appendChild(card);
    });
}

function renderAttendance(records) {
    const container = document.getElementById("attendance-list");
    container.replaceChildren();

    document.getElementById("attendance-count").textContent =
        records.length;

    if (records.length === 0) {
        renderEmpty("attendance-list", "No attendance records found.");
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
            card,
            "span",
            record.status || "Recorded",
            "status"
        );

        card.prepend(details);
        container.appendChild(card);
    });
}

function renderCertificates(certificates) {
    const container = document.getElementById("certificates-list");
    container.replaceChildren();

    document.getElementById("certificate-count").textContent =
        certificates.length;

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
                certificate.certificateId || "Not provided"
            }`
        );

        addText(
            details,
            "p",
            `Issued: ${formatDate(certificate.issuedAt || certificate.createdAt)}`
        );

        card.appendChild(details);
        container.appendChild(card);
    });
}

async function loadDashboard() {
    pageMessage.textContent = "Loading your dashboard...";

    const nameElement = document.getElementById("student-name");
    const avatarElement = document.getElementById("avatar");

    const token = getToken();

    if (!token) {
        pageMessage.textContent =
            "Please log in first. Your student login token was not found.";

        renderEmpty("events-list", "Log in to load your registrations.");
        renderEmpty("attendance-list", "Log in to load your attendance.");
        renderEmpty("certificates-list", "Log in to load your certificates.");

        document.getElementById("registered-count").textContent = "—";
        document.getElementById("attendance-count").textContent = "—";
        document.getElementById("certificate-count").textContent = "—";
        return;
    }

    const results = await Promise.allSettled([
        fetchStudentData(API.registrations),
        fetchStudentData(API.attendance),
        fetchStudentData(API.certificates)
    ]);

    const labels = ["registrations", "attendance", "certificates"];
    const failed = [];

    results.forEach((result, index) => {
        if (result.status === "rejected") {
            failed.push(
                `${labels[index]}: ${result.reason.message}`
            );
        }
    });

    if (results[0].status === "fulfilled") {
        const registrations = extractList(
            results[0].value,
            ["registrations", "data", "results"]
        );

        renderRegistrations(registrations);
    } else {
        document.getElementById("registered-count").textContent = "—";
        renderEmpty("events-list", "Could not load registrations.");
    }

    if (results[1].status === "fulfilled") {
        const attendance = extractList(
            results[1].value,
            ["attendance", "records", "data", "results"]
        );

        renderAttendance(attendance);
    } else {
        document.getElementById("attendance-count").textContent = "—";
        renderEmpty("attendance-list", "Could not load attendance.");
    }

    if (results[2].status === "fulfilled") {
        const certificates = extractList(
            results[2].value,
            ["certificates", "data", "results"]
        );

        renderCertificates(certificates);
    } else {
        document.getElementById("certificate-count").textContent = "—";
        renderEmpty("certificates-list", "Could not load certificates.");
    }

    if (failed.length > 0) {
        pageMessage.textContent =
            "Some dashboard sections could not load. " + failed.join(" | ");
    } else {
        pageMessage.textContent = "Your dashboard has been loaded.";
    }

    // Populate the name only if your login flow already stores it.
    const savedName =
        localStorage.getItem("studentName") ||
        sessionStorage.getItem("studentName");

    if (savedName) {
        nameElement.textContent = savedName;
        avatarElement.textContent = savedName.charAt(0).toUpperCase();
    }
}

document.getElementById("logout-button").addEventListener("click", () => {
    // Clear only the known login-related keys used by this example.
    ["token", "authToken", "studentName"].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    window.location.reload();
});

loadDashboard().catch((error) => {
    console.error("Dashboard loading error:", error);
    pageMessage.textContent =
        "Unable to load the dashboard. Check your backend and API routes.";
});
