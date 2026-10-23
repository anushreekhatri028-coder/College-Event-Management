
"use strict";

/* =========================================================
   1. CONFIGURATION
========================================================= */

const API_BASE_URL = "http://localhost:5000/api";

const API = {
    events: `${API_BASE_URL}/events`,
    myRegistrations: `${API_BASE_URL}/registrations/my`,
    myAttendance: `${API_BASE_URL}/attendance/my`,
    myCertificates: `${API_BASE_URL}/certificates/my`,

    registerForEvent: (eventId) =>
        `${API_BASE_URL}/registrations/event/${encodeURIComponent(eventId)}`,

    cancelRegistration: (eventId) =>
        `${API_BASE_URL}/registrations/event/${encodeURIComponent(eventId)}`
};


/* =========================================================
   2. COMMON HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}

function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = String(text);
    }

    return element;
}

function addText(parent, tag, className, text) {
    const element = createElement(tag, className, text);
    parent.appendChild(element);
    return element;
}

function createButton(label, className, onClick) {
    const button = createElement("button", className, label);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
}

function showMessage(elementId, message, type = "info") {
    const element = getElement(elementId);

    if (!element) return;

    element.textContent = message;
    element.className = `page-message ${type}`;
    element.hidden = false;
}

function clearMessage(elementId) {
    const element = getElement(elementId);

    if (!element) return;

    element.textContent = "";
    element.hidden = true;
}

function setPageMessage(message, type = "info") {
    showMessage("page-message", message, type);
}

function clearPageMessage() {
    clearMessage("page-message");
}

function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("authToken")
    );
}

function getLoggedInUser() {
    const possibleKeys = ["user", "currentUser", "loggedInUser"];

    for (const key of possibleKeys) {
        const rawValue =
            localStorage.getItem(key) ||
            sessionStorage.getItem(key);

        if (!rawValue) continue;

        try {
            return JSON.parse(rawValue);
        } catch (error) {
            console.warn(`Could not parse stored ${key}.`, error);
        }
    }

    return null;
}

function getErrorMessage(data, fallback) {
    if (typeof data === "string" && data.trim()) {
        return data;
    }

    if (data && typeof data.message === "string") {
        return data.message;
    }

    if (data && typeof data.error === "string") {
        return data.error;
    }

    return fallback;
}


/* =========================================================
   3. API REQUEST HELPER
========================================================= */

async function apiRequest(url, options = {}) {
    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (options.body !== undefined && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers
        });
    } catch (error) {
        console.error("API connection error:", error);

        throw new Error(
            "Cannot connect to the backend. Make sure your backend is running on port 5000."
        );
    }

    const contentType = response.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
    } else {
        data = await response.text().catch(() => "");
    }

    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("loggedInUser");

        sessionStorage.removeItem("token");
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("currentUser");
        sessionStorage.removeItem("loggedInUser");

        window.location.href = "../login/index.html";

        throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok) {
        throw new Error(
            getErrorMessage(
                data,
                `Request failed with status ${response.status}.`
            )
        );
    }

    return data;
}


/* =========================================================
   4. NORMALIZE API RESPONSES
========================================================= */

function extractArray(response, possibleKeys = []) {
    if (Array.isArray(response)) {
        return response;
    }

    if (!response || typeof response !== "object") {
        return [];
    }

    for (const key of possibleKeys) {
        if (Array.isArray(response[key])) {
            return response[key];
        }
    }

    if (response.data) {
        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (typeof response.data === "object") {
            for (const key of possibleKeys) {
                if (Array.isArray(response.data[key])) {
                    return response.data[key];
                }
            }
        }
    }

    return [];
}

function getId(item) {
    if (!item) return "";

    const value =
        item._id ||
        item.id ||
        item.eventId ||
        item.certificateId;

    if (value && typeof value === "object") {
        return value._id || value.id || "";
    }

    return value ? String(value) : "";
}

function getEventId(event) {
    return getId(event);
}

function getRegistrationEvent(registration) {
    if (!registration) return null;

    return (
        registration.event ||
        registration.eventId ||
        registration.eventDetails ||
        null
    );
}

function getRegistrationEventId(registration) {
    const event = getRegistrationEvent(registration);

    if (event && typeof event === "object") {
        return getEventId(event);
    }

    return event ? String(event) : "";
}

