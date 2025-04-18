// routes/profile.js
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Listing = require("../models/Listings");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

// GET /profile/consumer/:firebaseUID
router.get("/consumer/:firebaseUID", async (req, res) => {
  try {
    const { firebaseUID } = req.params;

    const user = await User.findOne({ FirebaseUID: firebaseUID, RoleType: "User" });

    if (!user) return res.status(404).json({ message: "Consumer not found" });

    const orders = await Booking.find({ ConsumerID: user._id }).populate("ListingID");

    res.json({
      profile: {
        Name: user.Name,
        Email: user.Email,
        ContactNumber: user.ContactNumber,
        Rating: user.Rating,
        ProfilePicture: user.ProfilePicture,
      },
      orders,
    });
  } catch (err) {
    console.error("Consumer route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /profile/provider/:firebaseUID
router.get("/provider/:firebaseUID", async (req, res) => {
  try {
    const { firebaseUID } = req.params;

    const provider = await User.findOne({ FirebaseUID: firebaseUID, RoleType: "Provider" });

    if (!provider) return res.status(404).json({ message: "Provider not found" });

    const listings = await Listing.find({ ProviderID: provider._id });
    const reviews = await Review.find({ ProviderID: provider._id });

    res.json({
      profile: {
        Name: provider.Name,
        Email: provider.Email,
        ContactNumber: provider.ContactNumber,
        Rating: provider.Rating,
        ProfilePicture: provider.ProfilePicture,
      },
      listings,
      reviews,
    });
  } catch (err) {
    console.error("Provider route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;