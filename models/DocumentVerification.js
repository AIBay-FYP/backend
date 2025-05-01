const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VerificationSchema = new Schema({
  DocumentID: {
    type: String,
    required: true,
  },
  File: {
    type: String,
    required: true,
  },
  VerifiedBy: {
    type: Schema.Types.ObjectId,
    required: false,
    default: null,
  },
  Timestamp: {
    type: Date,
    required: true,
  },
  VerificationStatus: {
    type: String,
    required: true,
  },
  ServiceID: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Listings',
    required: true,
  },
  UserID: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

module.exports = mongoose.model('Verification', VerificationSchema);