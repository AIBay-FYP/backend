const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  BookingID: { type: String, required: true, unique: true },
  ConsumerID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ProviderID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ListingID: { type: mongoose.Schema.Types.ObjectId, ref: "Listings", required: true },
  StartDate: { type: Date, required: true },
  EndDate: { type: Date, required: true },
  Price: { type: Number, required: true },
  EscrowStatus: { type: String, enum: ["Pending", "Completed", "Released"], default: "Pending" },
  Status: { type: String, enum: ["Pending", "Confirmed", "Cancelled", "Completed"], default: "Pending" },
  DateCreated: { type: Date, default: Date.now },
},
{ collection: 'Bookings' }
);

module.exports = mongoose.model("Booking", bookingSchema);