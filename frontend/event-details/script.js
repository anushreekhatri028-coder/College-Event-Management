
"use strict";

// ============================================
// 1. API CONFIGURATION
// ============================================

const API_BASE_URL = "http://localhost:5000/api";

const API = {
    getEvent: (eventId) =>
        `${API_BASE_URL}/events/${encodeURIComponent(eventId)}`,

    myRegistrations: `${API_BASE_URL}/registrations/my`,

    registerForEvent: (eventId) =>
        `${API_BASE_URL}/registrations/event/${encodeURIComponent(eventId)}`
};


// ============================================
// 2. PAGE STATE
// ============================================

let currentEvent = null;
let currentEventId = "";

let isRegistered = false;
let registrationStatusChecked = false;
let registrationInProgress = false;


// ============================================
// 3. AUTHENTICATION HELPERS
// ============================================

function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("authToken") ||
        ""
    );
}

function clearLoginData() {
    const keys = [
        "token",
        "authToken",
        "user",
        "student",
        "currentUser",
        "loggedInUser"
    ];

    keys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}

function redirectToLogin() {
    // Change this path if your login page is located elsewhere.
    window.location.href = "../login/index.html";
}


// ============================================
// 4. API REQUEST HELPER
// ============================================

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
        !Object.keys(headers).some(
            (key) => key.toLowerCase() === "content-type"
        )
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
            "Cannot connect to the backend. Make sure your backend is running on port 5000."
        );
    }

    const responseText = await response.text();
    let data = null;

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch (error) {
            data = null;
        }
    }

    if (response.status === 401) {
        clearLoginData();

        throw new Error(
            "Your session has expired or your login is invalid. Please log in again."
        );
    }

    if (response.status === 403) {
        throw new Error(
            data?.message ||
            data?.error ||
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


// ============================================
// 5. GENERAL HELPERS
// ============================================

function getElement(id) {
    return document.getElementById(id);
}

function showMessage(message, type = "info") {
    const element = getElement("details-message");

    element.textContent = message;
    element.className = `message ${type}`;
}

function showRegistrationMessage(message, type = "info") {
    const element = getElement("registration-message");

    element.textContent = message;
    element.className = `message ${type}`;
}

function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase();
}

function getDisplayName(value) {
    if (typeof value === "string") {
        return value.trim();
    }

    if (value && typeof value === "object") {
        return (
            value.name ||
            value.fullName ||
            value.title ||
            value.clubName ||
            value.email ||
            ""
        );
    }

    return "";
}

function getEventId(event) {
    return String(event?._id || event?.id || "");
}

function getEventTitle(event) {
    return event?.title || event?.name || "Untitled Event";
}

function getEventDate(event) {
    return (
        event?.date ||
        event?.eventDate ||
        event?.startDate ||
        ""
    );
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
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatCapacity(value) {
    if (value === null || value === undefined || value === "") {
        return "Not specified";
    }

    const capacity = Number(value);

    if (Number.isFinite(capacity) && capacity >= 0) {
        return `${capacity} seats`;
    }

    return String(value);
}

function formatStatus(value) {
    if (!value) {
        return "Not specified";
    }

    return String(value)
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}


// ============================================
// 6. RESPONSE NORMALIZATION
// ============================================

function extractEvent(response) {
    if (!response || typeof response !== "object") {
        return null;
    }

    // Common response: { event: {...} }
    if (
        response.event &&
        typeof response.event === "object" &&
        !Array.isArray(response.event)
    ) {
        return response.event;
    }

    // Alternative response: { data: { event: {...} } }
    if (
        response.data?.event &&
        typeof response.data.event === "object"
    ) {
        return response.data.event;
    }

    // Alternative response: { data: {...event fields...} }
    if (
        response.data &&
        typeof response.data === "object" &&
        !Array.isArray(response.data) &&
        (response.data._id || response.data.id)
    ) {
        return response.data;
    }

    // Direct event response: { _id, title, date, ... }
    if (response._id || response.id) {
        return response;
    }

    return null;
}

function extractList(response, possibleKeys = []) {
    if (Array.isArray(response)) {
        return response;
    }

    if (!response || typeof response !== "object") {
        return [];
    }

    const keys = [
        ...possibleKeys,
        "data",
        "results",
        "items",
        "registrations"
    ];

    for (const key of keys) {
        const value = response[key];

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

function getRegistrationEventId(registration) {
    if (!registration || typeof registration !== "object") {
        return "";
    }

    const possibleEvent =
        registration.event ||
        registration.eventId ||
        registration.eventDetails ||
        {};

    if (typeof possibleEvent === "string") {
        return possibleEvent;
    }

    return String(
        possibleEvent?._id ||
        possibleEvent?.id ||
        registration.event?._id ||
        registration.eventId?._id ||
        ""
    );
}


// ============================================
// 7. URL AND EVENT ELIGIBILITY
// ============================================

function getEventIdFromUrl() {
    const params = new URLSearchParams(window.location.search);

    return (
        params.get("id") ||
        params.get("eventId") ||
        ""
    ).trim();
}

function isUpcomingScheduledEvent(event) {
    if (!event) {
        return false;
    }

    const dateValue = getEventDate(event);
    const eventDate = new Date(dateValue);

    const validDate =
        Boolean(dateValue) &&
        !Number.isNaN(eventDate.getTime());

    const status = normalizeStatus(event.status || "scheduled");
    const approvalStatus = normalizeStatus(event.approvalStatus);

    return (
        validDate &&
        eventDate.getTime() > Date.now() &&
        status === "scheduled" &&
        approvalStatus === "approved"
    );
}


// ============================================
// 8. RENDER EVENT DETAILS
// ============================================

function renderEventDetails(event) {
    document.title = `${getEventTitle(event)} | CampusConnect`;

    getElement("event-title").textContent = getEventTitle(event);

    getElement("event-description").textContent =
        event.description ||
        event.details ||
        "No description is available for this event.";

    const category =
        getDisplayName(event.category) ||
        "Not specified";

    getElement("event-category").textContent = category;
    getElement("event-category-detail").textContent = category;

    getElement("event-date").textContent =
        formatDate(getEventDate(event));

    getElement("event-venue").textContent =
        getDisplayName(event.venue) ||
        getDisplayName(event.location) ||
        "Venue not announced";

    getElement("event-club").textContent =
        getDisplayName(event.club) ||
        getDisplayName(event.clubName) ||
        "Not specified";

    getElement("event-capacity").textContent =
        formatCapacity(event.capacity);

    getElement("event-status").textContent =
        formatStatus(event.status || "scheduled");

    getElement("event-approval-status").textContent =
        formatStatus(event.approvalStatus);

    getElement("event-organizer").textContent =
        getDisplayName(event.organizer) ||
        getDisplayName(event.organizerName) ||
        "Not specified";

    getElement("current-year").textContent =
        new Date().getFullYear();

    const statusElement = getElement("event-status");
    statusElement.className =
        `status-badge status-${normalizeStatus(event.status || "scheduled").replace(/[^a-z0-9-]/g, "")}`;

    const approvalElement = getElement("event-approval-status");
    approvalElement.className =
        `approval-${normalizeStatus(event.approvalStatus).replace(/[^a-z0-9-]/g, "")}`;
}


// ============================================
// 9. LOAD EVENT DETAILS
// ============================================

async function loadEventDetails() {
    const detailsCard = getElement("event-details-card");
    const notFoundActions = getElement("not-found-actions");
    const registerButton = getElement("register-button");

    currentEventId = getEventIdFromUrl();

    getElement("current-year").textContent =
        new Date().getFullYear();

    if (!getToken()) {
        showMessage(
            "Please log in to view event details.",
            "error"
        );

        registerButton.disabled = true;

        // Redirect after displaying the message.
        window.setTimeout(redirectToLogin, 1500);
        return;
    }

    if (!currentEventId) {
        showMessage(
            "No event ID was found in the URL. Open an event from the Events page.",
            "error"
        );

        notFoundActions.hidden = false;
        registerButton.disabled = true;
        return;
    }

    try {
        showMessage("Loading event details...", "info");

        const response = await apiRequest(
            API.getEvent(currentEventId)
        );

        currentEvent = extractEvent(response);

        if (!currentEvent) {
            throw new Error(
                "The server response did not contain event details."
            );
        }

        // Use the canonical ID returned by the backend, if available.
        currentEventId = getEventId(currentEvent) || currentEventId;

        renderEventDetails(currentEvent);

        detailsCard.hidden = false;
        notFoundActions.hidden = true;

        updateRegisterButton();

        // Check registration separately so a registration endpoint
        // problem does not hide the event details.
        await checkRegistrationStatus();

        updateRegisterButton();

        showMessage("Event details loaded.", "success");
    } catch (error) {
        detailsCard.hidden = true;
        notFoundActions.hidden = true;

        showMessage(error.message, "error");

        // Only show the return action for an invalid/missing event
        // or an event that the API could not load.
        notFoundActions.hidden = false;
        registerButton.disabled = true;
    }
}


// ============================================
// 10. CHECK REGISTRATION STATUS
// ============================================

async function checkRegistrationStatus() {
    registrationStatusChecked = false;
    isRegistered = false;

    try {
        const response = await apiRequest(API.myRegistrations);

        const registrations = extractList(
            response,
            ["registrations", "myRegistrations"]
        );

        isRegistered = registrations.some((registration) => {
            return (
                getRegistrationEventId(registration) ===
                String(currentEventId)
            );
        });

        registrationStatusChecked = true;

        if (isRegistered) {
            showRegistrationMessage(
                "You are already registered for this event.",
                "info"
            );
        } else {
            showRegistrationMessage("", "info");
        }
    } catch (error) {
        console.warn(
            "Could not verify registration status:",
            error.message
        );

        registrationStatusChecked = false;

        showRegistrationMessage(
            "We could not verify your registration status. Refresh the page or try again before registering.",
            "error"
        );
    }
}


// ============================================
// 11. UPDATE REGISTER BUTTON
// ============================================

function updateRegisterButton() {
    const button = getElement("register-button");

    if (!currentEvent) {
        button.textContent = "Event Unavailable";
        button.disabled = true;
        return;
    }

    if (registrationInProgress) {
        button.textContent = "Registering...";
        button.disabled = true;
        return;
    }

    if (isRegistered) {
        button.textContent = "Already Registered";
        button.disabled = true;
        return;
    }

    if (!isUpcomingScheduledEvent(currentEvent)) {
        const approvalStatus = normalizeStatus(
            currentEvent.approvalStatus
        );

        const eventStatus = normalizeStatus(
            currentEvent.status || "scheduled"
        );

        if (approvalStatus !== "approved") {
            button.textContent = "Awaiting Approval";
        } else if (eventStatus !== "scheduled") {
            button.textContent = "Registration Unavailable";
        } else {
            button.textContent = "Event Has Passed";
        }

        button.disabled = true;
        return;
    }

    if (!registrationStatusChecked) {
        button.textContent = "Check Registration";
        button.disabled = true;
        return;
    }

    button.textContent = "Register for Event";
    button.disabled = false;
}


// ============================================
// 12. REGISTER FOR EVENT
// ============================================

async function registerForCurrentEvent() {
    if (registrationInProgress) {
        return;
    }

    if (!getToken()) {
        showRegistrationMessage(
            "Please log in before registering.",
            "error"
        );

        return;
    }

    if (!currentEventId || !currentEvent) {
        showRegistrationMessage(
            "Event details have not loaded. Please refresh the page.",
            "error"
        );

        return;
    }

    if (isRegistered) {
        showRegistrationMessage(
            "You are already registered for this event.",
            "info"
        );

        return;
    }

    if (!registrationStatusChecked) {
        showRegistrationMessage(
            "Your registration status could not be verified. Refresh the page and try again.",
            "error"
        );

        return;
    }

    if (!isUpcomingScheduledEvent(currentEvent)) {
        showRegistrationMessage(
            "You can register only for upcoming, approved, scheduled events.",
            "error"
        );

        updateRegisterButton();
        return;
    }

    registrationInProgress = true;
    updateRegisterButton();

    showRegistrationMessage(
        "Submitting your registration...",
        "info"
    );

    try {
        const response = await apiRequest(
            API.registerForEvent(currentEventId),
            {
                method: "POST"
            }
        );

        isRegistered = true;
        registrationStatusChecked = true;

        updateRegisterButton();

        showRegistrationMessage(
            response?.message ||
            response?.data?.message ||
            "Registration completed successfully.",
            "success"
        );
    } catch (error) {
        showRegistrationMessage(error.message, "error");

        // If the server says the student is already registered,
        // update the button accordingly.
        const message = normalizeStatus(error.message);

        if (
            message.includes("already registered") ||
            message.includes("already exists")
        ) {
            isRegistered = true;
            registrationStatusChecked = true;
        }
    } finally {
        registrationInProgress = false;
        updateRegisterButton();
    }
}


// ============================================
// 13. INITIALIZE PAGE
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    getElement("current-year").textContent =
        new Date().getFullYear();

    getElement("register-button").addEventListener(
        "click",
        registerForCurrentEvent
    );

    loadEventDetails();
});
