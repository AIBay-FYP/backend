const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  PurchaseID: { type: String, required: true, unique: true },
  ConsumerID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ProviderID: { type: mongoose.Schema.Types.ObjectId, required: true },
  ListingID: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },

  Price: { type: Number, required: true },
  Currency: { type: String, default: "PKR" },
  Status: { type: String, enum: ["Pending", "Cancelled", "Completed"], default: "Pending" },
  EscrowStatus: { type: String, enum: ["Pending", "Completed", "Released"], default: "Pending" },

  ConsumerCompleted: { type: Boolean, default: false },
  ProviderCompleted: { type: Boolean, default: false },

  DatePurchased: { type: Date, default: Date.now },
  DateCompleted: { type: Date },
  DateCancelled: { type: Date },
}
, { collection: 'Purchase' }
, { timestamps: true });

module.exports = mongoose.model("Purchase", purchaseSchema);