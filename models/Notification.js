const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  NotificationID: { type: String, required: true, unique: true },
  UserID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  Message: { type: String, required: true },
  Type: { type: String, enum: ["Alert", "Info", "Booking", "Chat"], default: "Info" },
  ReadStatus: { type: Boolean, default: false },
  Timestamp: { type: Date, default: Date.now },
}, { collection: "Notifications" });

module.exports = mongoose.model("Notification", notificationSchema);