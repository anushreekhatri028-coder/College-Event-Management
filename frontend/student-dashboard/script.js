 

const API_BASE_URL = "http://localhost:5000/api";

const API = {
    events: `${API_BASE_URL}/events`,
    myRegistrations: `${API_BASE_URL}/registrations/my`,
    myAttendance: `${API_BASE_URL}/attendance/my`,
    myCertificates: `${API_BASE_URL}/certificates/my`,

    registerForEvent: (eventId) =>
        `${API_BASE_URL}/registrations/event/${eventId}`,

    cancelRegistration: (eventId) =>
        `${API_BASE_URL}/registrations/event/${eventId}`
};


// -------------------- 2. AUTHENTICATION --------------------

function getToken() {
    return (
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken")
    );
}

function logoutStudent() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");

    // Change this path if your login page is located elsewhere.
    window.location.href = "../login/index.html";
}


// -------------------- 3. GENERAL HELPER FUNCTIONS --------------------

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value ?? "";
    }
}

function showMessage(id, message, type = "info") {
    const element = getElement(id);

    if (!element) return;

    element.textContent = message;
    element.className = "page-message";

    if (type === "error") {
        element.classList.add("error-message");
    } else if (type === "success") {
        element.classList.add("success-message");
    } else if (type === "info") {
        element.classList.add("info-message");
    }

    element.hidden = !message;
}

function clearMessage(id) {
    const element = getElement(id);

    if (element) {
        element.textContent = "";
        element.hidden = true;
    }
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

function createButton(text, className, onClick) {
    const button = createElement("button", className, text);

    button.type = "button";
    button.addEventListener("click", onClick);

    return button;
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
    if (!button) return;

    if (loading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
    } else {
        button.textContent =
            button.dataset.originalText || button.textContent;

        button.disabled = false;
        delete button.dataset.originalText;
    }
}

function formatDate(dateValue) {
    if (!dateValue) return "Date not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDateOnly(dateValue) {
    if (!dateValue) return "Date not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function getId(value) {
    if (!value) return "";

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "object") {
        return String(value._id || value.id || "");
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

    for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    // Handle common API response structures.
    if (data.data) {
        if (Array.isArray(data.data)) {
            return data.data;
        }

        if (typeof data.data === "object") {
            for (const key of possibleKeys) {
                if (Array.isArray(data.data[key])) {
                    return data.data[key];
                }
            }
        }
    }

    return [];
}


// -------------------- 4. API REQUEST FUNCTION --------------------

async function apiRequest(url, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error("Your session has expired. Please log in again.");
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
    };

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
            "Unable to connect to the backend. Make sure your server is running on port 5000."
        );
    }

    const responseText = await response.text();
    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            throw new Error(
                `The server returned an invalid response (HTTP ${response.status}).`
            );
        }
    }

    if (response.status === 401) {
        logoutStudent();
        throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok) {
        const message =
            data.message ||
            data.error ||
            `Request failed with status ${response.status}.`;

        throw new Error(message);
    }

    return data;
}


// -------------------- 5. STUDENT PROFILE --------------------

function getStudentFromStorage() {
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

        if (!storedValue) continue;

        try {
            const parsed = JSON.parse(storedValue);

            if (parsed && typeof parsed === "object") {
                return parsed.user || parsed.student || parsed;
            }
        } catch {
            // Ignore values that are not JSON.
        }
    }

    return null;
}

function updateStudentProfile() {
    const student = getStudentFromStorage();

    const name =
        student?.name ||
        student?.fullName ||
        student?.username ||
        "Student";

    setText("student-name", name);

    const avatar = getElement("avatar");

    if (avatar) {
        avatar.textContent = name
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase() || "S";

        avatar.setAttribute("aria-label", `${name}'s avatar`);
    }
}


// -------------------- 6. EVENT DATA HELPERS --------------------

function getEventId(event) {
    return getId(event?._id || event?.id || event?.eventId);
}

function getEventName(event) {
    return event?.title || event?.name || "Untitled Event";
}

function getEventCategory(event) {
    if (typeof event?.category === "string") {
        return event.category;
    }

    return event?.category?.name || "Other";
}

function getEventClubName(event) {
    if (typeof event?.club === "string") {
        return "Club";
    }

    return event?.club?.name || event?.clubName || "Club not specified";
}

function getRegistrationEventId(registration) {
    return getId(registration?.event || registration?.eventId);
}

