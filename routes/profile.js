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

    const user = await User.findOne({ FirebaseUID: firebaseUID, RoleType: "Consumer" });

    if (!user) return res.status(404).json({ message: "Consumer not found" });

    const orders = await Booking.find({ ConsumerID: user._id }).populate("ListingID");
    console.log(orders);
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
        CNIC: provider.CNIC,
        Location: provider.Location,
        BusinessType: provider.BusinessType ?? "Hello",
        Services: provider.Services || [],
      },
      listings,
      reviews,
    });
  } catch (err) {
    console.error("Provider route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/consumer/:firebaseUID", async (req, res) => {
  try {
    const { firebaseUID } = req.params;
    const { Email, Name, ContactNumber, Categories } = req.body;

    const user = await User.findOne({ FirebaseUID: firebaseUID, RoleType: "Consumer" });

    if (!user) return res.status(404).json({ message: "Consumer not found" });

    // Update fields if provided
    if (Email) user.Email = Email;
    if (Name) user.Name = Name;
    if (ContactNumber) user.ContactNumber = ContactNumber;
    if (Categories) user.Categories = Categories;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      profile: {
        Name: user.Name,
        Email: user.Email,
        ContactNumber: user.ContactNumber,
        Rating: user.Rating,
        ProfilePicture: user.ProfilePicture,
        Interests: user.Interests || [],
      },
    });
  } catch (err) {
    console.error("Consumer update route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/provider/:firebaseUID
router.put("/provider/:firebaseUID", async (req, res) => {
  try {
    const { firebaseUID } = req.params;
    const { Name, Email, ContactNumber, Location, CNIC, BusinessType, Services, Interests } = req.body;

    const provider = await User.findOne({ FirebaseUID: firebaseUID, RoleType: "Provider" });

    if (!provider) return res.status(404).json({ message: "Provider not found" });

    // CNIC uniqueness check
    if (CNIC) {
      const existingCNICUser = await User.findOne({ CNIC, _id: { $ne: provider._id } });
      if (existingCNICUser) {
        return res.status(400).json({ message: "This CNIC already exists and cannot be handled." });
      }
      provider.CNIC = CNIC;
    }

    // Update fields if provided
    if (Email) provider.Email = Email;
    if (Name) provider.Name = Name;
    if (ContactNumber) provider.ContactNumber = ContactNumber;
    if (Location) provider.Location = Location;
    if (BusinessType) provider.BusinessType = BusinessType;
    if (Services) provider.Services = Services;
    if (Interests) provider.Interests = Interests;

    await provider.save();

    res.json({
      message: "Profile updated successfully",
      profile: {
        Name: provider.Name,
        Email: provider.Email,
        ContactNumber: provider.ContactNumber,
        Rating: provider.Rating,
        ProfilePicture: provider.ProfilePicture,
        CNIC: provider.CNIC,
        Location: provider.Location,
        BusinessType: provider.BusinessType || "Individual",
        Services: provider.Services || [],
        Interests: provider.Interests || [],
      },
    });
  } catch (err) {
    console.error("Provider update route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;