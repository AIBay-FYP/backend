const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema({
  FeedbackID: String,
  Title: String,
  Description: String,
  Date: Date,
  User: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  Status: { type: String, default: "Pending" }
});

module.exports = mongoose.model("Feedback", FeedbackSchema);