const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  UserID: { type: String, unique: true },
  Name: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  Location: { type: String, required: true },
  ContactNumber: { type: String, required: true }, // Added as required field
  Rating: { type: Number, default: 4.0 },
  TotalRatings: { type: Number, default: 0 },
  RoleType: { 
    type: String, 
    enum: ['Consumer', 'Provider','User'], 
    default: 'User' 
  },
  ApprovedBy: { type: String, default: '-' },
  CreatedAt: { type: Date, default: Date.now },
  CNIC: { type: String, unique: true },
  Interests: [String],
  FirebaseUID: { type: String, required: true, unique: true },
  updatedAt: Date,
  ProfilePicture: String,
  BusinessType: String,
  Services: [String],
  updatedInterests: { type: Boolean, default: false },
  fcm_token: { type: String, required: false }  // This field is optional, but you can make it required based on your app logic
});

module.exports = mongoose.model("User", userSchema, "User");
