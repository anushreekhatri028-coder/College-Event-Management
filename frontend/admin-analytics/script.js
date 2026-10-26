
"use strict";

/*
=========================================================
CampusConnect — Admin Analytics Dashboard
File: frontend/admin-analytics/script.js
=========================================================

Uses:
GET /api/events/
GET /api/events/pending

The registrations and attendance totals are calculated only
when the returned event data includes those counts.

IMPORTANT:
Confirm the login page path and token storage keys match
your existing login implementation.
*/

const API_BASE_URL = "http://localhost:5000/api";

const API = {
    events: `${API_BASE_URL}/events`,
    pendingEvents: `${API_BASE_URL}/events/pending`
};

const state = {
    events: [],
    pendingEvents: []
};

/* =====================================================
   1. INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", initializeDashboard);

async function initializeDashboard() {
    setCurrentYear();
    loadAdminProfile();
    setupLogout();
    setupRefreshButton();

    await loadAnalytics();
}

/* =====================================================
   2. GENERAL HELPERS
===================================================== */

function getElement(id) {
    return document.getElementById(id);
}

function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = String(text ?? "");

    return element;
}

function getToken() {
    return (
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken")
    );
}

function getAuthHeaders() {
    const headers = {
        Accept: "application/json"
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

function setCurrentYear() {
    const element = getElement("current-year");

    if (element) {
        element.textContent = new Date().getFullYear();
    }
}

function showMessage(message, type = "info") {
    const element = getElement("page-message");

    if (!element) return;

    element.textContent = message;
    element.className = `message ${type}`;
    element.hidden = false;
}

function clearMessage() {
    const element = getElement("page-message");

    if (!element) return;

    element.textContent = "";
    element.hidden = true;
}

function formatDate(value) {
    if (!value) return "Not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not specified";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function normalizeStatus(value) {
    return String(value || "unknown")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function getStatusLabel(value) {
    return normalizeStatus(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getStatusClass(value) {
    const status = normalizeStatus(value);

    if (
        ["approved", "completed", "scheduled", "present"]
            .includes(status)
    ) {
        return "approved";
    }

    if (
        ["pending", "awaiting_approval"]
            .includes(status)
    ) {
        return "pending";
    }

    if (
        ["rejected", "cancelled", "canceled"]
            .includes(status)
    ) {
        return "rejected";
    }

    return "other";
}

function getArray(response, possibleKeys = []) {
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

    if (Array.isArray(response.data)) {
        return response.data;
    }

    if (response.data && typeof response.data === "object") {
        for (const key of possibleKeys) {
            if (Array.isArray(response.data[key])) {
                return response.data[key];
            }
        }
    }

    return [];
}

function getNumber(object, keys) {
    for (const key of keys) {
        const value = object?.[key];

        if (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            Number.isFinite(Number(value))
        ) {
            return Number(value);
        }
    }

    return null;
}

function getEventTitle(event) {
    return event?.title || event?.name || "Untitled event";
}

function getEventCategory(event) {
    return event?.category || "Uncategorized";
}

function getRegistrationCount(event) {
    return getNumber(event, [
        "registrationCount",
        "registrationsCount",
        "totalRegistrations",
        "registration_count",
        "registrations"
    ]);
}

function getAttendanceCount(event) {
    return getNumber(event, [
        "attendanceCount",
        "attendeesCount",
        "totalAttendance",
        "totalAttendees",
        "attendance_count",
        "attendees"
    ]);
}

/* =====================================================
   3. AUTHENTICATION AND API REQUESTS
===================================================== */

function checkLogin() {
    if (!getToken()) {
        showMessage(
            "Login token not found. Please log in before opening Admin Analytics.",
            "error"
        );

        return false;
    }

    return true;
}

async function apiRequest(url) {
    const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders()
    });

    const contentType =
        response.headers.get("content-type") || "";

    let data = null;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const responseText = await response.text();

        if (responseText) {
            data = { message: responseText };
        }
    }

    if (response.status === 401) {
        clearAuthData();

        showMessage(
            "Your session has expired. Please log in again.",
            "error"
        );

        throw new Error("Unauthorized: HTTP 401");
    }

    if (response.status === 403) {
        throw new Error(
            "Access denied. Your account may not have administrator permissions."
        );
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            `API request failed with HTTP ${response.status}.`
        );
    }

    return data;
}

function clearAuthData() {
    [
        "token",
        "authToken",
        "accessToken",
        "userToken",
        "user",
        "currentUser"
    ].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}

/* =====================================================
   4. ADMIN PROFILE
===================================================== */

function loadAdminProfile() {
    let user = null;

    for (const key of ["user", "currentUser"]) {
        const stored =
            localStorage.getItem(key) ||
            sessionStorage.getItem(key);

        if (!stored) continue;

        try {
            user = JSON.parse(stored);

            if (user && typeof user === "object") {
                break;
            }
        } catch {
            user = null;
        }
    }

    const name =
        user?.name ||
        user?.fullName ||
        user?.username ||
        "Administrator";

    const role = user?.role || "Admin";

    const nameElement = getElement("admin-name");
    const roleElement = getElement("admin-role");
    const avatarElement = getElement("admin-avatar");

    if (nameElement) {
        nameElement.textContent = name;
    }

    if (roleElement) {
        roleElement.textContent = role;
    }

    if (avatarElement) {
        avatarElement.textContent = name.charAt(0).toUpperCase();
    }
}

/* =====================================================
   5. REFRESH BUTTON
===================================================== */

function setupRefreshButton() {
    const button = getElement("refresh-button");

    if (!button) return;

    button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Refreshing...";

        try {
            await loadAnalytics();
        } finally {
            button.disabled = false;
            button.textContent = "↻ Refresh Data";
        }
    });
}

