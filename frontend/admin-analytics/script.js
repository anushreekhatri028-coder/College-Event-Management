
"use strict";

/* =====================================================
   ADMIN ANALYTICS DASHBOARD
   File: frontend/admin-analytics/script.js
===================================================== */

const API_BASE_URL = "http://localhost:5000/api";

/*
  IMPORTANT:
  Confirm these three paths against your backend routes.
  If your route names differ, change only these constants.
*/
const API = {
    dashboard: `${API_BASE_URL}/admin/dashboard`,
    popularEvents: `${API_BASE_URL}/admin/popular-events`,
    pendingEvents: `${API_BASE_URL}/events/pending`
};

/* =====================================================
   1. INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    loadAdminProfile();
    setupLogout();
    setupRefreshButton();
    loadAnalytics();
});

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

function setCurrentYear() {
    const year = getElement("current-year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }
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

    if (["approved", "completed", "scheduled"].includes(status)) {
        return "approved";
    }

    if (["pending", "awaiting_approval"].includes(status)) {
        return "pending";
    }

    if (["rejected", "cancelled", "canceled"].includes(status)) {
        return "rejected";
    }

    return "other";
}

function getArray(response, keys = []) {
    if (Array.isArray(response)) {
        return response;
    }

    if (!response || typeof response !== "object") {
        return [];
    }

    for (const key of keys) {
        if (Array.isArray(response[key])) {
            return response[key];
        }
    }

    if (response.data && Array.isArray(response.data)) {
        return response.data;
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

function getEventId(event) {
    return String(event?._id || event?.id || event?.eventId || "");
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
   3. AUTHENTICATION
===================================================== */

function checkLogin() {
    if (!getToken()) {
        window.location.href = "../login/index.html";
        return false;
    }

    return true;
}

