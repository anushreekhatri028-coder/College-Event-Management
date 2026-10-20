
const API_BASE_URL = "http://localhost:5000/api/certificates";

const form = document.getElementById("verification-form");
const certificateInput = document.getElementById("certificateId");
const verifyButton = document.getElementById("verify-button");
const statusMessage = document.getElementById("status-message");
const resultCard = document.getElementById("result-card");

function showStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = "status-message";

    if (type) {
        statusMessage.classList.add(type);
    }
}

function formatDate(value) {
    if (!value) {
        return "Not provided";
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

function setText(elementId, value) {
    document.getElementById(elementId).textContent =
        value == null || value === "" ? "Not provided" : String(value);
}

function displayCertificate(certificate) {
    setText("result-id", certificate.certificateId);
    setText("result-student", certificate.studentName);
    setText("result-event", certificate.eventTitle);
    setText("result-event-date", formatDate(certificate.eventDate));
    setText("result-venue", certificate.venue);
    setText("result-issued-date", formatDate(certificate.issuedAt));

    resultCard.hidden = false;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const certificateId = certificateInput.value.trim();

    // Basic frontend validation
    if (!certificateId) {
        resultCard.hidden = true;
        showStatus("Please enter a certificate ID.", "error");
        return;
    }

    // Reset the previous result
    resultCard.hidden = true;
    showStatus("Checking certificate...");
    verifyButton.disabled = true;
    verifyButton.textContent = "Verifying...";

    try {
        const encodedCertificateId = encodeURIComponent(certificateId);

        const response = await fetch(
            `${API_BASE_URL}/verify/${encodedCertificateId}`
        );

        const data = await response.json();

        if (!response.ok || data.verified !== true) {
            showStatus(
                data.message || "Certificate could not be verified.",
                "error"
            );
            return;
        }

        displayCertificate(data.certificate);
        showStatus(
            "Certificate verified successfully.",
            "success"
        );

    } catch (error) {
        console.error("Certificate verification failed:", error);

        showStatus(
            "Unable to connect to the server. Make sure your backend is running and the API URL is correct.",
            "error"
        );

    } finally {
        verifyButton.disabled = false;
        verifyButton.textContent = "Verify Certificate";
    }
});
