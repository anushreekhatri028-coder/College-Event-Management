
"use strict";

// ==========================================
// 1. API CONFIGURATION
// ==========================================

const API_BASE_URL = "http://localhost:5000/api";

const LOGIN_ENDPOINT = `${API_BASE_URL}/auth/login`;
const GOOGLE_LOGIN_ENDPOINT = `${API_BASE_URL}/auth/google`;

// ==========================================
// 2. GOOGLE CONFIGURATION
// ==========================================

const GOOGLE_CLIENT_ID =
    "1064890540077-e4df6khuiv78j5e20nt5g7vq5iqq6qbr.apps.googleusercontent.com";

// ==========================================
// 3. ROLE-BASED REDIRECTS
// ==========================================

const ROLE_REDIRECTS = {
    student: "../student-dashboard/index.html",
    organizer: "../student-dashboard/index.html",
    faculty: "../admin-analytics/index.html",
    dean: "../admin-analytics/index.html",
    superadmin: "../admin-analytics/index.html"
};

// ==========================================
// 4. INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    setupPasswordToggle();
    setupInputValidation();
    setupLoginForm();

    initializeGoogleSignIn();
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

// ==========================================
// 5. PASSWORD VISIBILITY
// ==========================================

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

        toggleButton.setAttribute(
            "aria-pressed",
            String(shouldShow)
        );
    });
}

// ==========================================
// 6. INPUT VALIDATION
// ==========================================

function setupInputValidation() {
    const emailInput = $("email");
    const passwordInput = $("password");

    if (emailInput) {
        emailInput.addEventListener("input", () => {
            clearFieldError("email");
            hideLoginMessage();
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener("input", () => {
            clearFieldError("password");
            hideLoginMessage();
        });
    }
}

function validateEmail(email) {
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

    if (errorElement) {
        errorElement.textContent = message;
    }

    if (input) {
        input.setAttribute("aria-invalid", "true");
    }

    if (inputWrap) {
        inputWrap.classList.add("has-error");
    }
}

function clearFieldError(field) {
    const errorElement = $(`${field}-error`);
    const input = $(field);
    const inputWrap = input?.closest(".input-wrap");

    if (errorElement) {
        errorElement.textContent = "";
    }

    if (input) {
        input.removeAttribute("aria-invalid");
    }

    if (inputWrap) {
        inputWrap.classList.remove("has-error");
    }
}

// ==========================================
// 7. STATUS MESSAGES
// ==========================================

function showLoginMessage(message, type = "error") {
    const messageElement = $("login-message");

    if (!messageElement) return;

    messageElement.textContent = message;

    messageElement.className =
        type === "success" ? "alert success" : "alert";

    messageElement.hidden = false;
}

function hideLoginMessage() {
    const messageElement = $("login-message");

    if (!messageElement) return;

    messageElement.textContent = "";
    messageElement.hidden = true;
    messageElement.className = "alert";
}

// ==========================================
// 8. LOADING STATE
// ==========================================

function setLoading(isLoading) {
    const button = $("login-button");

    if (!button) return;

    const label = button.querySelector("span:first-child");

    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
    button.setAttribute("aria-busy", String(isLoading));

    if (label) {
        label.textContent = isLoading
            ? "Signing in..."
            : "Sign in to CampusConnect";
    }
}

// ==========================================
// 9. AUTHENTICATION STORAGE
// ==========================================

function saveLoginData(token, user) {
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

    keys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}

// ==========================================
// 10. ROLE-BASED REDIRECT
// ==========================================

function getSafeRedirectPath(role) {
    const normalizedRole = String(role || "")
        .trim()
        .toLowerCase();

    return ROLE_REDIRECTS[normalizedRole] || null;
}

function redirectUser(user) {
    const destination = getSafeRedirectPath(user.role);

    if (!destination) {
        clearLoginData();

        throw new Error(
            `Your account role "${user.role}" does not have a configured dashboard. Please contact your administrator.`
        );
    }

    window.location.assign(destination);
}

// ==========================================
// 11. SERVER ERROR HANDLING
// ==========================================

function getServerErrorMessage(data, status) {
    if (status === 401) {
        return data?.message ||
            "Incorrect email/password or Google authentication failed.";
    }

    if (status === 403) {
        return data?.message ||
            "You are not permitted to sign in with this account.";
    }

    if (status === 429) {
        return "Too many login attempts. Please wait and try again.";
    }

    if (status >= 500) {
        return data?.message ||
            "The server encountered a problem. Please try again later.";
    }

    if (status === 400) {
        return data?.message ||
            "Please check your login information.";
    }

    return data?.message ||
        data?.error ||
        `Login failed (HTTP ${status}). Please try again.`;
}

// ==========================================
// 12. API RESPONSE HANDLING
// ==========================================

async function parseApiResponse(response) {
    const responseText = await response.text();

    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            throw new Error(
                "The server returned an invalid response. Please try again."
            );
        }
    }

    if (!response.ok || data.success === false) {
        throw new Error(
            getServerErrorMessage(data, response.status)
        );
    }

    if (
        typeof data.token !== "string" ||
        !data.token ||
        !data.user ||
        typeof data.user !== "object" ||
        !data.user.role
    ) {
        throw new Error(
            "The server response is missing the expected token or user information."
        );
    }

    return data;
}

