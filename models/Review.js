const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  ConsumerID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ProviderID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  Rating: { type: Number, required: true, min: 1, max: 5 },
  Comment: { type: String },
  Timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Review", reviewSchema);