function getRegistrationEvent(registration) {
    if (
        registration?.event &&
        typeof registration.event === "object"
    ) {
        return registration.event;
    }

    if (
        registration?.eventId &&
        typeof registration.eventId === "object"
    ) {
        return registration.eventId;
    }

    return null;
}

function isEventApproved(event) {
    return event?.approvalStatus === "approved";
}

function isUpcomingScheduledEvent(event) {
    const eventDate = new Date(event?.date);

    if (Number.isNaN(eventDate.getTime())) {
        return false;
    }

    const isUpcoming = eventDate.getTime() > Date.now();
    const isScheduled =
        !event.status || event.status === "scheduled";

    return (
        isEventApproved(event) &&
        isUpcoming &&
        isScheduled
    );
}

function getEventList(data) {
    return extractList(data, ["events", "results", "items"]);
}

function getRegistrationList(data) {
    return extractList(data, [
        "registrations",
        "results",
        "items"
    ]);
}

function getAttendanceList(data) {
    return extractList(data, [
        "attendance",
        "attendances",
        "records",
        "results",
        "items"
    ]);
}

function getCertificateList(data) {
    return extractList(data, [
        "certificates",
        "results",
        "items"
    ]);
}


// -------------------- 7. DASHBOARD STATISTICS --------------------

function updateDashboardStatistics(
    registrations,
    attendance,
    certificates
) {
    setText("registered-count", registrations.length);
    setText("attendance-count", attendance.length);
    setText("certificate-count", certificates.length);
}


// -------------------- 8. BROWSE EVENTS --------------------

let allBrowseEvents = [];
let registeredEventIds = new Set();

async function loadBrowseEvents() {
    showMessage("browse-events-message", "Loading events...");

    const list = getElement("browse-events-list");

    if (list) {
        list.replaceChildren();
    }

    try {
        const data = await apiRequest(API.events);
        allBrowseEvents = getEventList(data);

        // Only show approved events to students.
        const approvedEvents = allBrowseEvents.filter(isEventApproved);

        renderBrowseEvents(approvedEvents);
        clearMessage("browse-events-message");
    } catch (error) {
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
            "No approved events found. Please check again later."
        );
        return;
    }

    clearMessage("browse-events-message");

    events.forEach((event) => {
        const eventId = getEventId(event);

        const card = createElement("article", "event-card");

        addText(card, "h3", "event-title", getEventName(event));

        addText(
            card,
            "p",
            "event-category",
            `Category: ${getEventCategory(event)}`
        );

        addText(
            card,
            "p",
            "event-date",
            `Date: ${formatDate(event.date)}`
        );

        addText(
            card,
            "p",
            "event-venue",
            `Venue: ${event.venue || "Not specified"}`
        );

        addText(
            card,
            "p",
            "event-club",
            `Club: ${getEventClubName(event)}`
        );

        if (event.description) {
            addText(
                card,
                "p",
                "event-description",
                event.description
            );
        }

        // View Details button: opens the Day 38 event-details page.
        if (eventId) {
            const detailsButton = createButton(
                "View Details",
                "secondary-button",
                () => {
                    window.location.href =
                        `../event-details/index.html?id=${encodeURIComponent(eventId)}`;
                }
            );

            card.appendChild(detailsButton);
        }

        // Display registration status and the Register button.
        if (registeredEventIds.has(eventId)) {
            const registeredBadge = addText(
                card,
                "span",
                "status-badge",
                "Already Registered"
            );

            registeredBadge.setAttribute(
                "aria-label",
                "Already registered"
            );
        } else if (eventId && isUpcomingScheduledEvent(event)) {
            const registerButton = createButton(
                "Register",
                "primary-button",
                () => registerForEvent(eventId, registerButton)
            );

            card.appendChild(registerButton);
        } else {
            addText(
                card,
                "span",
                "status-badge",
                event.status === "cancelled"
                    ? "Cancelled"
                    : "Registration unavailable"
            );
        }

        container.appendChild(card);
    });
}

