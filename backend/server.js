const express = require('express');
const mysql = require('mysql2/promise'); // We use /promise so we can use async/await
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();// Loads the variables from your .env file


const app = express();

// --- 1. MIDDLEWARE (The Security Guards) ---
app.use(cors()); // Allows your future React frontend to talk to this backend
app.use(express.json()); // Allows the server to understand JSON data

// --- 2. DATABASE CONNECTION (The Bridge) ---
// We create a "pool" of connections so multiple users can request data at once
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// --- 3. OUR FIRST API ROUTE (The Waiter) ---
// When someone visits http://localhost:5000/api/status, run this code
app.get('/api/status', async (req, res) => {
    try {
        // Send a simple ping to MySQL to see if it responds
        const [rows] = await db.query('SELECT "Database is successfully connected!" AS message');
        
        // If successful, send this JSON back to the user
        res.json({
            server: "Express is running!",
            database: rows[0].message
        });
    } catch (error) {
        // If the password is wrong or MySQL is off, send an error
        res.status(500).json({ error: "Database connection failed", details: error.message });
    }
});

// --- TASK 4: SECURITY MIDDLEWARE (The General Bouncer) ---
const authenticateToken = (req, res, next) => {
    // 1. Look for the "Authorization" header in the incoming request
    const authHeader = req.headers['authorization'];
    
    // 2. The token is sent as "Bearer eyJhbG...". We split it to get just the token part.
    const token = authHeader && authHeader.split(' ')[1]; 

    // 3. If they didn't bring a badge, kick them out
    if (!token) return res.status(401).json({ error: "Access denied. No ID badge provided." });

    // 4. Verify the token using your secret key from the .env file
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired ID badge." });
        
        // 5. If valid, attach their decoded data (ID and Role) to the request!
        req.user = user; 
        
        // 6. 'next()' tells Express: "They are clear, send them to the actual route."
        next(); 
    });
};
// --- TASK 4: VIP MIDDLEWARE (The Admin Bouncer) ---
const verifyAdmin = (req, res, next) => {
    // We can confidently check req.user because the first bouncer already verified the token
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    
    // If they are an admin, open the door
    next(); 
};

// --- PROTECTED ROUTE: Update Profile Name ---
// Only logged-in users (Citizens or Admins) can access this
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    const { full_name } = req.body;
    
    if (!full_name) {
        return res.status(400).json({ error: "Please provide a new name." });
    }

    try {
        // We update the specific user based on the ID securely extracted from their token
        await db.query('UPDATE users SET full_name = ? WHERE id = ?', [full_name, req.user.id]);
        
        res.json({ message: "Profile updated successfully!", new_name: full_name });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});
