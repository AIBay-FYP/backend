const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  TransactionID: { type: String, required: true, unique: true },
  UserID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  Amount: { type: Number, required: true },
  Type: { type: String, enum: ["Withdraw", "Refund"], required: true },
  PaymentID: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  Timestamp: { type: Date, default: Date.now },
  Status: { type: String, enum: ["Success", "Failed"], default: "Success" },
  Description: { type: String }
}, { collection: "Transaction" });

module.exports = mongoose.model("Transaction", transactionSchema);