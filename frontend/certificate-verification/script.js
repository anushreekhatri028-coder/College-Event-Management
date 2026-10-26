
"use strict";

// ============================================
// 1. API CONFIGURATION
// ============================================

const API_BASE_URL = "http://localhost:5000/api";

const API = {
    verifyCertificate: (certificateId) =>
        `${API_BASE_URL}/certificates/verify/${encodeURIComponent(certificateId)}`
};


// ============================================
// 2. PAGE STATE
// ============================================

let currentCertificateId = "";
let verificationInProgress = false;


// ============================================
// 3. INITIALIZE PAGE
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    const yearElement = getElement("current-year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    getElement("retry-button").addEventListener(
        "click",
        verifyCertificateFromURL
    );

    verifyCertificateFromURL();
});


// ============================================
// 4. DOM HELPERS
// ============================================

function getElement(id) {
    return document.getElementById(id);
}

function showMessage(message, type = "info") {
    const element = getElement("verification-message");

    element.textContent = message;
    element.className = `message ${type}`;
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
}

function setRetryButtonVisible(visible) {
    getElement("retry-button").hidden = !visible;
}

function setResultVisible(visible) {
    getElement("certificate-result").hidden = !visible;
}


// ============================================
// 5. URL HELPERS
// ============================================

function getCertificateIdFromURL() {
    const params = new URLSearchParams(window.location.search);

    return (
        params.get("id") ||
        params.get("certificateId") ||
        ""
    ).trim();
}


// ============================================
// 6. SAFE RESPONSE HELPERS
// ============================================

async function readResponse(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        return {};
    }
}

function getCertificateFromResponse(data) {
    if (!data || typeof data !== "object") {
        return null;
    }

    // Common response: { verified: true, certificate: {...} }
    if (
        data.certificate &&
        typeof data.certificate === "object"
    ) {
        return data.certificate;
    }

    // Alternative response: { verified: true, data: { certificate: {...} } }
    if (
        data.data?.certificate &&
        typeof data.data.certificate === "object"
    ) {
        return data.data.certificate;
    }

    // Alternative response: { verified: true, data: {...certificate fields...} }
    if (
        data.data &&
        typeof data.data === "object" &&
        !Array.isArray(data.data) &&
        (
            data.data.certificateId ||
            data.data.student ||
            data.data.studentName ||
            data.data.event
        )
    ) {
        return data.data;
    }

    // Alternative response: certificate fields at the top level.
    if (
        data.certificateId ||
        data.student ||
        data.studentName ||
        data.event
    ) {
        return data;
    }

    return null;
}

function getDisplayValue(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }

        if (typeof value === "number") {
            return String(value);
        }

        if (value && typeof value === "object") {
            const nestedValue =
                value.name ||
                value.fullName ||
                value.title ||
                value.email ||
                value.eventTitle ||
                "";

            if (nestedValue) {
                return String(nestedValue);
            }
        }
    }

    return "Not available";
}

function formatDate(value) {
    if (!value) {
        return "Not available";
    }

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

function formatStatus(value) {
    if (!value) {
        return "Not available";
    }

    return String(value)
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}


// ============================================
// 7. GET CERTIFICATE DETAILS
// ============================================

function getCertificateDetails(certificate) {
    const student = certificate?.student;
    const event = certificate?.event;

    return {
        id: getDisplayValue(
            certificate?.certificateId,
            certificate?.id,
            currentCertificateId
        ),

        recipient: getDisplayValue(
            certificate?.studentName,
            student?.name,
            student?.fullName,
            student?.email
        ),

        event: getDisplayValue(
            certificate?.eventTitle,
            event?.title,
            event?.name
        ),

        issueDate: formatDate(
            certificate?.issuedAt ||
            certificate?.issueDate ||
            certificate?.createdAt
        ),

        status: getDisplayValue(
            certificate?.status,
            "Valid"
        )
    };
}


// ============================================
// 8. DISPLAY VERIFICATION RESULT
// ============================================

function renderVerificationResult({
    valid,
    title,
    description,
    certificate = null
}) {
    const icon = getElement("result-icon");

    getElement("result-title").textContent = title;
    getElement("result-description").textContent = description;

    icon.className = valid
        ? "result-icon valid"
        : "result-icon invalid";

    icon.textContent = valid ? "✓" : "✕";

    const details = certificate
        ? getCertificateDetails(certificate)
        : {
            id: currentCertificateId || "Not available",
            recipient: "Not available",
            event: "Not available",
            issueDate: "Not available",
            status: valid ? "Valid" : "Not verified"
        };

    getElement("certificate-id").textContent = details.id;
    getElement("recipient-name").textContent = details.recipient;
    getElement("event-name").textContent = details.event;
    getElement("issue-date").textContent = details.issueDate;
    getElement("certificate-status").textContent = details.status;

    setResultVisible(true);
}


// ============================================
// 9. VERIFY CERTIFICATE
// ============================================

async function verifyCertificateFromURL() {
    if (verificationInProgress) {
        return;
    }

    currentCertificateId = getCertificateIdFromURL();

    setResultVisible(false);
    setRetryButtonVisible(false);

    if (!currentCertificateId) {
        showMessage(
            "Certificate ID is missing. Open a valid certificate verification link.",
            "error"
        );

        renderVerificationResult({
            valid: false,
            title: "Certificate Not Verified",
            description: "No certificate ID was provided in the URL."
        });

        return;
    }

    verificationInProgress = true;

    showMessage(
        "Verifying certificate. Please wait...",
        "info"
    );

    try {
        const response = await fetch(
            API.verifyCertificate(currentCertificateId),
            {
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        const data = await readResponse(response);

        // The backend must explicitly confirm validity.
        const verified = data?.verified === true;

        if (!response.ok || !verified) {
            const message =
                data?.message ||
                data?.error ||
                (
                    response.status === 404
                        ? "No certificate was found with this ID."
                        : "The certificate could not be verified."
                );

            showMessage(message, "error");

            renderVerificationResult({
                valid: false,
                title: "Certificate Not Verified",
                description: message,
                certificate: getCertificateFromResponse(data)
            });

            setRetryButtonVisible(
                response.status >= 500 ||
                response.status === 429
            );

            return;
        }

        const certificate = getCertificateFromResponse(data);

        showMessage(
            data.message || "Certificate verified successfully.",
            "success"
        );

        renderVerificationResult({
            valid: true,
            title: "Certificate Is Valid",
            description:
                "The backend has confirmed that this certificate is valid.",
            certificate
        });

    } catch (error) {
        console.error(
            "Certificate verification error:",
            error
        );

        showMessage(
            "Unable to connect to the server. Check that the backend is running on port 5000.",
            "error"
        );

        renderVerificationResult({
            valid: false,
            title: "Verification Unavailable",
            description:
                "The certificate could not be verified because the server could not be reached."
        });

        setRetryButtonVisible(true);

    } finally {
        verificationInProgress = false;
    }
}
