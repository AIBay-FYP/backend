const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Firebase UID as _id
    UserID: { type: String, required: true, unique: true },
    Name: { type: String, required: true },
    Email: { type: String, required: true, unique: true },
    Location: { type: String },
    ProfilePicture: { type: String, default: "https://www.w3schools.com/w3images/avatar2.png" },
    ContactNumber: { type: String },
    Rating: { type: Number, default: 0 },
    RoleType: { type: String, enum: ["Admin", "Moderator", "User"], required: true },
    ApprovedBy: { type: String, default: "-" },
    CreatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

module.exports = mongoose.model("User", userSchema);
