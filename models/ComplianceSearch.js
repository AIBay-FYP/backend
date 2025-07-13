const mongoose = require('mongoose');

const complianceSearchSchema = new mongoose.Schema({
  SearchID: { type: String, required: true, unique: true },
  consumerFirebaseUID: { type: String, required: true },
  searchQuery: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  violationType: { type: String, enum: ['High risk behavior', 'Excessive search frequency', 'Out of scope', 'Restricted keywords'] },
  NotificationID: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification' },
  blockedUntil: { type: Date },
  Status: { type: String, enum: ['Block temporarily', 'Block permanently', 'Notify Users'], default: 'Notify Users' }
}, { collection: 'ComplianceSearches' });

module.exports = mongoose.model('ComplianceSearch', complianceSearchSchema);