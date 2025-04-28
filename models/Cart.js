// models/Cart.js
const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  ListingId: { type: String, required: true },
  ProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  Title: { type: String, required: true },
  Type:{type: String},
  Description: { type: String },
  IsNegotiable: { type: Boolean },
  Availability: { type: Boolean },
  Category: { type: String },
  Photos: [String],
  DemandScore: { type: Number },
  ServiceType: { type: String, enum: ['Rental', 'Purchase'] },
  Location: { type: String },
  SecurityFee: { type: Number },
  CancellationFee: { type: Number },
  RentalDays: { type: Number },
  Quantity: { type: Number, default: 1 },
  Price: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String },
    isFixedPrice: { type: Boolean },
    fixedPrice: { type: Number }
  },
  addedAt: { type: Date, default: Date.now }
});

const CartSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Firebase UID or internal user ID
  items: [CartItemSchema],
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cart', CartSchema);