function filterBrowseEvents() {
    const searchInput = getElement("event-search");
    const categorySelect = getElement("event-category");

    const searchTerm = (searchInput?.value || "")
        .trim()
        .toLowerCase();

    const selectedCategory = categorySelect?.value || "";

    const approvedEvents = allBrowseEvents.filter(isEventApproved);

    const filteredEvents = approvedEvents.filter((event) => {
        const title = getEventName(event).toLowerCase();
        const description = (event.description || "").toLowerCase();
        const venue = (event.venue || "").toLowerCase();
        const club = getEventClubName(event).toLowerCase();
        const category = getEventCategory(event);

        const matchesSearch =
            !searchTerm ||
            title.includes(searchTerm) ||
            description.includes(searchTerm) ||
            venue.includes(searchTerm) ||
            club.includes(searchTerm);

        const matchesCategory =
            !selectedCategory ||
            selectedCategory === "all" ||
            category.toLowerCase() === selectedCategory.toLowerCase();

        return matchesSearch && matchesCategory;
    });

    renderBrowseEvents(filteredEvents);
}

function initializeEventBrowser() {
    const searchButton = getElement("search-events-button");
    const searchInput = getElement("event-search");
    const categorySelect = getElement("event-category");

    if (searchButton) {
        searchButton.addEventListener("click", filterBrowseEvents);
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                filterBrowseEvents();
            }
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener("change", filterBrowseEvents);
    }
}


// -------------------- 9. REGISTER FOR AN EVENT --------------------

async function registerForEvent(eventId, button = null) {
    if (!eventId) {
        alert("Invalid event ID.");
        return;
    }

    if (registeredEventIds.has(eventId)) {
        alert("You are already registered for this event.");
        return;
    }

    const event = allBrowseEvents.find(
        (item) => getEventId(item) === eventId
    );

    if (event && !isUpcomingScheduledEvent(event)) {
        alert("Registration is not available for this event.");
        return;
    }

    setButtonLoading(button, true, "Registering...");

    try {
        await apiRequest(API.registerForEvent(eventId), {
            method: "POST"
        });

        alert("You have successfully registered for the event.");

        // Refresh the registration list and dashboard counts.
        await loadRegistrations();
        await loadBrowseEvents();
        await loadAttendance();
        await loadCertificates();
    } catch (error) {
        alert(error.message || "Registration failed.");
    } finally {
        setButtonLoading(button, false);
    }
}


// -------------------- 10. MY REGISTRATIONS --------------------

async function loadRegistrations() {
    showMessage("registrations-message", "Loading registrations...");

    const container = getElement("events-list");

    if (container) {
        container.replaceChildren();
    }

    try {
        const data = await apiRequest(API.myRegistrations);
        const registrations = getRegistrationList(data);

        registeredEventIds = new Set(
            registrations
                .map(getRegistrationEventId)
                .filter(Boolean)
        );

        renderRegistrations(registrations);

        // Keep the registration count accurate.
        setText("registered-count", registrations.length);
    } catch (error) {
        showMessage(
            "registrations-message",
            error.message || "Unable to load registrations.",
            "error"
        );
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

        const eventId =
            getRegistrationEventId(registration) ||
            getEventId(event);

        const card = createElement("article", "data-item");

        addText(
            card,
            "h3",
            "data-item-title",
            getEventName(event || {})
        );

        addText(
            card,
            "p",
            "",
            `Date: ${formatDate(event?.date)}`
        );

        addText(
            card,
            "p",
            "",
            `Venue: ${event?.venue || "Not specified"}`
        );

        const registrationStatus =
            registration.status ||
            registration.registrationStatus ||
            "Registered";

        addText(
            card,
            "span",
            "status",
            registrationStatus
        );

        if (eventId) {
            const detailsButton = createButton(
                "View Details",
                "secondary-button",
                () => {
                    window.location.href =
                        `../event-details/index.html?id=${encodeURIComponent(eventId)}`;
                }
            );

            card.appendChild(detailsButton);
        }

        const canCancel =
            registration.status !== "cancelled" &&
            registration.status !== "attended" &&
            event?.status !== "cancelled" &&
            event?.status !== "completed";

        if (eventId && canCancel) {
            const cancelButton = createButton(
                "Cancel Registration",
                "cancel-button",
                () => cancelRegistration(eventId, cancelButton)
            );

            card.appendChild(cancelButton);
        }

        container.appendChild(card);
    });
}

async function cancelRegistration(eventId, button = null) {
    if (!eventId) {
        alert("Unable to identify this event.");
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to cancel your registration for this event?"
    );

    if (!confirmed) return;

    setButtonLoading(button, true, "Cancelling...");

    try {
        await apiRequest(API.cancelRegistration(eventId), {
            method: "DELETE"
        });

        alert("Your registration has been cancelled.");

        await loadRegistrations();
        await loadBrowseEvents();
    } catch (error) {
        alert(error.message || "Unable to cancel registration.");
    } finally {
        setButtonLoading(button, false);
    }
}


