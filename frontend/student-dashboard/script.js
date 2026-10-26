
"use strict";

/*
 * CampusConnect - Student Dashboard
 *
 * Backend base URL:
 *   http://localhost:5000
 *
 * Expected API endpoints:
 *   GET    /api/events/upcoming
 *   GET    /api/registrations/my
 *   POST   /api/registrations/event/:eventId
 *   DELETE /api/registrations/event/:eventId
 *   GET    /api/attendance/my
 *   GET    /api/certificates/my
 *   GET    /api/certificates/event/:eventId
 *
 * Confirm the registration routes against your backend before testing
 * registration and cancellation.
 */

const API_BASE_URL = "http://localhost:5000/api";

const STORAGE_KEYS = {
    token: ["token", "accessToken", "authToken"],
    user: ["user", "currentUser", "student", "loggedInUser"]
};

const state = {
    events: [],
    registrations: [],
    attendance: [],
    certificates: [],
    registeredEventIds: new Set(),
    search: "",
    category: "",
    busyEventIds: new Set()
};

const elements = {
    studentName: document.getElementById("student-name"),
    avatar: document.getElementById("avatar"),

    registeredCount: document.getElementById("registered-count"),
    attendanceCount: document.getElementById("attendance-count"),
    certificateCount: document.getElementById("certificate-count"),

    pageMessage: document.getElementById("page-message"),

    eventSearch: document.getElementById("event-search"),
    eventCategory: document.getElementById("event-category"),
    searchEventsButton: document.getElementById("search-events-button"),
    refreshEventsButton: document.getElementById("refresh-events-button"),
    browseEventsMessage: document.getElementById("browse-events-message"),
    browseEventsList: document.getElementById("browse-events-list"),

    registrationsMessage: document.getElementById("registrations-message"),
    registrationsList: document.getElementById("events-list"),
    refreshRegistrationsButton:
        document.getElementById("refresh-registrations-button"),

    attendanceMessage: document.getElementById("attendance-message"),
    attendanceList: document.getElementById("attendance-list"),
    refreshAttendanceButton:
        document.getElementById("refresh-attendance-button"),

    certificatesMessage: document.getElementById("certificates-message"),
    certificatesList: document.getElementById("certificates-list"),
    refreshCertificatesButton:
        document.getElementById("refresh-certificates-button"),

    logoutButton: document.getElementById("logout-button"),
    mobileMenuButton: document.getElementById("mobile-menu-button"),
    mainNavigation: document.getElementById("main-navigation"),
    currentYear: document.getElementById("current-year")
};

/* -------------------------------------------------------
   1. AUTHENTICATION HELPERS
------------------------------------------------------- */

function readStoredValue(keys) {
    for (const key of keys) {
        const value = localStorage.getItem(key);

        if (value) {
            return value;
        }
    }

    return null;
}

function getToken() {
    return readStoredValue(STORAGE_KEYS.token);
}

function getStoredUser() {
    for (const key of STORAGE_KEYS.user) {
        const value = localStorage.getItem(key);

        if (!value) {
            continue;
        }

        try {
            const parsed = JSON.parse(value);

            if (parsed && typeof parsed === "object") {
                return parsed.user || parsed.student || parsed;
            }
        } catch {
            // Ignore values that are not JSON.
        }
    }

    return {};
}

function getUserName(user) {
    return (
        user.name ||
        user.fullName ||
        user.username ||
        user.firstName ||
        user.email ||
        "Student"
    );
}

function initializeStudentInfo() {
    const user = getStoredUser();
    const name = getUserName(user);

    elements.studentName.textContent = name;
    elements.avatar.textContent = name.trim().charAt(0).toUpperCase() || "S";

    if (!getToken()) {
        showPageMessage(
            "No login token was found. Please log in first. If you have already logged in, check the token key used by your login page.",
            "warning"
        );
    }
}

/* -------------------------------------------------------
   2. GENERAL HELPERS
------------------------------------------------------- */

function showPageMessage(message, type = "") {
    elements.pageMessage.textContent = message;
    elements.pageMessage.className = "page-message";

    if (type) {
        elements.pageMessage.classList.add(type);
    }

    elements.pageMessage.hidden = !message;
}