/* =====================================================
   6. LOAD ANALYTICS
===================================================== */

async function loadAnalytics() {
    clearMessage();

    if (!checkLogin()) return;

    showLoadingState();

    const results = await Promise.allSettled([
        apiRequest(API.events),
        apiRequest(API.pendingEvents)
    ]);

    const eventsResult = results[0];
    const pendingResult = results[1];

    let failures = 0;

    if (eventsResult.status === "fulfilled") {
        state.events = getArray(eventsResult.value, [
            "events",
            "results"
        ]);

        renderDashboardStats(state.events, null);
        renderPopularEvents(state.events);
        renderPerformanceChart(state.events);
        renderEventStatusChart(state.events);
    } else {
        failures++;

        console.error(
            "Events API error:",
            eventsResult.reason
        );

        state.events = [];

        renderStatsUnavailable();
        renderPopularEvents([]);
        renderPerformanceChart([]);
        renderEventStatusChart([]);
    }

    if (pendingResult.status === "fulfilled") {
        state.pendingEvents = getArray(pendingResult.value, [
            "events",
            "pendingEvents",
            "results"
        ]);

        renderPendingEvents(state.pendingEvents);
        updatePendingCount(state.pendingEvents.length);
    } else {
        failures++;

        console.error(
            "Pending events API error:",
            pendingResult.reason
        );

        state.pendingEvents = [];

        renderPendingEvents([]);
        updatePendingCount(0);
    }

    if (failures === 0) {
        showMessage(
            "Event data loaded. Registration and attendance totals appear only when supported by the returned data.",
            "success"
        );
    } else {
        showMessage(
            `${failures} API request(s) failed. Check the browser console and Network tab for the exact backend error.`,
            "error"
        );
    }
}

function showLoadingState() {
    updateStat("total-events", "Loading...");
    updateStat("pending-events", "Loading...");
    updateStat("total-registrations", "—");
    updateStat("total-attendance", "—");

    const popularBody = getElement("popular-events-body");
    const pendingBody = getElement("pending-events-body");

    if (popularBody) {
        popularBody.replaceChildren();

        const row = createElement("tr");
        const cell = createElement(
            "td",
            "empty-state",
            "Loading events..."
        );

        cell.colSpan = 4;
        row.appendChild(cell);
        popularBody.appendChild(row);
    }

    if (pendingBody) {
        pendingBody.replaceChildren();

        const row = createElement("tr");
        const cell = createElement(
            "td",
            "empty-state",
            "Loading pending events..."
        );

        cell.colSpan = 5;
        row.appendChild(cell);
        pendingBody.appendChild(row);
    }
}

/* =====================================================
   7. DASHBOARD STATISTICS
===================================================== */

