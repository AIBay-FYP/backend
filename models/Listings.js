const mongoose = require("mongoose");

const ListingSchema = new mongoose.Schema({
  ProviderID: mongoose.Schema.Types.ObjectId,
  Title: String,
  Description: String,
  IsNegotiable: Boolean,
  IsFixedPrice: Boolean,
  Availability: Boolean,
  Category: String,
  Photos: [String],
  DemandScore: { type: Number, default: 0 },
  FAQs: [
    {
      question: { type: String, required: true },
      answer: { type: String, default: "" },
    }
  ],  
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
  FixedPrice: { type: Number, default: 0 },
  RentalDays: Number,
Quantity: { type: Number, default: 1 },
  Currency: {type:String,default: 'PKR'},
  Documents: { type: [String], default: [] },
});

// Pre-save hook to enforce business logic
ListingSchema.pre("save", function (next) {
  if (this.IsNegotiable) {
    this.IsFixedPrice = false;
    this.FixedPrice = 0;
  } else if (this.IsFixedPrice) {
    this.IsNegotiable = false;
    this.MinPrice = 0;
    this.MaxPrice = 0;
  } else if (this.ServiceType == "Sale") {
    this.RentalDays = 0;
  }

  next();
});

// Enable full-text search indexing
ListingSchema.index({ title: "text", description: "text", keywords: "text" });

module.exports = mongoose.model("Listings", ListingSchema);