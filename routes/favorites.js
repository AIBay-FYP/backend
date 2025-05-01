const express = require("express");
const router = express.Router();
const Favorite = require("../models/Favorites");
const User = require("../models/user");

// GET favorites by Firebase UID
router.get("/:userId", async (req, res) => {
  console.log("Inside the get favorites route");
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ message: "User ID is required." });

    const user = await User.findOne({ FirebaseUID: userId });
    if (!user) return res.status(400).json({ message: "User not found." });

    const favorites = await Favorite.find({ ConsumerID: user._id }).populate("ListingID");
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST favorite
router.post("/", async (req, res) => {
  try {
    const { firebaseUID, ListingID } = req.body;
    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) return res.status(400).json({ message: "User not found." });

    const exists = await Favorite.findOne({ ConsumerID: user._id, ListingID });
    if (exists) return res.status(409).json({ message: "Already in favorites." });

    const favorite = new Favorite({ ConsumerID: user._id, ListingID });
    await favorite.save();
    res.status(201).json(favorite);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE favorite
router.delete("/", async (req, res) => {
  try {
    const { firebaseUID, FavoriteID } = req.body;
    console.log("ConsumerID:", firebaseUID, "FavoriteID:", FavoriteID);
    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) return res.status(400).json({ message: "User not found." });
    console.log("User found:", user._id);

    const deleted = await Favorite.findByIdAndDelete(FavoriteID);
    if (!deleted) return res.status(404).json({ message: "Favorite not found." });

    res.json({ message: "Removed from favorites." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
