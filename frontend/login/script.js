
"use strict";

const API_BASE_URL = "http://localhost:5000/api";
const LOGIN_ENDPOINT = `${API_BASE_URL}/auth/login`;

/*
 * Update these paths if your actual dashboard locations differ.
 * Student and administrator pages are based on the paths used
 * elsewhere in your CampusConnect frontend.
 */
const ROLE_REDIRECTS = {
    student: "../student-dashboard/index.html",
    faculty: "../admin-analytics/index.html",
    dean: "../admin-analytics/index.html",
    superadmin: "../admin-analytics/index.html"
};

document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    setupPasswordToggle();
    setupInputValidation();
    setupLoginForm();
});

function $(id) {
    return document.getElementById(id);
}

function setCurrentYear() {
    const yearElement = $("current-year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

/* ---------------- PASSWORD VISIBILITY ---------------- */

function setupPasswordToggle() {
    const passwordInput = $("password");
    const toggleButton = $("password-toggle");

    if (!passwordInput || !toggleButton) return;

    toggleButton.addEventListener("click", () => {
        const shouldShow = passwordInput.type === "password";

        passwordInput.type = shouldShow ? "text" : "password";
        toggleButton.setAttribute(
            "aria-label",
            shouldShow ? "Hide password" : "Show password"
        );
        toggleButton.setAttribute("aria-pressed", String(shouldShow));
    });
}

/* ---------------- VALIDATION ---------------- */

function setupInputValidation() {
    const emailInput = $("email");
    const passwordInput = $("password");

    emailInput.addEventListener("input", () => {
        clearFieldError("email");
        hideLoginMessage();
    });

    passwordInput.addEventListener("input", () => {
        clearFieldError("password");
        hideLoginMessage();
    });
}

function validateEmail(email) {
    // Basic format validation. The backend remains authoritative.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm(email, password) {
    let isValid = true;

    clearFieldError("email");
    clearFieldError("password");
    hideLoginMessage();

    if (!email) {
        setFieldError("email", "Please enter your email address.");
        isValid = false;
    } else if (!validateEmail(email)) {
        setFieldError("email", "Please enter a valid email address.");
        isValid = false;
    }

    if (!password) {
        setFieldError("password", "Please enter your password.");
        isValid = false;
    }

    return isValid;
}

function setFieldError(field, message) {
    const errorElement = $(`${field}-error`);
    const input = $(field);
    const inputWrap = input?.closest(".input-wrap");

    if (errorElement) errorElement.textContent = message;

    if (input) input.setAttribute("aria-invalid", "true");
    if (inputWrap) inputWrap.classList.add("has-error");
}

function clearFieldError(field) {
    const errorElement = $(`${field}-error`);
    const input = $(field);
    const inputWrap = input?.closest(".input-wrap");

    if (errorElement) errorElement.textContent = "";

    if (input) input.removeAttribute("aria-invalid");
    if (inputWrap) inputWrap.classList.remove("has-error");
}

/* ---------------- STATUS MESSAGES ---------------- */

function showLoginMessage(message, type = "error") {
    const messageElement = $("login-message");

    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = type === "success"
        ? "alert success"
        : "alert";

    messageElement.hidden = false;
}

function hideLoginMessage() {
    const messageElement = $("login-message");

    if (!messageElement) return;

    messageElement.textContent = "";
    messageElement.hidden = true;
    messageElement.className = "alert";
}

/* ---------------- LOADING STATE ---------------- */

function setLoading(isLoading) {
    const button = $("login-button");
    const label = button?.querySelector(".button-label");

    if (!button || !label) return;

    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
    button.setAttribute("aria-busy", String(isLoading));
    label.textContent = isLoading ? "Signing in..." : "Sign in";
}

/* ---------------- AUTHENTICATION ---------------- */

function saveLoginData(token, user) {
    /*
     * Keep the storage keys compatible with the existing dashboard.
     * Clear stale authentication data first so old tokens are not reused.
     */
    clearLoginData();

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
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

    for (const key of keys) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }
}

function getSafeRedirectPath(role) {
    const normalizedRole = String(role || "").trim().toLowerCase();
    return ROLE_REDIRECTS[normalizedRole] || null;
}

function getServerErrorMessage(data, status) {
    if (status === 401) {
        return "Incorrect email or password. Please try again.";
    }

    if (status === 403) {
        return data?.message ||
            "You are not permitted to sign in with this account.";
    }

    if (status === 429) {
        return "Too many login attempts. Please wait and try again.";
    }

    if (status >= 500) {
        return "The server encountered a problem. Please try again later.";
    }

    if (status === 400) {
        return data?.message || "Please check your email and password.";
    }

    return data?.message ||
        data?.error ||
        `Login failed (HTTP ${status}). Please try again.`;
}

async function login(email, password) {
    let response;

    try {
        response = await fetch(LOGIN_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ email, password })
        });
    } catch {
        throw new Error(
            "Cannot connect to CampusConnect. Make sure your backend is running on port 5000."
        );
    }

    const responseText = await response.text();
    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            if (response.ok) {
                throw new Error(
                    "The server returned an unexpected response. Please try again."
                );
            }
        }
    }

    if (!response.ok) {
        throw new Error(getServerErrorMessage(data, response.status));
    }

    /*
     * Expected backend response:
     * {
     *   message: "Login successful",
     *   token: "...",
     *   user: { id, name, email, role }
     * }
     */
    if (
        typeof data.token !== "string" ||
        !data.token ||
        !data.user ||
        typeof data.user !== "object" ||
        !data.user.role
    ) {
        throw new Error(
            "Login response is missing the expected token or user role. Please check the backend response."
        );
    }

    return data;
}

/* ---------------- ROLE-BASED REDIRECT ---------------- */

function redirectUser(user) {
    const destination = getSafeRedirectPath(user.role);

    if (!destination) {
        /*
         * Do not guess a destination for an unconfigured role.
         * Clear the newly stored credentials and display a useful message.
         */
        clearLoginData();

        throw new Error(
            `Your account role "${user.role}" does not have a configured dashboard. Please contact your administrator.`
        );
    }

    window.location.assign(destination);
}

/* ---------------- FORM SUBMISSION ---------------- */

function setupLoginForm() {
    const form = $("login-form");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = $("email");
        const passwordInput = $("password");

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!validateForm(email, password)) {
            const firstInvalid = document.querySelector(
                '[aria-invalid="true"]'
            );

            firstInvalid?.focus();
            return;
        }

        setLoading(true);

        try {
            const data = await login(email, password);

            saveLoginData(data.token, data.user);
            redirectUser(data.user);
        } catch (error) {
            showLoginMessage(
                error?.message ||
                "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    });
}
