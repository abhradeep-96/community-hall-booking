const express = require('express');
const mysql = require('mysql2/promise'); // We use /promise so we can use async/await
const cors = require('cors');
require('dotenv').config(); // Loads the variables from your .env file

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

// --- 4. START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});