function showSectionMessage(element, message, type = "") {
    element.textContent = message;
    element.className = "section-message";

    if (type) {
        element.classList.add(type);
    }
}

function clearSectionMessage(element) {
    element.textContent = "";
    element.className = "section-message";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function formatDate(value) {
    if (!value) {
        return "Date not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getId(value) {
    if (!value) {
        return "";
    }

    if (typeof value === "string" || typeof value === "number") {
        return String(value);
    }

    if (typeof value === "object") {
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
        if (value.$oid) return String(value.$oid);
    }

    return "";
}

function getEventFromRecord(record) {
    if (!record || typeof record !== "object") {
        return {};
    }

    return record.event && typeof record.event === "object"
        ? record.event
        : record.eventDetails && typeof record.eventDetails === "object"
            ? record.eventDetails
            : record;
}

function getEventId(record) {
    if (!record || typeof record !== "object") {
        return "";
    }

    const event = getEventFromRecord(record);

    return (
        getId(record.eventId) ||
        getId(record.event) ||
        getId(event._id) ||
        getId(event.id) ||
        getId(record.eventDetails?._id) ||
        ""
    );
}

function getEventTitle(record) {
    const event = getEventFromRecord(record);

    return (
        event.title ||
        event.name ||
        record.title ||
        record.eventTitle ||
        "Untitled event"
    );
}

function getArrayFromResponse(data, preferredKeys = []) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        return [];
    }

    for (const key of preferredKeys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    // Common API response shapes.
    for (const key of ["data", "results", "items", "events", "records"]) {
        if (Array.isArray(data[key])) {
            return data[key];
        }

        if (data[key] && typeof data[key] === "object") {
            for (const nestedKey of preferredKeys) {
                if (Array.isArray(data[key][nestedKey])) {
                    return data[key][nestedKey];
                }
            }
        }
    }

    return [];
}

function getCategory(event) {
    const category = event.category;

    if (typeof category === "string") {
        return category;
    }

    if (category && typeof category === "object") {
        return category.name || category.title || "Other";
    }

    return "Other";
}

function getClubName(event) {
    const club = event.club;

    if (typeof club === "string") {
        return club;
    }

    if (club && typeof club === "object") {
        return club.name || club.title || "College club";
    }

    return "College event";
}

function getVenue(event) {
    if (typeof event.venue === "string") {
        return event.venue;
    }

    if (event.venue && typeof event.venue === "object") {
        return event.venue.name || event.venue.address || "Venue not announced";
    }

    return "Venue not announced";
}

function getErrorMessage(error, fallback) {
    if (error && error.message) {
        return error.message;
    }

    return fallback;
}

/* -------------------------------------------------------
   3. API REQUEST HELPER
------------------------------------------------------- */

async function apiRequest(path, options = {}) {
    const token = getToken();

    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let body = options.body;

    if (body && typeof body !== "string") {
        body = JSON.stringify(body);
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
            body
        });
    } catch {
        throw new Error(
            "Cannot connect to the backend. Make sure the server is running at http://localhost:5000."
        );
    }

    if (response.status === 401) {
        throw new Error(
            "Your login session is missing or expired. Please log in again."
        );
    }

    const contentType = response.headers.get("content-type") || "";

    let data = null;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else if (response.status !== 204) {
        const text = await response.text();
        data = text ? { message: text } : null;
    }

    if (!response.ok) {
        const message =
            data?.message ||
            data?.error ||
            `Request failed with HTTP ${response.status}.`;

        throw new Error(message);
    }

    return data;
}

/* -------------------------------------------------------
   4. EVENTS
------------------------------------------------------- */

async function loadEvents() {
    showSectionMessage(elements.browseEventsMessage, "Loading upcoming events...");
    elements.browseEventsList.replaceChildren();

    try {
        const data = await apiRequest("/events/upcoming");

        state.events = getArrayFromResponse(data, [
            "events",
            "upcomingEvents"
        ]);

        renderEvents();
    } catch (error) {
        showSectionMessage(
            elements.browseEventsMessage,
            getErrorMessage(error, "Unable to load events."),
            "error"
        );

        if (error.message.includes("login session")) {
            showPageMessage(error.message, "warning");
        }
    }
}

