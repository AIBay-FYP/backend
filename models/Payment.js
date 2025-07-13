// models/payment.model.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    PaymentID: { type: String, required: true, unique: true },

    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    PurchaseID: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },

    ConsumerID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ProviderID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    Amount: { type: Number, required: true },
    PlatformFee: { type: Number, default: 0 },
    SecurityFee: { type: Number, default: 0 },
    CancellationFee: { type: Number, default: 0 },

    PaymentMethod: {
      type: String,
      enum: ["Escrow", "Stripe", "JazzCash", "Cash"],
      default: "Escrow"
    },

    Status: {
      type: String,
      enum: ["Pending", "Completed", "Released", "Cancelled", "Disputed"],
      default: "Pending"
    },

    IsRental: { type: Boolean, required: true },

    CreatedAt: { type: Date, default: Date.now },
    ReleasedAt: { type: Date }
  },
  { collection: "Payment" }
);

module.exports = mongoose.model("Payment", paymentSchema);
