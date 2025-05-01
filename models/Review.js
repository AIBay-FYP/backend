const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  ReviewID: { type: String, required: true, unique: true },
  BookingID: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  ReviewerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  Rating: { type: Number, required: true, min: 1, max: 5 },
  Comment: { type: String },
  Timestamp: { type: Date, required: true },
}, {
  collection: 'Review',
  timestamps: false, // No automatic createdAt/updatedAt, as Timestamp is explicit
});

// Index for efficient querying
reviewSchema.index({ BookingID: 1 });
reviewSchema.index({ ReviewerID: 1 });

module.exports = mongoose.model('Review', reviewSchema);