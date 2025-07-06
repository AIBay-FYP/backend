const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  ReviewID: { type: String, required: true },
  BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  ReviewerID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ReviewedUserID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  Rating: { type: Number, required: true, min: 1, max: 5 },
  Comment: { type: String, required: true },
  Timestamp: { type: Date, default: Date.now },
}, {
  collection: "Review",});


// Index for efficient querying
reviewSchema.index({ BookingID: 1 });
reviewSchema.index({ ReviewerID: 1 });

module.exports = mongoose.model('Review', reviewSchema);