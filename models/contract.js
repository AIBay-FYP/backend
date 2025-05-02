const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
    ContractID: { type: String, unique: true, required: true },
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    Terms: { type: String, required: true },
    DocumentURL: { type: String, required: true },
    Timestamp: { type: Date, default: Date.now },
    Status: { type: String, enum: ['Pending', 'Partially Signed', 'Ongoing', 'Disputed', 'Completed'], default: 'Pending' },
    DisputeNature: { type: String, default: '' },
    Price: { type: String, required: true },
    ResolutionAction: { type: String, default: '' },
    ConsumerApproved: { type: Boolean, default: false },
    ProviderApproved: { type: Boolean, default: false },
    ConsumerSignedUrl: { type: String, default: '' },
    ProviderSignedUrl: { type: String, default: '' },
    FinalMergedUrl: { type: String, default: '' }
}, { collection:'Contract' ,timestamps: true });

module.exports = mongoose.model('Contract', contractSchema);