function getEventName(event) {
    if (!event) return "Event";

    if (typeof event === "string") {
        return event;
    }

    return event.title || event.name || event.eventName || "Event";
}

function getEventCategory(event) {
    if (!event) return "General";

    if (typeof event.category === "object" && event.category !== null) {
        return event.category.name || "General";
    }

    return event.category || "General";
}

function formatDate(value) {
    if (!value) return "Date not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDateOnly(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function normalizeStatus(value) {
    return String(value || "pending")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function setCount(elementId, count) {
    const element = getElement(elementId);

    if (element) {
        element.textContent = String(count);
    }
}


/* =========================================================
   5. STUDENT PROFILE
========================================================= */

function loadStudentProfile() {
    const user = getLoggedInUser();

    const studentNameElement = getElement("student-name");
    const avatarElement = getElement("avatar");

    if (!user) {
        if (studentNameElement) {
            studentNameElement.textContent = "Student";
        }

        if (avatarElement) {
            avatarElement.textContent = "S";
        }

        return;
    }

    const name =
        user.name ||
        user.fullName ||
        user.username ||
        user.email ||
        "Student";

    if (studentNameElement) {
        studentNameElement.textContent = name;
    }

    if (avatarElement) {
        avatarElement.textContent = name.trim().charAt(0).toUpperCase() || "S";
    }
}


/* =========================================================
   6. DASHBOARD STATISTICS
========================================================= */

function updateDashboardStats(registrations, attendance, certificates) {
    setCount("registered-count", registrations.length);
    setCount("attendance-count", attendance.length);
    setCount("certificate-count", certificates.length);
}


/* =========================================================
   7. BROWSE EVENTS
========================================================= */

let allEvents = [];
let allRegistrations = [];

async function loadBrowseEvents() {
    const container = getElement("browse-events-list");

    if (!container) return;

    showMessage("browse-events-message", "Loading events...");

    try {
        const response = await apiRequest(API.events);

        allEvents = extractArray(response, [
            "events",
            "results",
            "items"
        ]);

        renderBrowseEvents(allEvents);
    } catch (error) {
        console.error("Could not load events:", error);

        container.replaceChildren();

        showMessage(
            "browse-events-message",
            error.message || "Unable to load events.",
            "error"
        );
    }
}

function renderBrowseEvents(events) {
    const container = getElement("browse-events-list");

    if (!container) return;

    container.replaceChildren();

    if (!events.length) {
        showMessage(
            "browse-events-message",
            "No events found. Please check again later."
        );

        return;
    }

    clearMessage("browse-events-message");

    events.forEach((event) => {
        const eventId = getEventId(event);

        const card = createElement("article", "event-card");

        addText(
            card,
            "h3",
            "data-item-title",
            getEventName(event)
        );

        addText(
            card,
            "p",
            "event-category",
            `Category: ${getEventCategory(event)}`
        );

        addText(
            card,
            "p",
            "",
            `Date: ${formatDate(event.date || event.eventDate)}`
        );

        addText(
            card,
            "p",
            "",
            `Venue: ${event.venue || event.location || "Not announced"}`
        );

        if (event.description) {
            addText(card, "p", "event-description", event.description);
        }

        const status = normalizeStatus(event.status);

        if (status === "cancelled") {
            addText(card, "span", "status cancelled", "Cancelled");
        } else if (status === "completed") {
            addText(card, "span", "status completed", "Completed");
        }

        const actions = createElement("div", "event-actions");

        if (eventId) {
            const detailsButton = createButton(
                "View Details",
                "secondary-button",
                () => {
                    window.location.href =
                        `../event-details/index.html?id=${encodeURIComponent(eventId)}`;
                }
            );

            actions.appendChild(detailsButton);

            const alreadyRegistered = allRegistrations.some((registration) => {
                return (
                    getRegistrationEventId(registration) === eventId &&
                    !["cancelled", "canceled", "rejected"].includes(
                        normalizeStatus(registration.status)
                    )
                );
            });

            const eventIsUnavailable = [
                "cancelled",
                "completed"
            ].includes(status);

            if (alreadyRegistered) {
                const registeredButton = createButton(
                    "Already Registered",
                    "secondary-button",
                    () => {
                        window.location.href = "#registered-events-section";
                    }
                );

                registeredButton.disabled = true;
                actions.appendChild(registeredButton);
            } else if (!eventIsUnavailable) {
                const registerButton = createButton(
                    "Register",
                    "register-button",
                    async () => {
                        await registerForEvent(eventId, registerButton);
                    }
                );

                actions.appendChild(registerButton);
            }
        }

        card.appendChild(actions);
        container.appendChild(card);
    });
}


/* =========================================================
   8. SEARCH AND CATEGORY FILTER
========================================================= */

function filterEvents() {
    const searchInput = getElement("event-search");
    const categoryInput = getElement("event-category");

    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const selectedCategory = categoryInput
        ? categoryInput.value.trim().toLowerCase()
        : "";

    const filteredEvents = allEvents.filter((event) => {
        const title = getEventName(event).toLowerCase();

        const description = String(event.description || "").toLowerCase();

        const venue = String(
            event.venue || event.location || ""
        ).toLowerCase();

        const category = String(getEventCategory(event)).toLowerCase();

        const matchesSearch =
            !searchText ||
            title.includes(searchText) ||
            description.includes(searchText) ||
            venue.includes(searchText) ||
            category.includes(searchText);

        const matchesCategory =
            !selectedCategory ||
            selectedCategory === "all" ||
            category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    renderBrowseEvents(filteredEvents);
}

function setupEventFilters() {
    const searchButton = getElement("search-events-button");
    const searchInput = getElement("event-search");
    const categoryInput = getElement("event-category");

    if (searchButton) {
        searchButton.addEventListener("click", filterEvents);
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                filterEvents();
            }
        });
    }

    if (categoryInput) {
        categoryInput.addEventListener("change", filterEvents);
    }
}