function updateStat(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = String(value);
    }
}

function renderStatsUnavailable() {
    updateStat("total-events", "—");
    updateStat("pending-events", "—");
    updateStat("total-registrations", "—");
    updateStat("total-attendance", "—");
}

function renderDashboardStats(events, pendingEvents) {
    updateStat("total-events", events.length);

    if (Array.isArray(pendingEvents)) {
        updateStat("pending-events", pendingEvents.length);
    } else {
        const pendingCount = events.filter(event =>
            normalizeStatus(event.approvalStatus) === "pending"
        ).length;

        updateStat("pending-events", pendingCount);
    }

    /*
      Do not invent registration/attendance totals.
      These fields are not guaranteed by the event list API.
    */
    const registrationCounts = events.map(getRegistrationCount);
    const attendanceCounts = events.map(getAttendanceCount);

    const allRegistrationCountsAvailable =
        events.length > 0 &&
        registrationCounts.every(value => value !== null);

    const allAttendanceCountsAvailable =
        events.length > 0 &&
        attendanceCounts.every(value => value !== null);

    updateStat(
        "total-registrations",
        allRegistrationCountsAvailable
            ? registrationCounts.reduce((sum, value) => sum + value, 0)
            : "—"
    );

    updateStat(
        "total-attendance",
        allAttendanceCountsAvailable
            ? attendanceCounts.reduce((sum, value) => sum + value, 0)
            : "—"
    );
}

/* =====================================================
   8. POPULAR EVENTS TABLE
===================================================== */