async function apiRequest(url) {
    const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders()
    });

    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = text ? { message: text } : null;
    }

    if (response.status === 401) {
        clearAuthData();
        window.location.href = "../login/index.html";

        throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
        throw new Error(
            "Access denied. This page is intended for authorized administrators."
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

function clearAuthData() {
    [
        "token",
        "authToken",
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
    const possibleKeys = ["user", "currentUser"];
    let user = null;

    for (const key of possibleKeys) {
        const stored =
            localStorage.getItem(key) ||
            sessionStorage.getItem(key);

        if (!stored) continue;

        try {
            user = JSON.parse(stored);

            if (user && typeof user === "object") {
                break;
            }
        } catch (error) {
            user = null;
        }
    }

    const name = user?.name || user?.fullName || "Administrator";
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
    if (!checkLogin()) return;

    clearMessage();

    const results = await Promise.allSettled([
        apiRequest(API.dashboard),
        apiRequest(API.popularEvents),
        apiRequest(API.pendingEvents)
    ]);

    const dashboardResult = results[0];
    const popularResult = results[1];
    const pendingResult = results[2];

    let failures = 0;

    if (dashboardResult.status === "fulfilled") {
        renderDashboardStats(dashboardResult.value);
        renderEventStatusChart(dashboardResult.value);
    } else {
        failures++;
        console.error("Dashboard API error:", dashboardResult.reason);
        renderStatsUnavailable();
    }

    let popularEvents = [];

    if (popularResult.status === "fulfilled") {
        popularEvents = getArray(popularResult.value, [
            "popularEvents",
            "events",
            "results"
        ]);

        renderPopularEvents(popularEvents);
        renderPerformanceChart(popularEvents);
    } else {
        failures++;
        console.error("Popular events API error:", popularResult.reason);
        renderPopularEvents([]);
        renderPerformanceChart([]);
    }

    if (pendingResult.status === "fulfilled") {
        const pendingEvents = getArray(pendingResult.value, [
            "events",
            "pendingEvents",
            "results"
        ]);

        renderPendingEvents(pendingEvents);
        updatePendingCount(pendingEvents.length);
    } else {
        failures++;
        console.error("Pending events API error:", pendingResult.reason);
        renderPendingEvents([]);
        updatePendingCount(0);
    }

    if (failures === 0) {
        showMessage("Analytics loaded successfully.", "success");
    } else {
        showMessage(
            `${failures} analytics request(s) failed. Check the browser console and verify the API paths and response formats.`,
            "error"
        );
    }
}

/* =====================================================
   7. DASHBOARD STATISTICS
===================================================== */

function renderStatsUnavailable() {
    updateStat("total-events", "—");
    updateStat("pending-events", "—");
    updateStat("total-registrations", "—");
    updateStat("total-attendance", "—");
}

function updateStat(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = String(value);
    }
}

function renderDashboardStats(response) {
    const stats = response?.stats ||
        response?.statistics ||
        response?.dashboard ||
        response?.data ||
        response ||
        {};

    const totalEvents = getNumber(stats, [
        "totalEvents",
        "totalEventCount",
        "eventCount",
        "total_events"
    ]);

    const pendingEvents = getNumber(stats, [
        "pendingEvents",
        "pendingApprovals",
        "pendingEventCount",
        "pending_events"
    ]);

    const registrations = getNumber(stats, [
        "totalRegistrations",
        "registrationCount",
        "totalRegistrationsCount",
        "total_registrations"
    ]);

    const attendance = getNumber(stats, [
        "totalAttendance",
        "totalAttendees",
        "attendanceCount",
        "totalPresent",
        "total_attendance"
    ]);

    updateStat(
        "total-events",
        totalEvents === null ? "—" : totalEvents
    );

    updateStat(
        "pending-events",
        pendingEvents === null ? "—" : pendingEvents
    );

    updateStat(
        "total-registrations",
        registrations === null ? "—" : registrations
    );

    updateStat(
        "total-attendance",
        attendance === null ? "—" : attendance
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
            "No popular event data is available."
        );

        cell.colSpan = 4;
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

        const registrationCount = getRegistrationCount(event);

        const registrationCell = createElement(
            "td",
            "",
            registrationCount === null ? "—" : registrationCount
        );

        const status = event.approvalStatus || event.status || "Unknown";
        const statusCell = createElement("td");
        const badge = createElement(
            "span",
            `status-badge ${getStatusClass(status)}`,
            getStatusLabel(status)
        );

        statusCell.appendChild(badge);

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

        const status = event.approvalStatus || "pending";
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

    const validRegistrationCounts = chartEvents
        .map(getRegistrationCount)
        .filter(value => value !== null);

    const validAttendanceCounts = chartEvents
        .map(getAttendanceCount)
        .filter(value => value !== null);

    const maxValue = Math.max(
        1,
        ...validRegistrationCounts,
        ...validAttendanceCounts
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
                    "Registration and attendance counts unavailable"
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

function renderEventStatusChart(response) {
    const container = getElement("status-chart");

    if (!container) return;

    container.replaceChildren();

    const stats = response?.stats ||
        response?.statistics ||
        response?.dashboard ||
        response?.data ||
        response ||
        {};

    const statusCounts = stats.eventStatuses ||
        stats.statusCounts ||
        stats.eventsByStatus ||
        null;

    if (
        statusCounts &&
        typeof statusCounts === "object" &&
        !Array.isArray(statusCounts)
    ) {
        const entries = Object.entries(statusCounts)
            .filter(([, value]) => Number.isFinite(Number(value)));

        if (entries.length) {
            const total = entries.reduce(
                (sum, [, value]) => sum + Number(value),
                0
            );

            entries.forEach(([status, count]) => {
                container.appendChild(
                    createStatusRow(status, Number(count), total)
                );
            });

            return;
        }
    }

    // If the dashboard endpoint does not provide status counts,
    // show the available aggregate counts without inventing data.
    const total = getNumber(stats, [
        "totalEvents",
        "totalEventCount",
        "eventCount"
    ]);

    const pending = getNumber(stats, [
        "pendingEvents",
        "pendingApprovals",
        "pendingEventCount"
    ]);

    if (total === null && pending === null) {
        container.appendChild(
            createElement(
                "p",
                "empty-state",
                "The dashboard API does not provide event status counts yet."
            )
        );

        return;
    }

    if (pending !== null) {
        container.appendChild(
            createStatusRow(
                "Pending",
                pending,
                total === null ? pending : total
            )
        );
    }

    if (total !== null && pending !== null) {
        const otherEvents = Math.max(0, total - pending);

        container.appendChild(
            createStatusRow(
                "Non-pending",
                otherEvents,
                total
            )
        );
    }
}

function createStatusRow(status, count, total) {
    const row = createElement("div", "status-row");

    const heading = createElement("div", "status-heading");

    const label = createElement("span", "", getStatusLabel(status));
    const number = createElement("strong", "", count);

    heading.append(label, number);

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
        const confirmed = window.confirm("Are you sure you want to log out?");

        if (!confirmed) return;

        clearAuthData();

        window.location.href = "../login/index.html";
    });
}
