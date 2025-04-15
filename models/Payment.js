const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  PaymentID: { type: String, required: true, unique: true },
  BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  Amount: { type: Number, required: true },
  PaymentMethod: { type: String, enum: ["Card", "BankTransfer", "Cash", "Easypaisa", "JazzCash"], required: true },
  Status: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Pending" },
  Timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);