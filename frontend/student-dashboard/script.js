const API_BASE_URL = "http://localhost:5000/api";

const API = {
    events: `${API_BASE_URL}/events`,
    myRegistrations: `${API_BASE_URL}/registrations/my`,
    myAttendance: `${API_BASE_URL}/attendance/my`,
    myCertificates: `${API_BASE_URL}/certificates/my`,

    // Confirm these routes against your registration.routes.js.
    registerForEvent: (eventId) =>
        `${API_BASE_URL}/registrations/event/${eventId}`,

    cancelRegistration: (eventId) =>
        `${API_BASE_URL}/registrations/event/${eventId}`
};


// ==================== 2. APPLICATION STATE ====================

let allBrowseEvents = [];
let myRegistrations = [];
let myAttendanceRecords = [];
let myCertificates = [];

const registrationRequestsInProgress = new Set();
const cancellationRequestsInProgress = new Set();


// ==================== 3. AUTHENTICATION ====================

function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("authToken") ||
        ""
    );
}


function getStoredUser() {
    const possibleKeys = [
        "user",
        "student",
        "currentUser",
        "loggedInUser"
    ];

    for (const key of possibleKeys) {
        const storedValue =
            localStorage.getItem(key) ||
            sessionStorage.getItem(key);

        if (!storedValue) {
            continue;
        }

        try {
            const parsedValue = JSON.parse(storedValue);

            if (parsedValue && typeof parsedValue === "object") {
                return parsedValue.user || parsedValue;
            }
        } catch (error) {
            console.warn(`Could not parse stored user data for "${key}".`);
        }
    }

    return null;
}


function redirectToLogin() {
    // Change this path if your login page is located elsewhere.
    window.location.href = "../login/index.html";
}


function requireLogin() {
    const token = getToken();

    if (!token) {
        showPageMessage(
            "Please log in to access your student dashboard.",
            "error"
        );

        redirectToLogin();
        return false;
    }

    return true;
}


// ==================== 4. API REQUEST HELPER ====================

async function apiRequest(url, options = {}) {
    const token = getToken();

    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (
        options.body &&
        typeof options.body === "string" &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers
        });
    } catch (error) {
        throw new Error(
            "Cannot connect to the backend. Make sure your Node.js server is running on port 5000."
        );
    }

    const responseText = await response.text();

    let data = null;

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch (error) {
            if (response.ok) {
                data = { message: responseText };
            } else {
                data = null;
            }
        }
    }

    if (response.status === 401) {
        clearLoginData();

        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    if (response.status === 403) {
        throw new Error(
            data?.message ||
            "You do not have permission to perform this action."
        );
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            `Request failed with status ${response.status}.`
        );
    }

    return data;
}


function clearLoginData() {
    [
        "token",
        "authToken",
        "user",
        "student",
        "currentUser",
        "loggedInUser"
    ].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}


// ==================== 5. GENERAL HELPERS ====================

function getErrorMessage(error) {
    return error?.message || "Something went wrong. Please try again.";
}


function getDisplayName(value) {
    if (typeof value === "string") {
        return value;
    }

    if (value && typeof value === "object") {
        return (
            value.name ||
            value.fullName ||
            value.title ||
            value.email ||
            ""
        );
    }

    return "";
}


function extractList(data, possibleKeys = []) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        return [];
    }

    // Handle common Express/Mongoose response formats.
    const keys = [
        ...possibleKeys,
        "data",
        "results",
        "items",
        "events",
        "registrations",
        "attendance",
        "records",
        "certificates"
    ];

    for (const key of keys) {
        const value = data[key];

        if (Array.isArray(value)) {
            return value;
        }

        if (value && typeof value === "object") {
            const nested = extractList(value, []);

            if (nested.length > 0) {
                return nested;
            }
        }
    }

    return [];
}


