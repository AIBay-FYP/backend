const mongoose = require('mongoose');

const complianceLogSchema = new mongoose.Schema({
  LogID: { type: String, required: true, unique: true },
  ViolationType: { type: String, required: true },
  ListingID: { type: mongoose.Schema.Types.ObjectId, ref: 'Listings', required: true },
  LastReviewed: { type: Date, required: true },
  NotificationID: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true },
  Status: {
    type: String,
    enum: ['Flagged', 'Under Review', 'Approved', 'Rejected'],
    default: 'Flagged',
  },
}, {
  collection: 'ComplianceLog',
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Index for efficient querying
complianceLogSchema.index({ ListingID: 1 });
complianceLogSchema.index({ Status: 1 });

module.exports = mongoose.model('ComplianceLog', complianceLogSchema);