/* =========================================================
   9. REGISTER FOR AN EVENT
========================================================= */

async function registerForEvent(eventId, button) {
    if (!getToken()) {
        setPageMessage("Please log in to register for an event.", "error");
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Registering...";
    }

    try {
        await apiRequest(API.registerForEvent(eventId), {
            method: "POST"
        });

        clearPageMessage();

        setPageMessage("Registration successful!", "success");

        await loadRegistrations();
        await loadBrowseEvents();
    } catch (error) {
        console.error("Registration failed:", error);

        setPageMessage(
            error.message || "Could not register for this event.",
            "error"
        );

        if (button) {
            button.disabled = false;
            button.textContent = "Register";
        }
    }
}


/* =========================================================
   10. MY REGISTRATIONS
========================================================= */

async function loadRegistrations() {
    try {
        const response = await apiRequest(API.myRegistrations);

        allRegistrations = extractArray(response, [
            "registrations",
            "results",
            "items"
        ]);

        renderRegistrations(allRegistrations);

        return allRegistrations;
    } catch (error) {
        console.error("Could not load registrations:", error);

        showMessage(
            "registrations-message",
            error.message || "Unable to load your registrations.",
            "error"
        );

        return [];
    }
}

function renderRegistrations(registrations) {
    const container = getElement("events-list");

    if (!container) return;

    container.replaceChildren();

    if (!registrations.length) {
        showMessage(
            "registrations-message",
            "You have not registered for any events yet."
        );

        return;
    }

    clearMessage("registrations-message");

    registrations.forEach((registration) => {
        const event = getRegistrationEvent(registration);

        const eventId = getRegistrationEventId(registration);

        const card = createElement("article", "data-item");

        addText(
            card,
            "h3",
            "data-item-title",
            getEventName(event)
        );

        if (event && typeof event === "object") {
            addText(
                card,
                "p",
                "",
                `Date: ${formatDate(event.date || event.eventDate)}`
            );

            addText(
                card,
                "p",
                "",
                `Venue: ${event.venue || event.location || "Not announced"}`
            );
        }

        const rawStatus =
            registration.status ||
            registration.registrationStatus ||
            "registered";

        const normalizedStatus = normalizeStatus(rawStatus);

        const statusLabels = {
            registered: "Registered",
            confirmed: "Confirmed",
            cancelled: "Cancelled",
            canceled: "Cancelled",
            attended: "Attended",
            completed: "Completed",
            pending: "Pending",
            rejected: "Rejected"
        };

        const statusClasses = {
            registered: "registered",
            confirmed: "confirmed",
            cancelled: "cancelled",
            canceled: "cancelled",
            attended: "attended",
            completed: "completed",
            pending: "pending",
            rejected: "rejected"
        };

        const statusLabel =
            statusLabels[normalizedStatus] ||
            String(rawStatus);

        const statusClass =
            statusClasses[normalizedStatus] || "pending";

        addText(
            card,
            "span",
            `status ${statusClass}`,
            statusLabel
        );

        const actions = createElement("div", "event-actions");

        if (eventId) {
            const detailsButton = createButton(
                "View Details",
                "secondary-button",
                () => {
                    window.location.href =
                        `../event-details/index.html?id=${encodeURIComponent(eventId)}`;
                }
            );

            actions.appendChild(detailsButton);
        }

        const cannotCancel = [
            "cancelled",
            "canceled",
            "attended",
            "completed",
            "rejected"
        ].includes(normalizedStatus);

        const eventStatus = normalizeStatus(
            event && typeof event === "object" ? event.status : ""
        );

        const eventIsClosed = [
            "cancelled",
            "completed"
        ].includes(eventStatus);

        if (eventId && !cannotCancel && !eventIsClosed) {
            const cancelButton = createButton(
                "Cancel Registration",
                "cancel-button",
                async () => {
                    const confirmed = window.confirm(
                        `Are you sure you want to cancel your registration for "${getEventName(event)}"?`
                    );

                    if (confirmed) {
                        await cancelRegistration(eventId, cancelButton);
                    }
                }
            );

            actions.appendChild(cancelButton);
        }

        card.appendChild(actions);
        container.appendChild(card);
    });
}