function renderPopularEvents(events) {
    const tbody = getElement("popular-events-body");

    if (!tbody) return;

    tbody.replaceChildren();

    if (!events.length) {
        const row = createElement("tr");
        const cell = createElement(
            "td",
            "empty-state",
            "No events were returned by the API."
        );

        cell.colSpan = 4;
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    const sortedEvents = [...events].sort((a, b) => {
        const countA = getRegistrationCount(a);
        const countB = getRegistrationCount(b);

        if (countA === null && countB === null) return 0;
        if (countA === null) return 1;
        if (countB === null) return -1;

        return countB - countA;
    });

    sortedEvents.slice(0, 10).forEach(event => {
        const row = createElement("tr");

        const titleCell = createElement(
            "td",
            "event-name",
            getEventTitle(event)
        );

        const categoryCell = createElement(
            "td",
            "",
            getEventCategory(event)
        );

        const registrationCount = getRegistrationCount(event);

        const registrationCell = createElement(
            "td",
            "",
            registrationCount === null ? "—" : registrationCount
        );

        const status =
            event.approvalStatus ||
            event.status ||
            "Unknown";

        const statusCell = createElement("td");

        statusCell.appendChild(
            createElement(
                "span",
                `status-badge ${getStatusClass(status)}`,
                getStatusLabel(status)
            )
        );

        row.append(
            titleCell,
            categoryCell,
            registrationCell,
            statusCell
        );

        tbody.appendChild(row);
    });
}

/* =====================================================
   9. PENDING EVENTS TABLE
===================================================== */

function renderPendingEvents(events) {
    const tbody = getElement("pending-events-body");

    if (!tbody) return;

    tbody.replaceChildren();

    if (!events.length) {
        const row = createElement("tr");
        const cell = createElement(
            "td",
            "empty-state",
            "No pending events were returned by the API."
        );

        cell.colSpan = 5;
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    events.forEach(event => {
        const row = createElement("tr");

        const titleCell = createElement(
            "td",
            "event-name",
            getEventTitle(event)
        );

        const categoryCell = createElement(
            "td",
            "",
            getEventCategory(event)
        );

        const dateCell = createElement(
            "td",
            "",
            formatDate(event.date)
        );

        const venueCell = createElement(
            "td",
            "",
            event.venue || "Not specified"
        );

        const statusCell = createElement("td");

        const status = event.approvalStatus || "pending";

        statusCell.appendChild(
            createElement(
                "span",
                `status-badge ${getStatusClass(status)}`,
                getStatusLabel(status)
            )
        );

        row.append(
            titleCell,
            categoryCell,
            dateCell,
            venueCell,
            statusCell
        );

        tbody.appendChild(row);
    });
}

function updatePendingCount(count) {
    const element = getElement("pending-count");

    if (element) {
        element.textContent = String(count);
    }

    updateStat("pending-events", count);
}

/* =====================================================
   10. EVENT PERFORMANCE CHART
===================================================== */

function renderPerformanceChart(events) {
    const container = getElement("performance-chart");

    if (!container) return;

    container.replaceChildren();

    const chartEvents = events.slice(0, 6);

    if (!chartEvents.length) {
        container.appendChild(
            createElement(
                "p",
                "empty-state",
                "No event performance data is available."
            )
        );

        return;
    }

    const registrationCounts = chartEvents
        .map(getRegistrationCount)
        .filter(value => value !== null);

    const attendanceCounts = chartEvents
        .map(getAttendanceCount)
        .filter(value => value !== null);

    const maxValue = Math.max(
        1,
        ...registrationCounts,
        ...attendanceCounts
    );

    chartEvents.forEach(event => {
        const row = createElement("div", "chart-row");

        const label = createElement(
            "div",
            "chart-label",
            getEventTitle(event)
        );

        label.title = getEventTitle(event);

        const group = createElement("div", "bar-group");

        const registrations = getRegistrationCount(event);
        const attendance = getAttendanceCount(event);

        if (registrations === null && attendance === null) {
            group.appendChild(
                createElement(
                    "div",
                    "bar-value",
                    "Counts unavailable"
                )
            );
        } else {
            if (registrations !== null) {
                group.appendChild(
                    createBar(
                        "registrations",
                        registrations,
                        maxValue,
                        "Registrations"
                    )
                );
            }

            if (attendance !== null) {
                group.appendChild(
                    createBar(
                        "attendance",
                        attendance,
                        maxValue,
                        "Attendance"
                    )
                );
            }
        }

        row.append(label, group);
        container.appendChild(row);
    });
}

function createBar(type, value, maxValue, label) {
    const wrapper = createElement("div", "bar-item");

    const track = createElement("div", "bar-track");
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", `${label}: ${value}`);

    const fill = createElement("div", `bar-fill ${type}`);

    const percentage = Math.max(
        0,
        Math.min(100, (value / maxValue) * 100)
    );

    fill.style.width = `${percentage}%`;

    track.appendChild(fill);

    const valueLabel = createElement(
        "div",
        "bar-value",
        `${label}: ${value}`
    );

    wrapper.append(track, valueLabel);

    return wrapper;
}

/* =====================================================
   11. EVENT STATUS CHART
===================================================== */

function renderEventStatusChart(events) {
    const container = getElement("status-chart");

    if (!container) return;

    container.replaceChildren();

    if (!events.length) {
        container.appendChild(
            createElement(
                "p",
                "empty-state",
                "No event status data is available."
            )
        );

        return;
    }

    const counts = {};

    events.forEach(event => {
        const status = normalizeStatus(
            event.approvalStatus || event.status || "unknown"
        );

        counts[status] = (counts[status] || 0) + 1;
    });

    const total = events.length;

    Object.entries(counts).forEach(([status, count]) => {
        container.appendChild(
            createStatusRow(status, count, total)
        );
    });
}

function createStatusRow(status, count, total) {
    const row = createElement("div", "status-row");

    const heading = createElement("div", "status-heading");

    heading.append(
        createElement("span", "", getStatusLabel(status)),
        createElement("strong", "", count)
    );

    const track = createElement("div", "status-track");

    const fill = createElement(
        "div",
        `status-fill ${getStatusClass(status)}`
    );

    const percentage = total > 0
        ? Math.max(0, Math.min(100, (count / total) * 100))
        : 0;

    fill.style.width = `${percentage}%`;

    track.appendChild(fill);
    row.append(heading, track);

    return row;
}

/* =====================================================
   12. LOGOUT
===================================================== */

function setupLogout() {
    const button = getElement("logout-button");

    if (!button) return;

    button.addEventListener("click", () => {
        const confirmed = window.confirm(
            "Are you sure you want to log out?"
        );

        if (!confirmed) return;

        clearAuthData();

        /*
          Change this path if your login page is somewhere else.
          This assumes frontend/login/index.html.
        */
        window.location.href = "../login/index.html";
    });
}
