const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// Google Sign-In
const googleLoginUser = async (credential) => {
    if (!credential) {
        throw new Error("Google credential is required");
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error("Google Client ID is not configured");
    }

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    // 1. Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload) {
        throw new Error("Invalid Google token");
    }

    const {
        sub: googleId,
        email,
        email_verified,
        name,
        picture
    } = payload;

    // 2. Check verified email
    if (!email || email_verified !== true) {
        throw new Error("Please use a verified Google account");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Restrict sign-in to college email domains
    const allowedDomains = (process.env.COLLEGE_EMAIL_DOMAINS || "")
        .split(",")
        .map(domain => domain.trim().toLowerCase())
        .filter(Boolean);

    const emailDomain = normalizedEmail.split("@")[1];

    if (!allowedDomains.includes(emailDomain)) {
        throw new Error("Please use your college Google account");
    }

    // 4. Find user by Google ID first
    let user = await User.findOne({ googleId });

    // 5. If not found, check whether this email already exists
    if (!user) {
        user = await User.findOne({ email: normalizedEmail });

        if (user) {
            // Do not link an email already connected to another Google ID
            if (user.googleId && user.googleId !== googleId) {
                throw new Error("This account is linked to another Google account");
            }

            // Link Google account to existing user.
            // Keep the existing role unchanged.
            user.googleId = googleId;
            user.profilePicture = picture || user.profilePicture || "";

            await user.save();
        } else {
            // 6. Create a new student account
            user = await User.create({
                name: name || normalizedEmail.split("@")[0],
                email: normalizedEmail,
                googleId,
                profilePicture: picture || "",
                role: "student"
            });
        }
    }

    // 7. Generate the existing CampusConnect JWT format
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
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture || ""
        }
    };
};

module.exports = {
    registerUser,
    loginUser,
    googleLoginUser
};
