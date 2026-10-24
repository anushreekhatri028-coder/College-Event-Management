
"use strict";

/* =========================================================
   1. CONFIGURATION
========================================================= */

const API_BASE_URL = "http://localhost:5000/api";

const VERIFY_API_URL = `${API_BASE_URL}/certificates/verify`;


/* =========================================================
   2. START WHEN THE PAGE LOADS
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    verifyCertificateFromURL();
});


/* =========================================================
   3. READ THE CERTIFICATE ID AND VERIFY IT
========================================================= */

async function verifyCertificateFromURL() {
    const params = new URLSearchParams(window.location.search);

    // The student dashboard passes the ID using ?id=...
    // Also support ?certificateId=... for direct verification links.
    const certificateId =
        params.get("id") ||
        params.get("certificateId");

    const messageElement = getOrCreateElement(
        "verification-message",
        "p"
    );

    const resultContainer = getOrCreateElement(
        "verification-result",
        "section"
    );

    resultContainer.replaceChildren();

    if (!certificateId || !certificateId.trim()) {
        showMessage(
            messageElement,
            "Certificate ID is missing. Please open a valid certificate verification link.",
            "error"
        );

        renderVerificationStatus(
            resultContainer,
            "Certificate not verified",
            null,
            "No certificate ID was provided."
        );

        return;
    }

    showMessage(
        messageElement,
        "Verifying certificate. Please wait...",
        "info"
    );

    try {
        const response = await fetch(
            `${VERIFY_API_URL}/${encodeURIComponent(certificateId.trim())}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        const data = await response.json().catch(() => ({}));

        // A certificate is valid only when the backend confirms it.
        if (!response.ok || data.verified !== true) {
            showMessage(
                messageElement,
                data.message || "Certificate verification failed.",
                "error"
            );

            renderVerificationStatus(
                resultContainer,
                "Certificate not verified",
                null,
                data.message || "The certificate could not be verified."
            );

            return;
        }

        showMessage(
            messageElement,
            data.message || "Certificate verified successfully.",
            "success"
        );

        renderVerificationStatus(
            resultContainer,
            "Certificate is valid",
            data.certificate,
            ""
        );

    } catch (error) {
        console.error("Certificate verification error:", error);

        showMessage(
            messageElement,
            "Unable to connect to the server. Make sure the backend is running on port 5000 and try again.",
            "error"
        );

        renderVerificationStatus(
            resultContainer,
            "Verification unavailable",
            null,
            "The server could not be reached. Please try again later."
        );
    }
}


/* =========================================================
   4. FIND OR CREATE AN HTML ELEMENT
========================================================= */

function getOrCreateElement(id, tagName) {
    let element = document.getElementById(id);

    if (element) {
        return element;
    }

    element = document.createElement(tagName);
    element.id = id;

    const main =
        document.querySelector("main") ||
        document.querySelector(".main-content") ||
        document.body;

    main.appendChild(element);

    return element;
}


/* =========================================================
   5. DISPLAY A MESSAGE
========================================================= */

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `page-message ${type}`;
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
}


/* =========================================================
   6. DISPLAY VERIFICATION RESULT
========================================================= */

function renderVerificationStatus(
    container,
    heading,
    certificate,
    errorMessage
) {
    container.replaceChildren();

    const card = document.createElement("article");
    card.className = "data-item";

    const title = document.createElement("h2");
    title.textContent = heading;
    card.appendChild(title);

    if (!certificate) {
        const message = document.createElement("p");
        message.textContent =
            errorMessage || "Certificate details are unavailable.";

        card.appendChild(message);
        container.appendChild(card);

        return;
    }

    addDetail(
        card,
        "Certificate ID",
        certificate.certificateId
    );

    addDetail(
        card,
        "Student Name",
        certificate.studentName
    );

    addDetail(
        card,
        "Event Name",
        certificate.eventTitle
    );

    addDetail(
        card,
        "Event Date",
        formatDate(certificate.eventDate)
    );

    addDetail(
        card,
        "Venue",
        certificate.venue
    );

    addDetail(
        card,
        "Issue Date",
        formatDate(certificate.issuedAt)
    );

    container.appendChild(card);
}


/* =========================================================
   7. ADD A CERTIFICATE DETAIL
========================================================= */

function addDetail(container, label, value) {
    const paragraph = document.createElement("p");

    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;

    const span = document.createElement("span");

    span.textContent =
        value !== undefined &&
        value !== null &&
        value !== ""
            ? String(value)
            : "Not available";

    paragraph.appendChild(strong);
    paragraph.appendChild(span);

    container.appendChild(paragraph);
}


/* =========================================================
   8. FORMAT DATES
========================================================= */

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
