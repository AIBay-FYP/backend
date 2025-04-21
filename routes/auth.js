const express = require("express");
const admin = require("../firebaseAdmin");
const mongoose = require("mongoose");
const User = require("../models/user");
const Category = require("../models/Category");
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

        // 🔹 Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log("✅ Decoded Firebase Token:", decodedToken);

        const { uid, phone_number } = decodedToken;

        // 🔹 Check if user exists in DB
        let user = await User.findOne({ Email: email });

        if (!user) {
            const newUserID = await getNextUserID(); // Function to get the next user ID
            console.log(`✅ Assigning UserID: ${newUserID} to new user`);

            user = new User({
                UserID: newUserID,
                FirebaseUID: uid,
                Name: name || "Unknown User",
                Email: email || "",
                Location: "city",
                ContactNumber: phone_number || "null",
                RoleType: "User",
                CreatedAt: new Date(),
            });

            await user.save();
            console.log("✅ New user saved successfully");
        } else {
            console.log(`🔹 User already exists, updating details for ${email}`);

            user.FirebaseUID = uid;
            user.Name = name || user.Name;
            user.ContactNumber = phone_number || user.ContactNumber;
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



router.patch("/updateUser/:firebaseUID", async (req, res) => {
    try {
        const { firebaseUID } = req.params;
        console.log(firebaseUID);
        const { role } = req.query;
        const { Name, Email, ContactNumber, Location, CNIC, BusinessType, Services, Interests, updateInterests } = req.body;
        console.log(ContactNumber);
        console.log(Interests);
        if (!role) {
            return res.status(400).json({ success: false, message: "Role is required as a query parameter." });
        }

        let user = await User.findOne({ FirebaseUID: firebaseUID });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Ensure role matches the existing user
        if (role) {
            user.RoleType = role;
        }

        // Allow basic user updates
        if (Name) user.Name = Name;
        if (Email) user.Email = Email;
        if (ContactNumber) user.ContactNumber = ContactNumber;
        if (Location) user.Location = Location;

        // Handle Interests update correctly
        if (Array.isArray(Interests)) {
            if (updateInterests === "overwrite") {
                user.Interests = Interests; // Overwrite entire Interests array
            } else if (updateInterests === "add") {
                user.Interests = [...new Set([...user.Interests, ...Interests])]; // Merge without duplicates
            } else if (updateInterests === "remove") {
                user.Interests = user.Interests.filter(interest => !Interests.includes(interest)); // Remove specified interests
            }
        }

        // Allow Provider-specific updates
        if (role === "Provider") {
            if (CNIC) user.CNIC = CNIC;
            if (BusinessType) user.BusinessType = BusinessType;
            if (Services) user.Services = Services;
        }

        user.UpdatedAt = new Date();
        await user.save();

        return res.status(200).json({ success: true, message: "User updated successfully", user });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});
module.exports = router;

router.patch("/consumer/:firebaseUID", async (req, res) => {
    try {
        const { firebaseUID } = req.params;
        const { Email, ContactNumber, Name, Interests } = req.body;

        const user = await User.findOne({ FirebaseUID: firebaseUID });
        if (!user || user.RoleType !== "User") {
            return res.status(404).json({ success: false, message: "Consumer not found." });
        }

        if (Email) user.Email = Email;
        if (ContactNumber) user.ContactNumber = ContactNumber;
        if (Name) user.Name = Name;

        if (Array.isArray(Interests)) {
            const validCategories = await Category.find({}).select("name -_id").lean();
            const validCategoryNames = validCategories.map(cat => cat.name);

            const validInterests = Interests.filter(interest => validCategoryNames.includes(interest));
            user.Interests = validInterests;
        }

        user.UpdatedAt = new Date();
        await user.save();

        return res.status(200).json({ success: true, message: "Consumer profile updated successfully", user });
    } catch (error) {
        console.error("Error updating consumer:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

router.patch("/provider/:firebaseUID", async (req, res) => {
    try {
        const { firebaseUID } = req.params;
        const { Email, ContactNumber, Name, BusinessType, Services } = req.body;

        const user = await User.findOne({ FirebaseUID: firebaseUID });
        if (!user || user.RoleType !== "Provider") {
            return res.status(404).json({ success: false, message: "Provider not found." });
        }

        if (Email) user.Email = Email;
        if (ContactNumber) user.ContactNumber = ContactNumber;
        if (Name) user.Name = Name;

        if (BusinessType) user.BusinessType = BusinessType;        

        if (Services && ["rent", "sale", "both"].includes(Services)) {
            user.Services = Services;
        }

        user.UpdatedAt = new Date();
        await user.save();

        return res.status(200).json({ success: true, message: "Provider profile updated successfully", user });
    } catch (error) {
        console.error("Error updating provider:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});
