const express = require("express");
const admin = require("firebase-admin");
const User = require("../models/user"); // Import User model
const router = express.Router();

router.post("/verifyUser", async (req, res) => {
    try {
        const { token, name, email } = req.body; // Receiving Firebase token & optional user details
        const decodedToken = await admin.auth().verifyIdToken(token);

        const { uid, phone_number } = decodedToken; // Firebase phone auth provides phone_number but no name/email

        let user = await User.findById(uid); // Check if user already exists

        if (!user) {
            // If user doesn't exist, ensure name & email are provided
            if (!name || !email) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Name and email are required for new users."
                });
            }

            // Create a new user
            user = new User({
                _id: uid, 
                name,
                email,
                phoneNumber: phone_number || null,
                roleType: "User", // Default role
                createdAt: new Date()
            });

            await user.save();
        }

        res.json({ success: true, user });

    } catch (error) {
        console.error("Error verifying user:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
