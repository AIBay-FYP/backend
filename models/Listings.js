const mongoose = require("mongoose");

const ListingSchema = new mongoose.Schema({
  ListingID: String,
  ProviderID: mongoose.Schema.Types.ObjectId,
  Title: String,
  Description: String,
  IsNegotiable: Boolean,
  Availability: String,
  Category: String,
  Photos: [String],
  DemandScore: Number,
  FAQs: [String],
  ServiceType: String,
  DateCreated: Date,
  DatePosted: Date,
  Location: String,
  DaysAvailable: Number,
  SecurityFee: Number,
  CancellationFee: Number,
  Keywords: [String],
  MaxPrice: Number,
  MinPrice: Number,
  Currency: String,
});

module.exports = mongoose.model("Listings", ListingSchema);