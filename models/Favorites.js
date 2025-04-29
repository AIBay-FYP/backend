const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  ConsumerID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ListingID: { type: mongoose.Schema.Types.ObjectId, ref: "Listings", required: true },
  DateAdded: { type: Date, default: Date.now }
}, { collection: "Favorites", timestamps: true });

module.exports = mongoose.model("Favorite", favoriteSchema);