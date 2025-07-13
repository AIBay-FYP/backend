const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  NotificationID: { type: String, required: true, unique: true },
  UserID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  Message: { type: String, required: true },
  Type: { 
    type: String, 
    enum: [
      "Payment", 
      "Refund", 
      "Withdraw", 
      "Alert", 
      "Listing", 
      "Booking", 
      "Dispute", 
      "Contract" // <-- Add "Contract" to enum
    ], 
    required: true 
  },
  ReadStatus: { type: Boolean, default: false },
  Timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);