const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/user");

router.get('/:firebaseUID', async (req, res) => {
  try {
    const { firebaseUID } = req.params;
    const user = await User.findOne({ FirebaseUID: firebaseUID });

    if (!user) return res.status(404).json({ message: "User not found" });

    const notifications = await Notification.find({ UserID: user._id }).sort({ Timestamp: -1 });
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;