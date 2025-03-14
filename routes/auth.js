const express = require("express");
const admin = require("../firebaseAdmin");
const User = require("../models/user");
const router = express.Router();


router.post("/verifyUser", async (req, res) => {
    try {
        const { token, name, email } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is required.",
            });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log(decodedToken); 

        const { uid, phone_number } = decodedToken;

        let user = await User.findById(uid);

        if (!user) {
            if (!name || !email) {
                return res.status(400).json({
                    success: false,
                    message: "Name and email are required for new users.",
                });
            }

            user = new User({
                _id: uid,
                UserID: 'U009',
                Name:name,
                Email: email,
                ContactNumber: phone_number || null,
                RoleType: "Consumer", 
                createdAt: new Date(),
            });

            await user.save();
        }
        res.json({ success: true, user });

    } catch (error) {
        console.error("Error verifying user:", error);

        if (error.code === 'auth/argument-error') {
            return res.status(400).json({
                success: false,
                message: "Invalid Firebase token.",
            });
        }

        // Handle other potential errors
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;
