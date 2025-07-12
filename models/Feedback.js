const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema({
  FeedbackID: { type: String, required: true, unique: true },
  Title: { type: String, required: true },
  Description: { type: String, required: true },
  Date: { type: Date, default: Date.now },
  User: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  Status: { type: String, default: "Pending" },
}, {collection: "Feedbacks"});

module.exports = mongoose.model("Feedback", FeedbackSchema);