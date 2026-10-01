const nodemailer = require('nodemailer');
require('dotenv').config();

// Create the "Courier" that knows how to log into your Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// A reusable function to send emails
const sendOTPEmail = async (recipientEmail, otpCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'Your Login OTP - Community Hall Booking',
        html: `
            <h2>Welcome to the Community Hall System</h2>
            <p>Your one-time password (OTP) is: <strong>${otpCode}</strong></p>
            <p>This code is valid for 10 minutes. Do not share it with anyone.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email successfully sent to ${recipientEmail}`);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};

module.exports = { sendOTPEmail };