/* =========================================================
   11. CANCEL REGISTRATION
========================================================= */

async function cancelRegistration(eventId, button) {
    if (button) {
        button.disabled = true;
        button.textContent = "Cancelling...";
    }

    try {
        await apiRequest(API.cancelRegistration(eventId), {
            method: "DELETE"
        });

        setPageMessage("Registration cancelled successfully.", "success");

        await loadRegistrations();
        await loadBrowseEvents();
    } catch (error) {
        console.error("Could not cancel registration:", error);

        setPageMessage(
            error.message || "Unable to cancel your registration.",
            "error"
        );

        if (button) {
            button.disabled = false;
            button.textContent = "Cancel Registration";
        }
    }
}


/* =========================================================
   12. MY ATTENDANCE
========================================================= */

async function loadAttendance() {
    try {
        const response = await apiRequest(API.myAttendance);

        const attendance = extractArray(response, [
            "attendance",
            "records",
            "results",
            "items"
        ]);

        renderAttendance(attendance);

        return attendance;
    } catch (error) {
        console.error("Could not load attendance:", error);

        showMessage(
            "attendance-message",
            error.message || "Unable to load attendance.",
            "error"
        );

        return [];
    }
}

function renderAttendance(attendance) {
    const container = getElement("attendance-list");

    if (!container) return;

    container.replaceChildren();

    if (!attendance.length) {
        showMessage(
            "attendance-message",
            "No attendance records are available yet."
        );

        return;
    }

    clearMessage("attendance-message");

    attendance.forEach((record) => {
        const event =
            record.event ||
            record.eventId ||
            record.eventDetails ||
            null;

        const card = createElement("article", "data-item");

        addText(
            card,
            "h3",
            "data-item-title",
            getEventName(event)
        );

        const attendanceDate =
            record.checkedInAt ||
            record.attendedAt ||
            record.createdAt ||
            record.date;

        addText(
            card,
            "p",
            "",
            `Attendance date: ${formatDate(attendanceDate)}`
        );

        const status =
            record.status ||
            record.attendanceStatus ||
            "Present";

        addText(
            card,
            "span",
            `status ${normalizeStatus(status)}`,
            String(status)
        );

        const eventId =
            event && typeof event === "object"
                ? getEventId(event)
                : event
                    ? String(event)
                    : "";

        if (eventId) {
            const detailsButton = createButton(
                "View Event",
                "secondary-button",
                () => {
                    window.location.href =
                        `../event-details/index.html?id=${encodeURIComponent(eventId)}`;
                }
            );

            card.appendChild(detailsButton);
        }

        container.appendChild(card);
    });
}


