
const API_BASE_URL = "http://localhost:5000/api";

const API = {
    eventDetails: (eventId) =>
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

function redirectToLogin() {
    // Update this path if your login page is in a different location.
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

    if (options.body && !headers["Content-Type"]) {
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
            "Cannot connect to the backend. Check that your server is running on port 5000."
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


// ============================================
// 5. PAGE HELPERS
// ============================================

function showMessage(message, type = "info") {
    const element = document.getElementById("details-message");

    element.textContent = message;
    element.className = `message ${type}`;
}

function showRegistrationMessage(message, type = "info") {
    const element = document.getElementById("registration-message");

    element.textContent = message;
    element.className = `message ${type}`;
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

function getEventDate(event) {
    return event?.date || event?.eventDate || event?.startDate || "";
}

function getEventTitle(event) {
    return event?.title || event?.name || "Untitled Event";
}

function extractList(data, possibleKeys = []) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        return [];
    }

    for (const key of [
        ...possibleKeys,
        "data",
        "results",
        "items",
        "registrations"
    ]) {
        if (Array.isArray(data[key])) {
            return data[key];
        }

        if (data[key] && typeof data[key] === "object") {
            const nested = extractList(data[key], []);

            if (nested.length > 0) {
                return nested;
            }
        }
    }

    return [];
}

function getRegistrationEventId(registration) {
    const event =
        registration?.event ||
        registration?.eventId ||
        registration?.eventDetails ||
        {};

    const id =
        event?._id ||
        event?.id ||
        (typeof registration?.eventId === "string"
            ? registration.eventId
            : "") ||
        (typeof registration?.event === "string"
            ? registration.event
            : "");

    return String(id || "");
}

function isUpcomingScheduledEvent(event) {
    const dateValue = getEventDate(event);
    const date = new Date(dateValue);

    return Boolean(
        dateValue &&
        !Number.isNaN(date.getTime()) &&
        date > new Date() &&
        String(event?.status || "scheduled").toLowerCase() === "scheduled" &&
        String(event?.approvalStatus || "").toLowerCase() === "approved"
    );
}


// ============================================
// 6. READ EVENT ID FROM URL
// ============================================

function getEventIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "";
}


// ============================================
// 7. LOAD AND DISPLAY EVENT DETAILS
// ============================================

async function loadEventDetails() {
    const detailsCard = document.getElementById("event-details-card");
    const notFoundActions = document.getElementById("not-found-actions");

    currentEventId = getEventIdFromUrl();

    if (!getToken()) {
        showMessage("Please log in to view event details.", "error");

        window.setTimeout(redirectToLogin, 1200);
        return;
    }

    if (!currentEventId) {
        showMessage("No event ID was provided in the URL.", "error");
        notFoundActions.hidden = false;
        return;
    }

    try {
        const response = await apiRequest(
            API.eventDetails(currentEventId)
        );

        // The controller returns { event: ... }.
        currentEvent = response?.event || response?.data?.event || null;

        if (!currentEvent) {
            throw new Error("The requested event could not be found.");
        }

        renderEventDetails(currentEvent);
        detailsCard.hidden = false;

        await checkRegistrationStatus();

        updateRegisterButton();
        showMessage("Event details loaded successfully.", "success");
    } catch (error) {
        detailsCard.hidden = true;
        notFoundActions.hidden = false;

        showMessage(error.message, "error");
    }
}

function renderEventDetails(event) {
    document.title = `${getEventTitle(event)} | CampusConnect`;

    document.getElementById("event-title").textContent =
        getEventTitle(event);

    document.getElementById("event-description").textContent =
        event.description ||
        event.details ||
        "No description is available for this event.";

    const category = getDisplayName(event.category) || "Not specified";

    document.getElementById("event-category").textContent = category;
    document.getElementById("event-category-detail").textContent = category;

    document.getElementById("event-date").textContent =
        formatDate(getEventDate(event));

    document.getElementById("event-venue").textContent =
        event.venue || event.location || "Venue not announced";

    document.getElementById("event-club").textContent =
        getDisplayName(event.club) ||
        event.clubName ||
        "Not specified";

    document.getElementById("event-capacity").textContent =
        event.capacity !== undefined && event.capacity !== null
            ? String(event.capacity)
            : "Not specified";

    document.getElementById("event-status").textContent =
        event.status || "Not specified";

    document.getElementById("event-approval-status").textContent =
        event.approvalStatus || "Not specified";

    document.getElementById("event-organizer").textContent =
        getDisplayName(event.organizer) || "Not specified";

    document.getElementById("current-year").textContent =
        new Date().getFullYear();
}


// ============================================
// 8. CHECK WHETHER THE STUDENT IS REGISTERED
// ============================================

async function checkRegistrationStatus() {
    try {
        const response = await apiRequest(API.myRegistrations);

        const registrations = extractList(response, ["registrations"]);

        isRegistered = registrations.some(
            (registration) =>
                getRegistrationEventId(registration) ===
                String(currentEventId)
        );
    } catch (error) {
        // Keep the details page available if the registrations
        // endpoint fails. The backend will still validate registration.
        console.warn("Could not check registration status:", error.message);
        isRegistered = false;
    }
}


// ============================================
// 9. UPDATE REGISTRATION BUTTON
// ============================================

function updateRegisterButton() {
    const button = document.getElementById("register-button");

    if (isRegistered) {
        button.textContent = "Already Registered";
        button.disabled = true;
        return;
    }

    if (!currentEvent || !isUpcomingScheduledEvent(currentEvent)) {
        button.textContent = "Registration Unavailable";
        button.disabled = true;
        return;
    }

    button.textContent = "Register for Event";
    button.disabled = registrationInProgress;
}


// ============================================
// 10. REGISTER FOR THE EVENT
// ============================================

async function registerForCurrentEvent() {
    if (!currentEventId || !currentEvent) {
        showRegistrationMessage("Event details are not loaded.", "error");
        return;
    }

    if (!getToken()) {
        showRegistrationMessage("Please log in before registering.", "error");
        return;
    }

    if (isRegistered) {
        showRegistrationMessage(
            "You are already registered for this event.",
            "info"
        );
        return;
    }

    if (!isUpcomingScheduledEvent(currentEvent)) {
        showRegistrationMessage(
            "Registration is available only for upcoming approved events.",
            "error"
        );
        return;
    }

    if (registrationInProgress) {
        return;
    }

    registrationInProgress = true;
    updateRegisterButton();

    try {
        const response = await apiRequest(
            API.registerForEvent(currentEventId),
            {
                method: "POST"
            }
        );

        isRegistered = true;
        updateRegisterButton();

        showRegistrationMessage(
            response?.message || "Registration completed successfully.",
            "success"
        );
    } catch (error) {
        showRegistrationMessage(error.message, "error");
    } finally {
        registrationInProgress = false;
        updateRegisterButton();
    }
}


// ============================================
// 11. INITIALIZE PAGE
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("register-button").addEventListener(
        "click",
        registerForCurrentEvent
    );

    loadEventDetails();
});
