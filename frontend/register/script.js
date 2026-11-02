
const API_BASE_URL = "http://localhost:5000/api";

const form = document.getElementById("register-form");
const messageElement = document.getElementById("register-message");
const submitButton = document.getElementById("register-button");

document.getElementById("current-year").textContent =
    new Date().getFullYear();

function showMessage(message, type = "info") {
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.hidden = false;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    messageElement.hidden = true;

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirm-password").value;

    if (!name || !email || !password || !confirmPassword) {
        showMessage("Please complete every field.", "error");
        return;
    }

    if (password.length < 8) {
        showMessage(
            "Your password must contain at least 8 characters.",
            "error"
        );
        return;
    }

    if (password !== confirmPassword) {
        showMessage("The passwords do not match.", "error");
        return;
    }

    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Creating account...";

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        const responseText = await response.text();
        let data = {};

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            throw new Error("The server returned an invalid response.");
        }

        if (!response.ok) {
            throw new Error(
                data.message || "Registration failed. Please try again."
            );
        }

        // Public registration must return a student account.
        if (data.user?.role !== "student") {
            throw new Error(
                "Unexpected account role returned by the server. Contact support."
            );
        }

        showMessage(
            "Your student account was created. You can now sign in.",
            "success"
        );

        form.reset();

        // Redirect only after the user has seen the success message.
        window.setTimeout(() => {
            window.location.href = "../login/index.html";
        }, 1500);
    } catch (error) {
        showMessage(
            error.message ||
                "Unable to connect to CampusConnect. Check your backend server.",
            "error"
        );
    } finally {
        submitButton.disabled = false;
        submitButton.querySelector("span").textContent =
            "Create student account";
    }
});
