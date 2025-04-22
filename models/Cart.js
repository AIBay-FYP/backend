const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  ConsumerID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  Items: [
    {
      ListingID: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
      ProviderID: { type: mongoose.Schema.Types.ObjectId, required: true },
      Price: { type: Number, required: true },
      Currency: { type: String, default: "PKR" },
      DateAdded: { type: Date, default: Date.now }
    }
  ],
  LastUpdated: { type: Date, default: Date.now }
},  { collection: 'Cart' }
,{ timestamps: true });

module.exports = mongoose.model("Cart", cartSchema);