// ==========================================
// 13. EMAIL AND PASSWORD LOGIN
// ==========================================

async function login(email, password) {
    let response;

    try {
        response = await fetch(LOGIN_ENDPOINT, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })
        });

    } catch {
        throw new Error(
            "Cannot connect to CampusConnect. Make sure your backend is running on port 5000."
        );
    }

    return await parseApiResponse(response);
}

// ==========================================
// 14. LOGIN FORM SUBMISSION
// ==========================================

function setupLoginForm() {
    const form = $("login-form");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = $("email");
        const passwordInput = $("password");

        if (!emailInput || !passwordInput) return;

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

// ==========================================
// 15. GOOGLE SIGN-IN INITIALIZATION
// ==========================================

let googleSignInInitialized = false;

function initializeGoogleSignIn() {
    if (googleSignInInitialized) return;

    // Check Google library.
    if (
        !window.google ||
        !window.google.accounts ||
        !window.google.accounts.id
    ) {
        console.warn(
            "Google Identity Services is not loaded yet."
        );
        return;
    }

    // Check Client ID.
    if (!GOOGLE_CLIENT_ID) {
        console.error("Google Client ID is missing.");
        return;
    }

    const buttonContainer = $("google-signin-button");

    if (!buttonContainer) {
        console.error(
            "Google Sign-In button container not found in index.html."
        );
        return;
    }

    try {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false
        });

        buttonContainer.innerHTML = "";

        window.google.accounts.id.renderButton(
            buttonContainer,
            {
                type: "standard",
                theme: "outline",
                size: "large",
                text: "continue_with",
                shape: "rectangular",
                width: 280
            }
        );

        googleSignInInitialized = true;

        console.log(
            "Google Sign-In initialized successfully."
        );

    } catch (error) {
        console.error(
            "Google Sign-In initialization failed:",
            error
        );

        showLoginMessage(
            "Unable to load Google Sign-In. Please refresh the page."
        );
    }
}

// Make initialization function available globally.
window.initializeGoogleSignIn = initializeGoogleSignIn;

// ==========================================
// 16. HANDLE GOOGLE LOGIN RESPONSE
// ==========================================

async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
        showLoginMessage(
            "Google authentication failed. Please try again."
        );
        return;
    }

    const buttonContainer = $("google-signin-button");

    if (buttonContainer) {
        buttonContainer.style.pointerEvents = "none";
        buttonContainer.style.opacity = "0.6";
    }

    hideLoginMessage();

    try {
        let googleResponse;

        try {
            googleResponse = await fetch(GOOGLE_LOGIN_ENDPOINT, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    credential: response.credential
                })
            });

        } catch {
            throw new Error(
                "Cannot connect to CampusConnect. Make sure your backend is running on port 5000."
            );
        }

        const data = await parseApiResponse(googleResponse);

        saveLoginData(data.token, data.user);

        redirectUser(data.user);

    } catch (error) {
        console.error("Google Sign-In Error:", error);

        showLoginMessage(
            error?.message ||
            "Unable to sign in with Google. Please try again."
        );

    } finally {
        if (buttonContainer) {
            buttonContainer.style.pointerEvents = "";
            buttonContainer.style.opacity = "";
        }
    }
}

// ==========================================
// 17. GOOGLE SCRIPT LOAD EVENT
// ==========================================

window.addEventListener("load", () => {
    initializeGoogleSignIn();
});

console.log("CampusConnect login script loaded successfully.");