/* =========================================================
   13. MY CERTIFICATES
========================================================= */

async function loadCertificates() {
    try {
        const response = await apiRequest(API.myCertificates);

        const certificates = extractArray(response, [
            "certificates",
            "results",
            "items"
        ]);

        renderCertificates(certificates);

        return certificates;
    } catch (error) {
        console.error("Could not load certificates:", error);

        showMessage(
            "certificates-message",
            error.message || "Unable to load your certificates.",
            "error"
        );

        return [];
    }
}

function renderCertificates(certificates) {
    const container = getElement("certificates-list");

    if (!container) return;

    container.replaceChildren();

    if (!certificates.length) {
        showMessage(
            "certificates-message",
            "No certificates are available yet."
        );

        return;
    }

    clearMessage("certificates-message");

    certificates.forEach((certificate) => {
        const card = createElement("article", "data-item");

        const event =
            certificate.event ||
            certificate.eventId ||
            certificate.eventDetails ||
            null;

        addText(
            card,
            "h3",
            "data-item-title",
            certificate.title ||
            (event && typeof event === "object" ? getEventName(event) : "") ||
            certificate.eventName ||
            "Event Certificate"
        );

        const issuedDate =
            certificate.issuedAt ||
            certificate.createdAt ||
            certificate.issueDate;

        addText(
            card,
            "p",
            "",
            `Issued: ${formatDateOnly(issuedDate)}`
        );

        const certificateId =
            certificate._id ||
            certificate.id ||
            certificate.certificateId;

        /*
         * VERIFY CERTIFICATE BUTTON
         * Opens the certificate verification page.
         */

        if (certificateId) {
            const verifyButton = createButton(
                "Verify Certificate",
                "secondary-button",
                () => {
                    window.location.href =
                        `../certificate-verification/index.html?id=${encodeURIComponent(certificateId)}`;
                }
            );

            card.appendChild(verifyButton);
        }

        /*
         * OPEN / DOWNLOAD CERTIFICATE
         */

        const certificateUrl =
            certificate.certificateUrl ||
            certificate.fileUrl ||
            certificate.downloadUrl;

        if (certificateUrl) {
            const downloadLink = createElement(
                "a",
                "primary-button",
                "Open Certificate"
            );

            downloadLink.href = certificateUrl;
            downloadLink.target = "_blank";
            downloadLink.rel = "noopener noreferrer";

            card.appendChild(downloadLink);
        }

        container.appendChild(card);
    });
}


/* =========================================================
   14. LOGOUT
========================================================= */

function logout() {
    const confirmed = window.confirm("Are you sure you want to log out?");

    if (!confirmed) return;

    const storageKeys = [
        "token",
        "authToken",
        "user",
        "currentUser",
        "loggedInUser"
    ];

    storageKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    window.location.href = "../login/index.html";
}

function setupLogout() {
    const logoutButton = getElement("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }
}


/* =========================================================
   15. LOAD DASHBOARD
========================================================= */

async function loadDashboard() {
    loadStudentProfile();
    setupEventFilters();
    setupLogout();

    const currentYearElement = getElement("current-year");

    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    if (!getToken()) {
        setPageMessage(
            "You are not logged in. Please log in to view your dashboard.",
            "error"
        );

        return;
    }

    clearPageMessage();

    /*
     * Load each dashboard section independently.
     * A failure in one section will not prevent the others
     * from loading.
     */

    const results = await Promise.allSettled([
        loadRegistrations(),
        loadAttendance(),
        loadCertificates(),
        loadBrowseEvents()
    ]);

    const registrationsResult = results[0];
    const attendanceResult = results[1];
    const certificatesResult = results[2];

    const registrations =
        registrationsResult.status === "fulfilled"
            ? registrationsResult.value
            : [];

    const attendance =
        attendanceResult.status === "fulfilled"
            ? attendanceResult.value
            : [];

    const certificates =
        certificatesResult.status === "fulfilled"
            ? certificatesResult.value
            : [];

    updateDashboardStats(
        registrations,
        attendance,
        certificates
    );
}


/* =========================================================
   16. START APPLICATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});
