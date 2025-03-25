const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // MongoDB default ObjectId
    UserID: { type: String, unique: true }, // Uxxx format
    FirebaseUID: { type: String, required: true, unique: true },
    Name: { type: String, required: true },
    Email: { type: String, required: true, unique: true },
    Location: { type: String },
    ProfilePicture: { type: String, default: "https://www.w3schools.com/w3images/avatar2.png" },
    ContactNumber: { type: String },
    CNIC: { type: String, default: "-" },
    BusinessType: { type: String, enum: ["Individual", "Company", "Storefront"] },
    ServiceType: { type: String, enum: ["Rent", "Sale", "Both"] },
    Interests: { type: [String], default: [] },
    Rating: { type: Number, default: 0 },
    RoleType: { type: String, enum: ["Admin", "Moderator", "User", "Provider"] },
    ApprovedBy: { type: String, default: "-" },
    CreatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

module.exports = mongoose.model("User", userSchema,"User");
