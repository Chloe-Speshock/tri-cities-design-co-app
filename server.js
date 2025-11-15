// Load environment variables from .env file (for local development)
require("dotenv").config();

const express = require("express");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure AWS S3 client
const s3Client = new S3Client({
  region: "us-east-1",
});

// Serve static files with no caching for development
app.use(express.static("src", {
  setHeaders: (res, path) => {
    // Disable caching for HTML, CSS, and JS files
    if (path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Endpoint to serve any image from S3
app.get("/api/image/*", async (req, res) => {
  try {
    // Get the full path after /api/image/
    const key = req.params[0];
    console.log(`Fetching image: ${key}`);

    const command = new GetObjectCommand({
      Bucket: "tri-cities-design-co-assets-bucket-449655118647",
      Key: key,
    });

    const response = await s3Client.send(command);
    console.log(`Successfully fetched ${key}, size: ${response.ContentLength}`);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Set appropriate headers
    res.set({
      "Content-Type": response.ContentType,
      "Content-Length": response.ContentLength,
      "Cache-Control": "no-cache, no-store, must-revalidate", // Disable caching for debugging
    });

    res.send(buffer);
  } catch (error) {
    console.error("Error fetching image from S3:", error);
    res.status(404).send("Image not found");
  }
});

// Configure email transporter
// You can configure this to use AWS SES SMTP, Gmail, or any SMTP server
// For AWS SES SMTP, use the SMTP settings from your AWS SES console
const createTransporter = () => {
  // Option 1: SMTP (works with AWS SES SMTP, Gmail, or any SMTP server)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Option 2: Gmail (for development/testing)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Fallback: Log warning (won't send real emails)
  console.warn("No email configuration found. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.");
  console.warn("For AWS SES, use the SMTP endpoint from your AWS SES console.");
  return null;
};

// Contact form endpoint
app.post("/api/contact", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      "project-type": projectType,
      budget,
      timeline,
      message,
    } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Please fill in all required fields (name, email, and message).",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address.",
      });
    }

    // Create email content
    const recipientEmail = process.env.CONTACT_EMAIL || "megan@tricitiesdesignco.com";
    const emailSubject = `New Contact Form Submission from ${name}`;

    const emailHtml = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
      ${projectType ? `<p><strong>Project Type:</strong> ${projectType}</p>` : ""}
      ${budget ? `<p><strong>Budget Range:</strong> ${budget}</p>` : ""}
      ${timeline ? `<p><strong>Timeline:</strong> ${timeline}</p>` : ""}
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `;

    const emailText = `
New Contact Form Submission

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ""}
${projectType ? `Project Type: ${projectType}` : ""}
${budget ? `Budget Range: ${budget}` : ""}
${timeline ? `Timeline: ${timeline}` : ""}

Message:
${message}
    `;

    // Send email
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error("Email transporter not configured. Please set up email environment variables.");
      return res.status(500).json({
        success: false,
        error: "Email service is not configured. Please contact us directly.",
      });
    }

    const mailOptions = {
      from: process.env.FROM_EMAIL || `"Tri Cities Design Co." <noreply@tricitiesdesignco.com>`,
      to: recipientEmail,
      replyTo: email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);

    // Send confirmation email to the user (optional)
    if (process.env.SEND_CONFIRMATION === "true") {
      const confirmationMailOptions = {
        from: process.env.FROM_EMAIL || `"Tri Cities Design Co." <noreply@tricitiesdesignco.com>`,
        to: email,
        subject: "Thank you for contacting Tri Cities Design Co.",
        text: `Dear ${name},\n\nThank you for reaching out to Tri Cities Design Co. We have received your message and will get back to you soon.\n\nBest regards,\nTri Cities Design Co.`,
        html: `
          <h2>Thank you for contacting Tri Cities Design Co.</h2>
          <p>Dear ${name},</p>
          <p>Thank you for reaching out to Tri Cities Design Co. We have received your message and will get back to you soon.</p>
          <p>Best regards,<br>Tri Cities Design Co.</p>
        `,
      };

      try {
        await transporter.sendMail(confirmationMailOptions);
      } catch (confirmationError) {
        console.error("Error sending confirmation email:", confirmationError);
        // Don't fail the request if confirmation email fails
      }
    }

    res.json({
      success: true,
      message: "Thank you for your message! We'll get back to you soon.",
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    res.status(500).json({
      success: false,
      error: "Sorry, there was an error sending your message. Please try again later or contact us directly.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
