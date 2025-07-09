const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema({
  DisputeID: { type: String, unique: true },
  BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  Title: { type: String, required: true },
  Description: { type: String, required: true },
  Date: { type: Date, default: Date.now },
  CreatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  Status: { type: String, enum: ["Pending", "Resolved", "Rejected"], default: "Pending" },
  ResolutionAction: { type: String },
  Evidence: [String], // Array of image URLs
  Comment: { type: String, default: "" }
},{
  collection: "Dispute",
});

module.exports = mongoose.model("Dispute", disputeSchema);
