const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  ListingID: { type: mongoose.Schema.Types.ObjectId, ref: "Listings", required: true },
  ProviderID: { type: mongoose.Schema.Types.ObjectId, required: true },
  DateAdded: { type: Date, default: Date.now },
  // Optional fields
  Price: Number,
  Currency: { type: String, default: "PKR" }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  ConsumerID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  Items: [itemSchema],
  LastUpdated: { type: Date, default: Date.now }
}, { timestamps: true, collection: "Cart" });


module.exports = mongoose.model("Cart", cartSchema);