// -------------------- 11. MY ATTENDANCE --------------------

async function loadAttendance() {
    showMessage("attendance-message", "Loading attendance...");

    const container = getElement("attendance-list");

    if (container) {
        container.replaceChildren();
    }

    try {
        const data = await apiRequest(API.myAttendance);
        const attendance = getAttendanceList(data);

        renderAttendance(attendance);
        setText("attendance-count", attendance.length);
    } catch (error) {
        showMessage(
            "attendance-message",
            error.message || "Unable to load attendance.",
            "error"
        );
    }
}

function renderAttendance(records) {
    const container = getElement("attendance-list");

    if (!container) return;

    container.replaceChildren();

    if (!records.length) {
        showMessage(
            "attendance-message",
            "No attendance records found yet."
        );
        return;
    }

    clearMessage("attendance-message");

    records.forEach((record) => {
        const event =
            getRegistrationEvent(record) ||
            (record.event && typeof record.event === "object"
                ? record.event
                : null);

        const eventId =
            getId(record.event || record.eventId) ||
            getEventId(event);

        const card = createElement("article", "data-item");

        addText(
            card,
            "h3",
            "data-item-title",
            getEventName(event || {})
        );

        addText(
            card,
            "p",
            "",
            `Attendance date: ${formatDate(
                record.checkedInAt ||
                record.attendanceDate ||
                record.createdAt ||
                event?.date
            )}`
        );

        addText(
            card,
            "span",
            "status",
            record.status || "Present"
        );

        if (eventId) {
            card.appendChild(
                createButton(
                    "View Event",
                    "secondary-button",
                    () => {
                        window.location.href =
                            `../event-details/index.html?id=${encodeURIComponent(eventId)}`;
                    }
                )
            );
        }

        container.appendChild(card);
    });
}


// -------------------- 12. MY CERTIFICATES --------------------

async function loadCertificates() {
    showMessage("certificates-message", "Loading certificates...");

    const container = getElement("certificates-list");

    if (container) {
        container.replaceChildren();
    }

    try {
        const data = await apiRequest(API.myCertificates);
        const certificates = getCertificateList(data);

        renderCertificates(certificates);
        setText("certificate-count", certificates.length);
    } catch (error) {
        showMessage(
            "certificates-message",
            error.message || "Unable to load certificates.",
            "error"
        );
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

        addText(
            card,
            "h3",
            "data-item-title",
            certificate.title ||
            certificate.event?.title ||
            certificate.eventName ||
            "Event Certificate"
        );

        addText(
            card,
            "p",
            "",
            `Issued: ${formatDateOnly(
                certificate.issuedAt ||
                certificate.createdAt ||
                certificate.issueDate
            )}`
        );

        const certificateId =
            certificate._id ||
            certificate.id ||
            certificate.certificateId;

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


// -------------------- 13. LOGOUT BUTTON --------------------

function initializeLogout() {
    const logoutButton = getElement("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutStudent);
    }
}


// -------------------- 14. LOAD THE DASHBOARD --------------------

async function loadDashboard() {
    const token = getToken();

    if (!token) {
        showMessage(
            "page-message",
            "Please log in to access your student dashboard.",
            "error"
        );

        // Redirect to login after displaying the message.
        window.setTimeout(() => {
            logoutStudent();
        }, 1200);

        return;
    }

    showMessage("page-message", "Loading your dashboard...");

    updateStudentProfile();

    const currentYear = getElement("current-year");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    // Load independent dashboard sections together.
    const results = await Promise.allSettled([
        loadRegistrations(),
        loadAttendance(),
        loadCertificates(),
        loadBrowseEvents()
    ]);

    // Log errors for debugging without stopping other sections.
    results.forEach((result, index) => {
        if (result.status === "rejected") {
            console.error(
                `Dashboard section ${index + 1} failed:`,
                result.reason
            );
        }
    });

    clearMessage("page-message");
}


// -------------------- 15. INITIALIZE WHEN HTML IS READY --------------------

document.addEventListener("DOMContentLoaded", () => {
    initializeEventBrowser();
    initializeLogout();
    updateStudentProfile();
    loadDashboard();
});
