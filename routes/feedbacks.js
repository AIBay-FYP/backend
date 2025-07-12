const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Feedback = require("../models/Feedback"); 
const User = require("../models/user");
const Notification = require("../models/Notification");

// Generate FeedbackID
const generateFeedbackID = async () => {
  const count = await Feedback.countDocuments();
  return `F${(count + 1).toString().padStart(3, "0")}`;
};

// Generate NotificationID
const generateNotificationID = async () => {
  const count = await Notification.countDocuments();
  return `N${(count + 1).toString().padStart(3, "0")}`;
};

// POST --> create new feedback
router.post("/", async (req, res) => {
  try {
    const { Title, Description, UserFirebaseUID } = req.body;

    const user = await User.findOne({ FirebaseUID: UserFirebaseUID });
    if (!user) return res.status(404).json({ error: "User not found" });

    const FeedbackID = await generateFeedbackID();
    const feedback = new Feedback({
      FeedbackID,
      Title: Title,
      Description: Description,
      Date: new Date(),
      User: user._id,
      Status: "Pending"
    });

    await feedback.save();

    console.log("Feedback saved:", feedback);

    // create notification for user that feedback is received
    const NotificationID = await generateNotificationID();
    const notification = new Notification({
      NotificationID,
      UserID: user._id,
      Message: `Your feedback "${Title}" was submitted successfully!`,
      Type: "Info",
      ReadStatus: false
    });
    await notification.save();

    res.status(201).json({ message: "Feedback submitted", feedback });
  } catch (error) {
    console.error("Error adding feedback:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /feedbacks --> get all feedbacks
// router.get("/", async (req, res) => {
//   try {
//     const feedbacks = await Feedback.find({}).sort({ Date: -1 });
//     res.json(feedbacks);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// PUT /feedbacks/:id → update status
router.put('/:id', async (req, res) => {
  try {
    const feedbackID = req.params.id;
    const { Status } = req.body;

    if (!Status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const updatedFeedback = await Feedback.findOneAndUpdate(
      { FeedbackID: feedbackID },
      { $set: { Status } },
      { new: true }
    ).populate('User'); 

    if (!updatedFeedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    // create notification for status update
    const NotificationID = await generateNotificationID();
    const notification = new Notification({
      NotificationID,
      UserID: updatedFeedback.User._id,
      Message: `The status of your feedback "${updatedFeedback.Title}" has been updated to: ${Status}`,
      Type: "Info",
      ReadStatus: false
    });
    await notification.save();

    res.json({ success: true, feedback: updatedFeedback });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;