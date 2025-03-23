const express = require("express");
const admin = require("../firebaseAdmin");
const mongoose = require("mongoose");
const User = require("../models/user");
const router = express.Router();

/**
 * Function to generate the next sequential UserID in the format U001, U002, etc.
 */
const getNextUserID = async () => {
    try {
        const lastUser = await User.findOne().sort({ UserID: -1 }).lean(); // Sort by UserID to get last assigned one
        
        if (lastUser && lastUser.UserID) {
            const lastNumber = parseInt(lastUser.UserID.substring(1)); // Extract number from U001
            let nextNumber = lastNumber + 1;

            // Ensure uniqueness
            while (await User.findOne({ UserID: `U${String(nextNumber).padStart(3, "0")}` })) {
                nextNumber++; // Increment if exists
            }

            const nextUserID = `U${String(nextNumber).padStart(3, "0")}`;
            console.log(`✅ Generated new UserID: ${nextUserID}`);
            return nextUserID;
        }
        
        console.log(`✅ No existing users found, starting from U001`);
        return "U001"; // Start from U001 if no users exist
    } catch (error) {
        console.error("❌ Error generating UserID:", error);
        throw new Error("Failed to generate UserID");
    }
};


router.post("/verifyUser", async (req, res) => {
    try {
        const { token, name, email } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: "Token is required." });
        }

        // 🔹 Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log("✅ Decoded Firebase Token:", decodedToken);

        const { uid, phone_number } = decodedToken;

        // 🔹 Check if user already exists
        let user = await User.findOne({ Email: email });

        if (!user) {
            const newUserID = await getNextUserID(); // Ensure we get a valid UserID
            // const newUserID = "U009"; // Ensure we get a valid UserID
            console.log(`✅ Assigning UserID: ${newUserID} to new user`);

            user = new User({
                UserID: newUserID,
                FirebaseUID: uid,
                Name: name,
                Email: email,
                Location: "city",
                ContactNumber: phone_number || null,
                RoleType: "User", // Default role
                CreatedAt: new Date(),
            });

            await user.save(); // Save new user
            console.log("✅ New user saved successfully");
        } else {
            console.log(`🔹 User already exists, updating details for ${email}`);

            user.FirebaseUID = uid;
            user.Name = name;
            user.ContactNumber = phone_number || null;
            user.UpdatedAt = new Date();
            await user.save();
            console.log("✅ Existing user updated successfully");
        }

        return res.status(200).json({ success: true, message: "User verified successfully.", user });

    } catch (error) {
        console.error("❌ Error verifying user:", error);

        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Email is already in use." });
        }

        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