// --- ADMIN ONLY ROUTE: Add a New Community Hall ---
app.post('/api/halls', authenticateToken, verifyAdmin, async (req, res) => {
    const { name, capacity, price_per_day, amenities, is_active } = req.body;

    if (!name || !capacity || !price_per_day) {
        return res.status(400).json({ error: "Name, capacity, and price are required." });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO halls (name, capacity, price_per_day, amenities, is_active) VALUES (?, ?, ?, ?, ?)',
            [name, capacity, price_per_day, JSON.stringify(amenities || []), is_active !== false]
        );

        res.status(201).json({ message: "Hall successfully added!", hall_id: result.insertId });
    } catch (error) {
        console.error("Error adding hall:", error);
        res.status(500).json({ error: "Failed to add hall." });
    }
});
// --- ADMIN ONLY: Update Existing Hall Details ---
app.put('/api/halls/:id', authenticateToken, verifyAdmin, async (req, res) => {
    const hallId = req.params.id;
    const { name, capacity, price_per_day, amenities, is_active } = req.body;

    // We require the core fields to prevent accidental blank data
    if (!name || !capacity || !price_per_day) {
        return res.status(400).json({ error: "Name, capacity, and price cannot be empty." });
    }

    try {
        const [result] = await db.query(
            'UPDATE halls SET name = ?, capacity = ?, price_per_day = ?, amenities = ?, is_active = ? WHERE id = ?',
            [name, capacity, price_per_day, JSON.stringify(amenities || []), is_active !== false, hallId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Hall not found." });
        }

        res.json({ message: "Hall details successfully updated!" });
    } catch (error) {
        console.error("Error updating hall:", error);
        res.status(500).json({ error: "Failed to update hall details." });
    }
});

// --- GET ALL HALLS (Facility Catalog API) ---
app.get('/api/halls', async (req, res) => {
    try {
        // Query the database for all active halls
        const [halls] = await db.query('SELECT * FROM halls WHERE is_active = TRUE');
        
        // Send the data back to Postman/React as a JSON array
        res.json(halls);
    } catch (error) {
        console.error("Error fetching halls:", error);
        res.status(500).json({ error: "Failed to fetch halls from the database" });
    }
});

// Import your new email service at the top of server.js (under the other requires)
const { sendOTPEmail } = require('./utils/emailService');

// --- TEST ROUTE: Send a test email ---
app.post('/api/test-email', async (req, res) => {
    // We are passing a fake OTP just to test the email delivery
    const emailSent = await sendOTPEmail(process.env.EMAIL_USER, "123456");
    
    if (emailSent) {
        res.json({ message: "Test email sent successfully! Check your inbox." });
    } else {
        res.status(500).json({ error: "Failed to send email. Check terminal for errors." });
    }
});

// --- 1. REQUEST OTP (Login Step 1) ---
app.post('/api/auth/request-otp', async (req, res) => {
    // Extract the email the user typed into the frontend
    const { email } = req.body;
    
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // 1. Generate a random 6-digit OTP (e.g., 482910)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Calculate expiration time (10 minutes from right now)
    // MySQL requires dates in 'YYYY-MM-DD HH:MM:SS' format
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
        .toISOString().slice(0, 19).replace('T', ' ');

    try {
        // 3. Delete any old/expired OTPs for this user so they don't pile up
        await db.query('DELETE FROM otps WHERE email = ?', [email]);
        
        // 4. Save the fresh OTP to the database
        await db.query(
            'INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))', 
            [email, otpCode]
        );

        // 5. Send the email using the courier we built in Task 1
        const emailSent = await sendOTPEmail(email, otpCode);

        if (emailSent) {
            res.json({ message: `Secure OTP sent to ${email}` });
        } else {
            res.status(500).json({ error: "Failed to send email courier" });
        }
    } catch (error) {
        console.error("Database error during OTP generation:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// --- 2. VERIFY OTP (Login Step 2) ---
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        // 1. Look for the exact email and OTP match in the database
        const [rows] = await db.query('SELECT * FROM otps WHERE email = ? AND otp = ?', [email, otp]);

        // If no match is found, the OTP is wrong
        if (rows.length === 0) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        const otpRecord = rows[0];
        const currentTime = new Date();

        // 2. Check if the 10-minute window has passed
        if (new Date(otpRecord.expires_at) < currentTime) {
            return res.status(400).json({ error: "OTP has expired. Please request a new one." });
        }

        // 3. OTP is valid! Delete it immediately so it can never be used again
        await db.query('DELETE FROM otps WHERE email = ?', [email]);

        // 4. Check if this citizen already exists in our main users table
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        let user = users[0];

        // 5. If they are brand new, create an account for them automatically
        if (!user) {
            const [result] = await db.query(
                'INSERT INTO users (email, full_name, role) VALUES (?, ?, ?)', 
                [email, 'New Citizen', 'CITIZEN']
            );
            // Construct the user object we just created
            user = { id: result.insertId, email: email, full_name: 'New Citizen', role: 'CITIZEN' };
        }

        // 6. If they are brand new, create an account
        if (!user) {
            const [result] = await db.query(
                'INSERT INTO users (email, full_name, role) VALUES (?, ?, ?)', 
                [email, 'New Citizen', 'CITIZEN']
            );
            user = { id: result.insertId, email: email, full_name: 'New Citizen', role: 'CITIZEN' };
        }

        // --- TASK 3: Generate the JWT ID Badge ---
        // We pack their ID and Role into the token. It expires in 7 days.
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        // 7. Send the token back to the frontend along with the user data
        res.json({ 
            message: "Login successful!", 
            token: token, // <-- The ID badge is now included!
            user: user 
        });

    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// --- 4. START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});