function renderEvents() {
    const searchTerm = state.search.trim().toLowerCase();
    const selectedCategory = state.category.trim().toLowerCase();

    const filteredEvents = state.events.filter(event => {
        const text = [
            event.title,
            event.description,
            getVenue(event),
            getClubName(event),
            getCategory(event)
        ].join(" ").toLowerCase();

        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesCategory =
            !selectedCategory ||
            getCategory(event).toLowerCase() === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    elements.browseEventsList.replaceChildren();

    if (filteredEvents.length === 0) {
        showSectionMessage(
            elements.browseEventsMessage,
            state.events.length === 0
                ? "No upcoming events are available right now."
                : "No events match your search. Try another keyword or category."
        );
        return;
    }

    showSectionMessage(
        elements.browseEventsMessage,
        `${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"} found.`
    );

    for (const event of filteredEvents) {
        const eventId = getId(event._id || event.id);
        const isRegistered = state.registeredEventIds.has(eventId);
        const isBusy = state.busyEventIds.has(eventId);

        const card = document.createElement("article");
        card.className = "event-card";

        const category = escapeHTML(getCategory(event));
        const title = escapeHTML(getEventTitle(event));
        const description = escapeHTML(
            event.description || "Join this college event and explore new opportunities."
        );
        const venue = escapeHTML(getVenue(event));
        const club = escapeHTML(getClubName(event));
        const date = escapeHTML(formatDate(event.date || event.startDate));

        card.innerHTML = `
            <span class="category-badge">${category}</span>
            <h3>${title}</h3>
            <p class="event-description">${description}</p>

            <div class="event-meta">
                <span><strong>Date:</strong> ${date}</span>
                <span><strong>Venue:</strong> ${venue}</span>
                <span><strong>Club:</strong> ${club}</span>
                ${event.capacity != null
                    ? `<span><strong>Capacity:</strong> ${escapeHTML(event.capacity)}</span>`
                    : ""}
            </div>

            <div class="card-actions">
                <button
                    type="button"
                    class="${isRegistered ? "secondary-button" : "primary-button"}"
                    data-action="${isRegistered ? "already-registered" : "register"}"
                    data-event-id="${escapeHTML(eventId)}"
                    ${!eventId || isRegistered || isBusy ? "disabled" : ""}
                >
                    ${isBusy
                        ? "Please wait..."
                        : isRegistered
                            ? "Registered"
                            : "Register"}
                </button>
            </div>
        `;

        elements.browseEventsList.appendChild(card);
    }
}

async function registerForEvent(eventId) {
    if (!eventId || state.busyEventIds.has(eventId)) {
        return;
    }

    if (!getToken()) {
        showPageMessage("Please log in before registering for an event.", "warning");
        return;
    }

    const event = state.events.find(
        item => getId(item._id || item.id) === eventId
    );

    const title = event ? getEventTitle(event) : "this event";

    if (!window.confirm(`Do you want to register for "${title}"?`)) {
        return;
    }

    state.busyEventIds.add(eventId);
    renderEvents();

    try {
        await apiRequest(
            `/registrations/event/${encodeURIComponent(eventId)}`,
            { method: "POST" }
        );

        showPageMessage("Registration completed successfully.", "success");

        await Promise.all([
            loadRegistrations(),
            loadEvents()
        ]);
    } catch (error) {
        showPageMessage(
            `Could not register: ${getErrorMessage(error, "Please try again.")}`,
            "error"
        );

        state.busyEventIds.delete(eventId);
        renderEvents();
    }
}

/* -------------------------------------------------------
   5. REGISTRATIONS
------------------------------------------------------- */

async function loadRegistrations() {
    showSectionMessage(elements.registrationsMessage, "Loading your registrations...");
    elements.registrationsList.replaceChildren();

    try {
        const data = await apiRequest("/registrations/my");

        state.registrations = getArrayFromResponse(data, [
            "registrations",
            "myRegistrations"
        ]);

        state.registeredEventIds = new Set(
            state.registrations
                .map(getEventId)
                .filter(Boolean)
        );

        elements.registeredCount.textContent = String(
            state.registrations.length
        );

        renderRegistrations();
        renderEvents();
    } catch (error) {
        showSectionMessage(
            elements.registrationsMessage,
            `Could not load registrations: ${getErrorMessage(error, "Please try again.")}`,
            "error"
        );

        elements.registeredCount.textContent = "—";

        if (error.message.includes("login session")) {
            showPageMessage(error.message, "warning");
        }
    }
}

function renderRegistrations() {
    elements.registrationsList.replaceChildren();

    if (state.registrations.length === 0) {
        showSectionMessage(
            elements.registrationsMessage,
            "You have not registered for any events yet."
        );
        return;
    }

    showSectionMessage(
        elements.registrationsMessage,
        `${state.registrations.length} registration record(s) found.`
    );

    for (const registration of state.registrations) {
        const event = getEventFromRecord(registration);
        const eventId = getEventId(registration);
        const status = String(
            registration.status ||
            registration.registrationStatus ||
            "registered"
        ).toLowerCase();

        const card = document.createElement("article");
        card.className = "list-card";

        const main = document.createElement("div");
        main.className = "list-card-main";

        const title = document.createElement("h3");
        title.textContent = getEventTitle(registration);

        const date = document.createElement("p");
        date.textContent = `Date: ${formatDate(event.date || event.startDate)}`;

        const venue = document.createElement("p");
        venue.textContent = `Venue: ${getVenue(event)}`;

        const statusBadge = document.createElement("span");
        statusBadge.className = `status-badge ${
            status.includes("cancel") || status.includes("reject")
                ? "danger"
                : status.includes("pending")
                    ? "warning"
                    : "success"
        }`;
        statusBadge.textContent = status;

        main.append(title, date, venue, statusBadge);

        const actions = document.createElement("div");
        actions.className = "list-card-actions";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "danger-button";
        cancelButton.textContent = "Cancel Registration";
        cancelButton.dataset.action = "cancel-registration";
        cancelButton.dataset.eventId = eventId;

        const isBusy = state.busyEventIds.has(eventId);

        // Do not offer cancellation for cancelled/completed events.
        const eventStatus = String(event.status || "").toLowerCase();
        const isPastEvent =
            event.date && new Date(event.date).getTime() < Date.now();

        cancelButton.disabled =
            !eventId ||
            isBusy ||
            status.includes("cancel") ||
            status.includes("reject") ||
            eventStatus === "cancelled" ||
            eventStatus === "completed" ||
            Boolean(isPastEvent);

        if (cancelButton.disabled && isBusy) {
            cancelButton.textContent = "Please wait...";
        }

        actions.appendChild(cancelButton);
        card.append(main, actions);
        elements.registrationsList.appendChild(card);
    }
}

async function cancelRegistration(eventId) {
    if (!eventId || state.busyEventIds.has(eventId)) {
        return;
    }

    const registration = state.registrations.find(
        item => getEventId(item) === eventId
    );

    const title = registration ? getEventTitle(registration) : "this event";

    if (!window.confirm(`Cancel your registration for "${title}"?`)) {
        return;
    }

    state.busyEventIds.add(eventId);
    renderRegistrations();

    try {
        await apiRequest(
            `/registrations/event/${encodeURIComponent(eventId)}`,
            { method: "DELETE" }
        );

        showPageMessage("Registration cancelled successfully.", "success");

        await Promise.all([
            loadRegistrations(),
            loadEvents()
        ]);
    } catch (error) {
        showPageMessage(
            `Could not cancel registration: ${getErrorMessage(error, "Please try again.")}`,
            "error"
        );

        state.busyEventIds.delete(eventId);
        renderRegistrations();
    }
}

/* -------------------------------------------------------
   6. ATTENDANCE
------------------------------------------------------- */

async function loadAttendance() {
    showSectionMessage(elements.attendanceMessage, "Loading attendance records...");
    elements.attendanceList.replaceChildren();

    try {
        const data = await apiRequest("/attendance/my");

        state.attendance = getArrayFromResponse(data, [
            "attendance",
            "records",
            "attendanceRecords"
        ]);

        elements.attendanceCount.textContent = String(
            state.attendance.filter(record => {
                const status = String(record.status || "").toLowerCase();
                return status === "present" || status === "attended";
            }).length
        );

        renderAttendance();
    } catch (error) {
        showSectionMessage(
            elements.attendanceMessage,
            `Could not load attendance: ${getErrorMessage(error, "Please try again.")}`,
            "error"
        );

        elements.attendanceCount.textContent = "—";
    }
}

function renderAttendance() {
    elements.attendanceList.replaceChildren();

    if (state.attendance.length === 0) {
        showSectionMessage(
            elements.attendanceMessage,
            "No attendance records are available yet."
        );
        return;
    }

    showSectionMessage(
        elements.attendanceMessage,
        `${state.attendance.length} attendance record(s) found.`
    );

    for (const record of state.attendance) {
        const event = getEventFromRecord(record);
        const status = String(record.status || "recorded").toLowerCase();

        const card = document.createElement("article");
        card.className = "list-card";

        const main = document.createElement("div");
        main.className = "list-card-main";

        const title = document.createElement("h3");
        title.textContent = getEventTitle(record);

        const date = document.createElement("p");
        date.textContent = `Event date: ${formatDate(event.date || event.startDate)}`;

        const attendanceDate = document.createElement("p");
        attendanceDate.textContent =
            `Attendance recorded: ${formatDate(record.createdAt || record.checkInTime || record.date)}`;

        const badge = document.createElement("span");
        badge.className = `status-badge ${
            status === "present" || status === "attended"
                ? "success"
                : status === "absent"
                    ? "danger"
                    : "warning"
        }`;
        badge.textContent = status;

        main.append(title, date, attendanceDate, badge);
        card.appendChild(main);

        elements.attendanceList.appendChild(card);
    }
}

/* -------------------------------------------------------
   7. CERTIFICATES
------------------------------------------------------- */

async function loadCertificates() {
    showSectionMessage(elements.certificatesMessage, "Loading certificates...");
    elements.certificatesList.replaceChildren();

    try {
        const data = await apiRequest("/certificates/my");

        state.certificates = getArrayFromResponse(data, [
            "certificates",
            "myCertificates"
        ]);

        elements.certificateCount.textContent = String(
            state.certificates.length
        );

        renderCertificates();
    } catch (error) {
        showSectionMessage(
            elements.certificatesMessage,
            `Could not load certificates: ${getErrorMessage(error, "Please try again.")}`,
            "error"
        );

        elements.certificateCount.textContent = "—";
    }
}

function renderCertificates() {
    elements.certificatesList.replaceChildren();

    if (state.certificates.length === 0) {
        showSectionMessage(
            elements.certificatesMessage,
            "No certificates have been issued to you yet. Certificates may become available after you attend an eligible completed event."
        );
        return;
    }

    showSectionMessage(
        elements.certificatesMessage,
        `${state.certificates.length} certificate(s) available.`
    );

    for (const certificate of state.certificates) {
        const event = getEventFromRecord(certificate);
        const eventId = getEventId(certificate);

        const card = document.createElement("article");
        card.className = "list-card";

        const main = document.createElement("div");
        main.className = "list-card-main";

        const title = document.createElement("h3");
        title.textContent = getEventTitle(certificate);

        const idText = document.createElement("p");
        idText.textContent =
            `Certificate ID: ${certificate.certificateId || "Not available"}`;

        const issuedText = document.createElement("p");
        issuedText.textContent =
            `Issued: ${formatDate(certificate.issuedAt || certificate.createdAt)}`;

        const badge = document.createElement("span");
        badge.className = "status-badge success";
        badge.textContent = "Certificate available";

        main.append(title, idText, issuedText, badge);

        const actions = document.createElement("div");
        actions.className = "list-card-actions";

        const downloadButton = document.createElement("button");
        downloadButton.type = "button";
        downloadButton.className = "primary-button";
        downloadButton.textContent = "Download PDF";
        downloadButton.dataset.action = "download-certificate";
        downloadButton.dataset.eventId = eventId;
        downloadButton.disabled = !eventId;

        actions.appendChild(downloadButton);
        card.append(main, actions);

        elements.certificatesList.appendChild(card);
    }
}

async function downloadCertificate(eventId, button) {
    if (!eventId) {
        showPageMessage("This certificate does not have a valid event ID.", "error");
        return;
    }

    if (!getToken()) {
        showPageMessage("Please log in before downloading a certificate.", "warning");
        return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Preparing PDF...";

    try {
        const token = getToken();

        const response = await fetch(
            `${API_BASE_URL}/certificates/event/${encodeURIComponent(eventId)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/pdf, application/json"
                }
            }
        );

        if (response.status === 401) {
            throw new Error("Your login session has expired. Please log in again.");
        }

        const contentType = response.headers.get("content-type") || "";

        if (!response.ok || contentType.includes("application/json")) {
            let message = `Certificate download failed (HTTP ${response.status}).`;

            if (contentType.includes("application/json")) {
                const data = await response.json();
                message = data.message || data.error || message;
            }

            throw new Error(message);
        }

        const blob = await response.blob();

        if (!blob.size) {
            throw new Error("The server returned an empty certificate file.");
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `CampusConnect-Certificate-${eventId}.pdf`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showPageMessage("Certificate download started.", "success");
    } catch (error) {
        showPageMessage(
            `Could not download certificate: ${getErrorMessage(error, "Please try again.")}`,
            "error"
        );
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

/* -------------------------------------------------------
   8. SEARCH, REFRESH AND NAVIGATION
------------------------------------------------------- */

function searchEvents() {
    state.search = elements.eventSearch.value;
    state.category = elements.eventCategory.value;
    renderEvents();
}

function setupNavigation() {
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");

            elements.mainNavigation.classList.remove("open");
            elements.mobileMenuButton.setAttribute("aria-expanded", "false");
        });
    });

    elements.mobileMenuButton.addEventListener("click", () => {
        const isOpen = elements.mainNavigation.classList.toggle("open");

        elements.mobileMenuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });
}

function setupEventListeners() {
    elements.searchEventsButton.addEventListener("click", searchEvents);

    elements.eventSearch.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            searchEvents();
        }
    });

    elements.eventCategory.addEventListener("change", searchEvents);

    elements.refreshEventsButton.addEventListener("click", loadEvents);
    elements.refreshRegistrationsButton.addEventListener(
        "click",
        loadRegistrations
    );
    elements.refreshAttendanceButton.addEventListener("click", loadAttendance);
    elements.refreshCertificatesButton.addEventListener(
        "click",
        loadCertificates
    );

    elements.logoutButton.addEventListener("click", handleLogout);

    // Event delegation for dynamically created buttons.
    document.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button || button.disabled) {
            return;
        }

        const action = button.dataset.action;
        const eventId = button.dataset.eventId;

        if (action === "register") {
            registerForEvent(eventId);
        } else if (action === "cancel-registration") {
            cancelRegistration(eventId);
        } else if (action === "download-certificate") {
            downloadCertificate(eventId, button);
        }
    });
}

function handleLogout() {
    const confirmed = window.confirm("Are you sure you want to log out?");

    if (!confirmed) {
        return;
    }

    // Clear common authentication keys only.
    for (const key of [...STORAGE_KEYS.token, ...STORAGE_KEYS.user]) {
        localStorage.removeItem(key);
    }

    /*
     * Update this path if your login page uses a different filename.
     * This assumes login.html is inside frontend/.
     */
    window.location.href = "../login.html";
}

/* -------------------------------------------------------
   9. INITIALIZE DASHBOARD
------------------------------------------------------- */

async function initializeDashboard() {
    elements.currentYear.textContent = String(new Date().getFullYear());

    initializeStudentInfo();
    setupNavigation();
    setupEventListeners();

    if (!getToken()) {
        showSectionMessage(
            elements.browseEventsMessage,
            "Please log in to load your student dashboard.",
            "error"
        );

        showSectionMessage(
            elements.registrationsMessage,
            "Login is required to load registrations."
        );

        showSectionMessage(
            elements.attendanceMessage,
            "Login is required to load attendance."
        );

        showSectionMessage(
            elements.certificatesMessage,
            "Login is required to load certificates."
        );

        elements.registeredCount.textContent = "—";
        elements.attendanceCount.textContent = "—";
        elements.certificateCount.textContent = "—";
        return;
    }

    // Load each section independently so one failing endpoint
    // does not prevent the other sections from loading.
    await Promise.allSettled([
        loadEvents(),
        loadRegistrations(),
        loadAttendance(),
        loadCertificates()
    ]);
}

document.addEventListener("DOMContentLoaded", initializeDashboard);
