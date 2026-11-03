
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

// ==========================================
// EMAIL CONFIGURATION
// ==========================================

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

// ==========================================
// EMAIL VALIDATION
// ==========================================

function normalizeAndValidateCollegeEmail(email) {
    if (typeof email !== "string") {
        throw new Error("Invalid email format");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
        throw new Error("Invalid email format");
    }

    const emailDomain = normalizedEmail.split("@")[1];

    const allowedDomains = getAllowedEmailDomains();

    if (!allowedDomains.includes(emailDomain)) {
        throw new Error(
            "Only college email addresses are allowed"
        );
    }

    return normalizedEmail;
}

// ==========================================
// JWT TOKEN GENERATION
// ==========================================

function generateToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error(
            "JWT_SECRET is not configured"
        );
    }

    return jwt.sign(
        {
            userId: user._id.toString(),
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );
}

// ==========================================
// PUBLIC STUDENT REGISTRATION
// ==========================================

const registerUser = async (name, email, password) => {

    if (typeof name !== "string" || !name.trim()) {
        throw new Error("Name is required");
    }

    if (
        typeof password !== "string" ||
        password.length < 8
    ) {
        throw new Error(
            "Password must be at least 8 characters long"
        );
    }

    const normalizedEmail =
        normalizeAndValidateCollegeEmail(email);

    const existingUser = await User.findOne({
        email: normalizedEmail
    });

    if (existingUser) {
        throw new Error(
            "An account with this email already exists"
        );
    }

    const hashedPassword = await bcrypt.hash(
        password,
        10
    );

    // Public registration ALWAYS creates a student.
    // Never accept a role from the frontend.

    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "student"
    });

    return user;
};

// ==========================================
// EMAIL AND PASSWORD LOGIN
// ==========================================

const loginUser = async (email, password) => {

    const normalizedEmail =
        normalizeAndValidateCollegeEmail(email);

    if (
        typeof password !== "string" ||
        !password
    ) {
        throw new Error("Invalid email or password");
    }

    const user = await User.findOne({
        email: normalizedEmail
    });

    if (!user) {
        throw new Error("Invalid email or password");
    }

    // Google-only accounts do not have passwords.
    if (!user.password) {
        throw new Error("Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordCorrect) {
        throw new Error("Invalid email or password");
    }

    const token = generateToken(user);

    return {
        user,
        token
    };
};

// ==========================================
// GOOGLE SIGN-IN
// ==========================================

const googleLoginUser = async (credential) => {

    if (!credential) {
        throw new Error(
            "Google credential is required"
        );
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error(
            "Google Client ID is not configured"
        );
    }

    if (!process.env.JWT_SECRET) {
        throw new Error(
            "JWT_SECRET is not configured"
        );
    }

    // STEP 1: Verify Google ID token.

    let ticket;

    try {
        ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
    } catch (error) {
        throw new Error("Invalid Google token");
    }

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

    // STEP 2: Check verified email.

    if (!email || email_verified !== true) {
        throw new Error(
            "Please use a verified Google account"
        );
    }

    // STEP 3: Validate college email domain.

    const normalizedEmail =
        normalizeAndValidateCollegeEmail(email);

    // STEP 4: Find account using Google ID.

    let user = await User.findOne({
        googleId
    });

    // STEP 5: If Google ID is not found,
    // check whether the email already has an account.

    if (!user) {

        user = await User.findOne({
            email: normalizedEmail
        });

        if (user) {

            // Prevent linking a different Google account.

            if (
                user.googleId &&
                user.googleId !== googleId
            ) {
                throw new Error(
                    "This account is linked to another Google account"
                );
            }

            // Link Google to the existing account.
            // Preserve its existing role.

            user.googleId = googleId;

            user.profilePicture =
                picture || user.profilePicture || "";

            await user.save();

        } else {

            // STEP 6: Create a new student account.
            // Google users cannot choose privileged roles.

            user = await User.create({
                name: name || normalizedEmail.split("@")[0],
                email: normalizedEmail,
                googleId,
                profilePicture: picture || "",
                role: "student"
            });
        }
    }

    // STEP 7: Generate CampusConnect JWT.

    const token = generateToken(user);

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

// ==========================================
// EXPORT SERVICES
// ==========================================

module.exports = {
    registerUser,
    loginUser,
    googleLoginUser
};
