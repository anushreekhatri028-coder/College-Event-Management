// Day 40: Certificate Verification Page

const API_BASE_URL = "http://localhost:5000/api";

// IMPORTANT:
// This is the expected verification endpoint for this example.
// Change it to match your actual backend certificate route.
const VERIFY_CERTIFICATE_URL = (id) =>
    `${API_BASE_URL}/certificates/verify/${encodeURIComponent(id)}`;

function getToken() {
    return (
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken")
    );
}

function showMessage(message, type = "info") {
    const element = document.getElementById("verification-message");

    element.textContent = message;
    element.className = `message ${type}`;
    element.hidden = false;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value || "Not available";
    }
}

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function getCertificateObject(data) {
    if (!data || typeof data !== "object") {
        return {};
    }

    return data.certificate ||
        data.data?.certificate ||
        data.data ||
        data;
}

function showCertificateResult(certificate, valid) {
    const result = document.getElementById("certificate-result");
    const icon = document.getElementById("result-icon");

    result.hidden = false;

    icon.className = valid
        ? "result-icon"
        : "result-icon invalid";

    icon.textContent = valid ? "✓" : "✕";

    setText(
        "result-title",
        valid ? "Certificate Verified" : "Certificate Not Valid"
    );

    setText(
        "result-description",
        valid
            ? "The certificate was found and is marked as valid by the verification service."
            : "The certificate could not be confirmed as valid."
    );

    setText(
        "certificate-id",
        certificate.certificateId ||
        certificate._id ||
        certificate.id
    );

    setText(
        "recipient-name",
        certificate.student?.name ||
        certificate.studentName ||
        certificate.recipientName ||
        certificate.name
    );

    setText(
        "event-name",
        certificate.event?.title ||
        certificate.eventName ||
        certificate.title
    );

    setText(
        "issue-date",
        formatDate(
            certificate.issuedAt ||
            certificate.issueDate ||
            certificate.createdAt
        )
    );

    setText(
        "certificate-status",
        certificate.status || (valid ? "Valid" : "Invalid")
    );
}

async function verifyCertificate() {
    const params = new URLSearchParams(window.location.search);
    const certificateId = params.get("id");

    const result = document.getElementById("certificate-result");
    const retryButton = document.getElementById("retry-button");

    result.hidden = true;
    retryButton.hidden = true;

    if (!certificateId || !certificateId.trim()) {
        showMessage(
            "No certificate ID was provided. Open this page from a certificate link.",
            "error"
        );
        return;
    }

    showMessage("Checking certificate details...");

    try {
        const headers = {
            Accept: "application/json"
        };

        // If your verification route is public, the token is optional.
        // If it requires login, the stored token will be sent.
        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
            VERIFY_CERTIFICATE_URL(certificateId.trim()),
            { method: "GET", headers }
        );

        const responseText = await response.text();
        let data = {};

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                throw new Error("The server returned an invalid response.");
            }
        }

        if (response.status === 404) {
            showMessage(
                "No certificate was found for this ID.",
                "error"
            );
            retryButton.hidden = false;
            return;
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Verification failed (HTTP ${response.status}).`
            );
        }

        const certificate = getCertificateObject(data);

        // Never treat a successful HTTP response alone as proof
        // that the certificate is valid.
        const status = String(
            certificate.status || data.status || ""
        ).toLowerCase();

        const explicitlyValid =
            certificate.isValid === true ||
            data.isValid === true ||
            status === "valid" ||
            status === "verified";

        const explicitlyInvalid =
            certificate.isValid === false ||
            data.isValid === false ||
            ["invalid", "revoked", "cancelled", "rejected"].includes(status);

        if (explicitlyInvalid) {
            showCertificateResult(certificate, false);
            showMessage("The certificate is not valid.", "error");
            return;
        }

        if (!explicitlyValid) {
            showMessage(
                "The server returned certificate details, but did not provide a clear verification status. Check your backend response format.",
                "error"
            );
            retryButton.hidden = false;
            return;
        }

        showCertificateResult(certificate, true);
        showMessage("Certificate verification completed.", "success");
    } catch (error) {
        console.error("Certificate verification error:", error);

        showMessage(
            error.message ||
            "Unable to verify the certificate. Check that the backend is running.",
            "error"
        );

        retryButton.hidden = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const retryButton = document.getElementById("retry-button");

    retryButton.addEventListener("click", verifyCertificate);

    verifyCertificate();
});