function formatDate(dateValue) {
    if (!dateValue) {
        return "Date not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}


function getEvent(registration) {
    if (!registration || typeof registration !== "object") {
        return {};
    }

    return (
        registration.event ||
        registration.eventId ||
        registration.eventDetails ||
        {}
    );
}


function getEventId(item) {
    if (!item || typeof item !== "object") {
        return "";
    }

    const event = getEvent(item);

    const id =
        item.eventId?._id ||
        item.eventId?.id ||
        event?._id ||
        event?.id ||
        (typeof item.eventId === "string" ? item.eventId : "") ||
        item.event?._id ||
        item.event?.id ||
        item._id ||
        item.id ||
        "";

    return String(id);
}


function getId(item) {
    if (!item || typeof item !== "object") {
        return "";
    }

    return String(item._id || item.id || "");
}


function getEventTitle(event) {
    return (
        event?.title ||
        event?.name ||
        event?.eventName ||
        "Untitled Event"
    );
}


function getEventVenue(event) {
    return (
        event?.venue ||
        event?.location ||
        event?.place ||
        "Venue not announced"
    );
}


function getEventCategory(event) {
    return (
        event?.category ||
        event?.eventCategory ||
        "Other"
    );
}


function getEventDescription(event) {
    return (
        event?.description ||
        event?.details ||
        "No description is available for this event."
    );
}


function getEventDate(event) {
    return event?.date || event?.eventDate || event?.startDate || "";
}


function getClubName(event) {
    return getDisplayName(event?.club) ||
        event?.clubName ||
        "College Club";
}


function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = String(text);
    }

    return element;
}


function addText(parent, tagName, className, text) {
    const element = createElement(tagName, className, text);

    parent.appendChild(element);

    return element;
}


function clearElement(element) {
    if (element) {
        element.replaceChildren();
    }
}


function showMessage(elementId, message, type = "info") {
    const element = document.getElementById(elementId);

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = `section-message ${type}`;
}


function showPageMessage(message, type = "info") {
    showMessage("page-message", message, type);
}


function renderEmpty(container, message) {
    if (!container) {
        return;
    }

    clearElement(container);

    const empty = createElement("p", "empty-state", message);

    container.appendChild(empty);
}


function createButton(text, className, onClick) {
    const button = createElement("button", className, text);

    button.type = "button";
    button.addEventListener("click", onClick);

    return button;
}


function getStatus(item) {
    return String(
        item?.status ||
        item?.attendanceStatus ||
        item?.approvalStatus ||
        "Not specified"
    );
}


// ==================== 6. STUDENT PROFILE ====================

