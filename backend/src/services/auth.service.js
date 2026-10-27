
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

function getAllowedEmailDomains() {
    const configuredDomains = process.env.COLLEGE_EMAIL_DOMAINS;

    if (!configuredDomains) {
        throw new Error(
            "College email domains are not configured on the server"
        );
    }

    const domains = configuredDomains
        .split(",")
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean);

    if (domains.length === 0) {
        throw new Error(
            "No valid college email domains are configured"
        );
    }

    return domains;
}

function normalizeAndValidateCollegeEmail(email) {
    if (typeof email !== "string") {
        throw new Error("A valid college email address is required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Basic email format validation.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
        throw new Error("Please enter a valid email address");
    }

    const emailDomain = normalizedEmail.split("@")[1];
    const allowedDomains = getAllowedEmailDomains();

    if (!allowedDomains.includes(emailDomain)) {
        throw new Error(
            "Please use your official college email address"
        );
    }

    return normalizedEmail;
}

const registerUser = async (name, email, password) => {
    if (typeof name !== "string" || !name.trim()) {
        throw new Error("Name is required");
    }

    if (typeof password !== "string" || password.length < 8) {
        throw new Error("Password must contain at least 8 characters");
    }

    const normalizedEmail = normalizeAndValidateCollegeEmail(email);

    const existingUser = await User.findOne({
        email: normalizedEmail
    });

    if (existingUser) {
        throw new Error("An account with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Never accept a role from the public registration request.
    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "student"
    });

    return user;
};

const loginUser = async (email, password) => {
    const normalizedEmail = normalizeAndValidateCollegeEmail(email);

    if (typeof password !== "string" || !password) {
        throw new Error("Invalid email or password");
    }

    const user = await User.findOne({
        email: normalizedEmail
    });

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordCorrect) {
        throw new Error("Invalid email or password");
    }

    if (!process.env.JWT_SECRET) {
        throw new Error("Authentication is not configured on the server");
    }

    const token = jwt.sign(
        {
            userId: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );

    return {
        user,
        token
    };
};

module.exports = {
    registerUser,
    loginUser
};
