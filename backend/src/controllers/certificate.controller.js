
const crypto = require("crypto");
const PDFDocument = require("pdfkit");

const Certificate = require("../models/certificate.model");
const Event = require("../models/event.model");
const Attendance = require("../models/attendance.model");
const User = require("../models/user.model");

// Generate a PDF certificate for the logged-in student
const generateCertificate = async (req, res) => {
    try {
        const { eventId } = req.params;
        const studentId = req.user.userId;

        // 1. Check whether the event exists
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        // 2. Only approved, completed events qualify
        if (event.approvalStatus !== "approved") {
            return res.status(400).json({
                message: "Certificates are available only for approved events"
            });
        }

        if (event.status !== "completed") {
            return res.status(400).json({
                message: "Certificates are available only after event completion"
            });
        }

        // 3. Verify that the student actually attended
        const attendance = await Attendance.findOne({
            student: studentId,
            event: eventId,
            status: "present"
        });

        if (!attendance) {
            return res.status(403).json({
                message: "You must attend the event to receive a certificate"
            });
        }

        // 4. Get the student's name
        const student = await User.findById(studentId).select("name");

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        // 5. Reuse the certificate record if one already exists
        let certificate = await Certificate.findOne({
            student: studentId,
            event: eventId
        });

        if (!certificate) {
            try {
                certificate = await Certificate.create({
                    student: studentId,
                    event: eventId,
                    certificateId: `CERT-${crypto.randomUUID()}`
                });
            } catch (error) {
                // Handles simultaneous requests for the same certificate
                if (error.code !== 11000) {
                    throw error;
                }

                certificate = await Certificate.findOne({
                    student: studentId,
                    event: eventId
                });

                if (!certificate) {
                    throw error;
                }
            }
        }

        // 6. Create the PDF
        const doc = new PDFDocument({
            size: "A4",
            layout: "landscape",
            margin: 50
        });

        // Set response headers before streaming the PDF
        const safeCertificateId = certificate.certificateId.replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
        );

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeCertificateId}.pdf"`
        );

        doc.on("error", (error) => {
            console.error("Certificate PDF error:", error);

            if (!res.headersSent) {
                res.status(500).json({
                    message: "Could not generate certificate PDF"
                });
            } else {
                res.destroy(error);
            }
        });

        doc.pipe(res);

        // Certificate border
        doc.lineWidth(4)
            .rect(25, 25, 792, 545)
            .stroke("#243B64");

        doc.lineWidth(1)
            .rect(35, 35, 772, 525)
            .stroke("#C5A253");

        // Certificate heading
        doc.fillColor("#243B64")
            .font("Helvetica-Bold")
            .fontSize(30)
            .text("CERTIFICATE OF PARTICIPATION", 50, 100, {
                align: "center",
                width: 692
            });

        doc.fillColor("#555555")
            .font("Helvetica")
            .fontSize(16)
            .text("This certificate is proudly presented to", 50, 175, {
                align: "center",
                width: 692
            });

        // Student name
        doc.fillColor("#111111")
            .font("Helvetica-Bold")
            .fontSize(28)
            .text(student.name || "Student", 50, 220, {
                align: "center",
                width: 692
            });

        // Event title
        doc.fillColor("#555555")
            .font("Helvetica")
            .fontSize(16)
            .text("for successfully participating in", 50, 280, {
                align: "center",
                width: 692
            });

        doc.fillColor("#243B64")
            .font("Helvetica-Bold")
            .fontSize(23)
            .text(event.title, 70, 320, {
                align: "center",
                width: 652
            });

        // Certificate reference
        doc.fillColor("#555555")
            .font("Helvetica")
            .fontSize(11)
            .text(
                `Certificate ID: ${certificate.certificateId}`,
                50,
                400,
                {
                    align: "center",
                    width: 692
                }
            );

        doc.text(
            `Issued on: ${new Date(certificate.issuedAt).toLocaleDateString("en-IN")}`,
            50,
            420,
            {
                align: "center",
                width: 692
            }
        );

        doc.end();

    } catch (error) {
        console.error("Generate certificate error:", error);

        if (!res.headersSent) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: "A certificate already exists for this student and event"
                });
            }

            return res.status(500).json({
                message: "Server error while generating certificate"
            });
        }

        res.destroy(error);
    }
};


// Get certificates belonging to the logged-in student
const getMyCertificates = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const certificates = await Certificate.find({
            student: studentId
        })
            .populate("event", "title date venue category status")
            .sort({ issuedAt: -1 });

        return res.status(200).json({
            count: certificates.length,
            certificates
        });

    } catch (error) {
        console.error("Get certificates error:", error);

        return res.status(500).json({
            message: "Server error while fetching certificates"
        });
    }
};


module.exports = {
    generateCertificate,
    getMyCertificates
};