function renderStudentProfile() {
    const user = getStoredUser();

    const nameElement = document.getElementById("student-name");
    const avatarElement = document.getElementById("avatar");

    if (!user) {
        if (nameElement) {
            nameElement.textContent = "Student";
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

    if (nameElement) {
        nameElement.textContent = name;
    }

    if (avatarElement) {
        avatarElement.textContent = name
            .trim()
            .charAt(0)
            .toUpperCase() || "S";
    }
}


// ==================== 7. DASHBOARD STATISTICS ====================

function updateDashboardCounts() {
    const registrationCount =
        document.getElementById("registered-count");

    const attendanceCount =
        document.getElementById("attendance-count");

    const certificateCount =
        document.getElementById("certificate-count");

    if (registrationCount) {
        registrationCount.textContent = myRegistrations.length;
    }

    if (attendanceCount) {
        attendanceCount.textContent = myAttendanceRecords.length;
    }

    if (certificateCount) {
        certificateCount.textContent = myCertificates.length;
    }
}


// ==================== 8. BROWSE EVENTS ====================

function isUpcomingEvent(event) {
    const dateValue = getEventDate(event);

    // Do not display an event with no valid date as upcoming.
    if (!dateValue) {
        return false;
    }

    const eventDate = new Date(dateValue);

    if (Number.isNaN(eventDate.getTime())) {
        return false;
    }

    const status = String(event.status || "scheduled").toLowerCase();

    const approvalStatus = String(
        event.approvalStatus || ""
    ).toLowerCase();

    const isApproved =
        approvalStatus === "approved" ||
        event.approvalStatus === undefined;

    return (
        isApproved &&
        status === "scheduled" &&
        eventDate >= new Date()
    );
}


async function loadBrowseEvents() {
    const container = document.getElementById("browse-events-list");

    if (!container) {
        return;
    }

    showMessage("browse-events-message", "Loading upcoming events...");

    try {
        const response = await apiRequest(API.events);

        allBrowseEvents = extractList(response, ["events"]);

        // Apply student-facing event filters.
        allBrowseEvents = allBrowseEvents.filter(isUpcomingEvent);

        renderBrowseEvents(allBrowseEvents);

        if (allBrowseEvents.length === 0) {
            showMessage(
                "browse-events-message",
                "No upcoming approved events were found."
            );
        } else {
            showMessage(
                "browse-events-message",
                `${allBrowseEvents.length} upcoming event(s) available.`,
                "success"
            );
        }
    } catch (error) {
        renderEmpty(
            container,
            "Unable to load events. Please try again."
        );

        showMessage(
            "browse-events-message",
            getErrorMessage(error),
            "error"
        );
    }
}


function getRegisteredEventIds() {
    return new Set(
        myRegistrations
            .map(getEventId)
            .filter(Boolean)
            .map(String)
    );
}


function renderBrowseEvents(events) {
    const container = document.getElementById("browse-events-list");

    if (!container) {
        return;
    }

    clearElement(container);

    if (!events.length) {
        renderEmpty(
            container,
            "No events match your search. Try a different keyword or category."
        );

        return;
    }

    const registeredIds = getRegisteredEventIds();

    events.forEach((event) => {
        const eventId = getId(event);

        const card = createElement("article", "event-card");

        addText(card, "h3", "event-title", getEventTitle(event));

        addText(
            card,
            "p",
            "event-description",
            getEventDescription(event)
        );

        addText(
            card,
            "p",
            "event-detail",
            `Date: ${formatDate(getEventDate(event))}`
        );

        addText(
            card,
            "p",
            "event-detail",
            `Venue: ${getEventVenue(event)}`
        );

        addText(
            card,
            "p",
            "event-detail",
            `Category: ${getEventCategory(event)}`
        );

        addText(
            card,
            "p",
            "event-detail",
            `Club: ${getClubName(event)}`
        );

        if (event.capacity !== undefined) {
            addText(
                card,
                "p",
                "event-detail",
                `Capacity: ${event.capacity}`
            );
        }

        if (registeredIds.has(eventId)) {
            const registeredBadge = addText(
                card,
                "span",
                "status-badge",
                "Already Registered"
            );

            registeredBadge.setAttribute("aria-label", "Already registered");
        } else if (eventId) {
            const registerButton = createButton(
                "Register",
                "primary-button",
                () => registerForEvent(eventId)
            );

            card.appendChild(registerButton);
        }

        container.appendChild(card);
    });
}


function filterBrowseEvents() {
    const searchInput = document.getElementById("event-search");
    const categorySelect = document.getElementById("event-category");

    const searchTerm = (searchInput?.value || "")
        .trim()
        .toLowerCase();

    const selectedCategory = (categorySelect?.value || "")
        .trim()
        .toLowerCase();

    const filteredEvents = allBrowseEvents.filter((event) => {
        const searchableText = [
            getEventTitle(event),
            getEventDescription(event),
            getEventVenue(event),
            getEventCategory(event),
            getClubName(event)
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        const matchesCategory =
            !selectedCategory ||
            getEventCategory(event).toLowerCase() === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    renderBrowseEvents(filteredEvents);

    showMessage(
        "browse-events-message",
        `${filteredEvents.length} event(s) match your search.`,
        "info"
    );
}


function initializeEventBrowser() {
    const searchButton =
        document.getElementById("search-events-button");

    const searchInput =
        document.getElementById("event-search");

    const categorySelect =
        document.getElementById("event-category");

    if (searchButton) {
        searchButton.addEventListener("click", filterBrowseEvents);
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                filterBrowseEvents();
            }
        });

        searchInput.addEventListener("input", filterBrowseEvents);
    }

    if (categorySelect) {
        categorySelect.addEventListener("change", filterBrowseEvents);
    }
}


// ==================== 9. REGISTER FOR AN EVENT ====================

async function registerForEvent(eventId) {
    if (!eventId) {
        showPageMessage("Event ID is missing.", "error");
        return;
    }

    if (!getToken()) {
        showPageMessage("Please log in before registering.", "error");
        return;
    }

    const registeredIds = getRegisteredEventIds();

    if (registeredIds.has(String(eventId))) {
        showPageMessage(
            "You are already registered for this event.",
            "info"
        );

        return;
    }

    if (registrationRequestsInProgress.has(String(eventId))) {
        return;
    }

    const event = allBrowseEvents.find(
        (item) => getId(item) === String(eventId)
    );

    if (event && !isUpcomingEvent(event)) {
        showPageMessage(
            "Registration is available only for upcoming approved events.",
            "error"
        );

        return;
    }

    registrationRequestsInProgress.add(String(eventId));

    try {
        // Confirm this POST route matches registration.routes.js.
        const response = await apiRequest(
            API.registerForEvent(eventId),
            {
                method: "POST"
            }
        );

        showPageMessage(
            response?.message || "Registration completed successfully.",
            "success"
        );

        await loadRegistrations();
        await loadBrowseEvents();
    } catch (error) {
        showPageMessage(getErrorMessage(error), "error");
    } finally {
        registrationRequestsInProgress.delete(String(eventId));
    }
}


// ==================== 10. MY REGISTRATIONS ====================

async function loadRegistrations() {
    const container = document.getElementById("events-list");

    if (!container) {
        return;
    }

    showMessage("registrations-message", "Loading your registrations...");

    try {
        const response = await apiRequest(API.myRegistrations);

        myRegistrations = extractList(response, ["registrations"]);

        renderRegistrations(myRegistrations);

        updateDashboardCounts();

        showMessage(
            "registrations-message",
            myRegistrations.length
                ? `${myRegistrations.length} registration(s) found.`
                : "You have not registered for any events yet.",
            "info"
        );
    } catch (error) {
        renderEmpty(
            container,
            "Unable to load registrations."
        );

        showMessage(
            "registrations-message",
            getErrorMessage(error),
            "error"
        );
    }
}


function canCancelRegistration(registration) {
    const event = getEvent(registration);

    const registrationStatus = String(
        registration?.status || "registered"
    ).toLowerCase();

    const eventStatus = String(
        event?.status || "scheduled"
    ).toLowerCase();

    const eventDateValue = getEventDate(event);
    const eventDate = eventDateValue
        ? new Date(eventDateValue)
        : null;

    const hasValidDate =
        eventDate && !Number.isNaN(eventDate.getTime());

    const hasNotStarted =
        !hasValidDate || eventDate > new Date();

    const registrationIsActive = [
        "registered",
        "confirmed",
        "active"
    ].includes(registrationStatus);

    return (
        registrationIsActive &&
        eventStatus === "scheduled" &&
        hasNotStarted
    );
}


function renderRegistrations(registrations) {
    const container = document.getElementById("events-list");

    if (!container) {
        return;
    }

    clearElement(container);

    // Keep registered IDs available to the browse-events section.
    window.studentRegistrationEventIds = registrations
        .map(getEventId)
        .filter(Boolean)
        .map(String);

    if (!registrations.length) {
        renderEmpty(
            container,
            "You have not registered for any events yet. Browse events to get started."
        );

        return;
    }

    registrations.forEach((registration) => {
        const event = getEvent(registration);
        const eventId = getEventId(registration);

        const card = createElement("article", "event-card");

        addText(card, "h3", "event-title", getEventTitle(event));

        addText(
            card,
            "p",
            "event-detail",
            `Date: ${formatDate(getEventDate(event))}`
        );

        addText(
            card,
            "p",
            "event-detail",
            `Venue: ${getEventVenue(event)}`
        );

        addText(
            card,
            "p",
            "event-detail",
            `Category: ${getEventCategory(event)}`
        );

        addText(
            card,
            "p",
            "event-detail",
            `Registration status: ${getStatus(registration)}`
        );

        if (canCancelRegistration(registration) && eventId) {
            const cancelButton = createButton(
                "Cancel Registration",
                "danger-button",
                () => cancelRegistration(eventId)
            );

            card.appendChild(cancelButton);
        }

        container.appendChild(card);
    });
}


// ==================== 11. CANCEL REGISTRATION ====================

async function cancelRegistration(eventId) {
    if (!eventId) {
        showPageMessage("Event ID is missing.", "error");
        return;
    }

    if (cancellationRequestsInProgress.has(String(eventId))) {
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to cancel your registration for this event?"
    );

    if (!confirmed) {
        return;
    }

    cancellationRequestsInProgress.add(String(eventId));

    try {
        // This DELETE route was discussed in the earlier project tasks.
        const response = await apiRequest(
            API.cancelRegistration(eventId),
            {
                method: "DELETE"
            }
        );

        showPageMessage(
            response?.message || "Registration cancelled successfully.",
            "success"
        );

        await loadRegistrations();
        await loadBrowseEvents();
    } catch (error) {
        showPageMessage(getErrorMessage(error), "error");
    } finally {
        cancellationRequestsInProgress.delete(String(eventId));
    }
}


// ==================== 12. MY ATTENDANCE ====================

async function loadAttendance() {
    const container = document.getElementById("attendance-list");

    if (!container) {
        return;
    }

    showMessage("attendance-message", "Loading attendance records...");

    try {
        const response = await apiRequest(API.myAttendance);

        myAttendanceRecords = extractList(
            response,
            ["attendance", "records"]
        );

        renderAttendance(myAttendanceRecords);

        updateDashboardCounts();

        showMessage(
            "attendance-message",
            myAttendanceRecords.length
                ? `${myAttendanceRecords.length} attendance record(s) found.`
                : "No attendance records found yet.",
            "info"
        );
    } catch (error) {
        renderEmpty(container, "Unable to load attendance records.");

        showMessage(
            "attendance-message",
            getErrorMessage(error),
            "error"
        );
    }
}


function renderAttendance(records) {
    const container = document.getElementById("attendance-list");

    if (!container) {
        return;
    }

    clearElement(container);

    if (!records.length) {
        renderEmpty(
            container,
            "Your attendance records will appear here after you attend an event."
        );

        return;
    }

    records.forEach((record) => {
        const event = getEvent(record);

        const card = createElement("article", "record-card");

        addText(
            card,
            "h3",
            "record-title",
            getEventTitle(event)
        );

        addText(
            card,
            "p",
            "record-detail",
            `Attendance: ${getStatus(record)}`
        );

        const attendanceDate =
            record.checkInTime ||
            record.attendanceDate ||
            record.createdAt ||
            getEventDate(event);

        addText(
            card,
            "p",
            "record-detail",
            `Date: ${formatDate(attendanceDate)}`
        );

        addText(
            card,
            "p",
            "record-detail",
            `Venue: ${getEventVenue(event)}`
        );

        container.appendChild(card);
    });
}


// ==================== 13. MY CERTIFICATES ====================

async function loadCertificates() {
    const container = document.getElementById("certificates-list");

    if (!container) {
        return;
    }

    showMessage("certificates-message", "Loading certificates...");

    try {
        const response = await apiRequest(API.myCertificates);

        myCertificates = extractList(
            response,
            ["certificates"]
        );

        renderCertificates(myCertificates);

        updateDashboardCounts();

        showMessage(
            "certificates-message",
            myCertificates.length
                ? `${myCertificates.length} certificate(s) found.`
                : "No certificates have been issued to you yet.",
            "info"
        );
    } catch (error) {
        renderEmpty(container, "Unable to load certificates.");

        showMessage(
            "certificates-message",
            getErrorMessage(error),
            "error"
        );
    }
}


function renderCertificates(certificates) {
    const container = document.getElementById("certificates-list");

    if (!container) {
        return;
    }

    clearElement(container);

    if (!certificates.length) {
        renderEmpty(
            container,
            "Certificates issued to you will appear here."
        );

        return;
    }

    certificates.forEach((certificate) => {
        const event = getEvent(certificate);

        const card = createElement("article", "record-card");

        addText(
            card,
            "h3",
            "record-title",
            certificate.title ||
            certificate.certificateTitle ||
            getEventTitle(event)
        );

        addText(
            card,
            "p",
            "record-detail",
            `Certificate ID: ${
                certificate.certificateId ||
                certificate.verificationCode ||
                getId(certificate) ||
                "Not available"
            }`
        );

        addText(
            card,
            "p",
            "record-detail",
            `Issued: ${formatDate(
                certificate.issuedAt ||
                certificate.issueDate ||
                certificate.createdAt
            )}`
        );

        const certificateUrl =
            certificate.certificateUrl ||
            certificate.fileUrl ||
            certificate.downloadUrl ||
            certificate.pdfUrl ||
            certificate.url;

        if (certificateUrl) {
            const link = createElement(
                "a",
                "primary-button",
                "View / Download Certificate"
            );

            link.href = certificateUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            card.appendChild(link);
        } else {
            addText(
                card,
                "p",
                "record-detail",
                "No downloadable certificate link is available."
            );
        }

        container.appendChild(card);
    });
}


// ==================== 14. LOGOUT ====================

function logoutStudent() {
    const confirmed = window.confirm(
        "Are you sure you want to log out?"
    );

    if (!confirmed) {
        return;
    }

    clearLoginData();

    // Update this destination if your login page uses another path.
    redirectToLogin();
}


// ==================== 15. REFRESH DASHBOARD ====================

async function loadDashboard() {
    if (!requireLogin()) {
        return;
    }

    renderStudentProfile();

    showPageMessage("Loading your dashboard...", "info");

    // Load sections independently so one failed endpoint does not
    // prevent the other sections from attempting to load.
    const results = await Promise.allSettled([
        loadRegistrations(),
        loadAttendance(),
        loadCertificates(),
        loadBrowseEvents()
    ]);

    const failedSections = results.filter(
        (result) => result.status === "rejected"
    );

    if (failedSections.length > 0) {
        showPageMessage(
            "Some dashboard sections could not be loaded.",
            "error"
        );
    } else {
        showPageMessage("", "info");
    }
}


// ==================== 16. INITIALIZE DASHBOARD ====================

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutStudent);
    }

    initializeEventBrowser();

    // Keep initial statistic values consistent.
    updateDashboardCounts();

    // Load all student dashboard sections.
    loadDashboard();
});