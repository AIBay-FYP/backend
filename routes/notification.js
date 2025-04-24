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
    console.log(notifications);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


router.patch('/mark-as-read-batch', async (req, res) => {
  try {
    const { notificationIds } = req.body;

    // Validate that notificationIds is an array and contains valid IDs
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: "No valid notification IDs provided" });
    }

    // Mark all notifications as read using `updateMany`
    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { ReadStatus: true } } // Assuming your notifications have a "read" field
    );
    
    // Check if the update was successful
    if (result.nModified === 0) {
      return res.status(404).json({ message: "No notifications found to mark as read" });
    }

    res.status(200).json({ message: `${result.nModified} notifications marked as read` });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;