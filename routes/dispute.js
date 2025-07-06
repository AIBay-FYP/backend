const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Dispute = require("../models/dispute");
const User = require("../models/user");

// Helper to generate dispute ID
const generateDisputeID = async () => {
  const count = await Dispute.countDocuments();
  return "D" + (count + 1).toString().padStart(3, "0");
};

// @route   POST /disputes/:firebaseUID
// @desc    Create a new dispute for a booking
router.post("/:firebaseUID", async (req, res) => {
  const { firebaseUID } = req.params;
  const { bookingId, title, description, evidence = [] } = req.body;

  console.log("[DEBUG] Starting dispute creation", {
    firebaseUID,
    bookingId,
    title,
    description,
    evidenceLength: evidence.length
  });

  try {
    console.log("[DEBUG] Looking up user with FirebaseUID:", firebaseUID);
    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) {
      console.log("[DEBUG] User not found for FirebaseUID:", firebaseUID);
      return res.status(404).json({ message: "User not found" });
    }
    console.log("[DEBUG] User found:", { userId: user._id, name: user.Name });

    console.log("[DEBUG] Generating dispute ID");
    const disputeID = await generateDisputeID();
    console.log("[DEBUG] Generated dispute ID:", disputeID);

    console.log("[DEBUG] Creating new dispute document");
    const dispute = new Dispute({
      DisputeID: disputeID,
      BookingID: new mongoose.Types.ObjectId(bookingId),
      Title: title,
      Description: description,
      Evidence: evidence,
      CreatedBy: user._id,
    });

    console.log("[DEBUG] Saving dispute to database");
    await dispute.save();
    console.log("[DEBUG] Dispute successfully created:", {
      disputeID,
      bookingId,
      createdBy: user._id
    });

    res.status(201).json({ message: "Dispute created", dispute });
  } catch (error) {
    console.error("[DEBUG] Error creating dispute:", {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   GET /disputes/booking/:bookingId
// @desc    Get all disputes for a specific booking
router.get("/booking/:bookingId", async (req, res) => {
  try {
    const disputes = await Dispute.find({ BookingID: req.params.bookingId }).populate("CreatedBy", "Name");
    res.status(200).json({ disputes });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   GET /disputes/user/:userId
// @desc    Get all disputes created by a user
router.get("/user/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ FirebaseUID: req.params.userId });
    const disputes = await Dispute.find({ CreatedBy: user._id }).sort({ Date: -1 });
    res.status(200).json({ disputes });
  } catch (error) {
    console.error("Error fetching user disputes:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   PATCH /disputes/:disputeId/resolve
// @desc    Resolve a dispute (admin only)
router.patch("/:disputeId/resolve", async (req, res) => {
  const { disputeId } = req.params;
  const { resolutionAction, resolvedById, status = "Resolved" } = req.body;

  try {
    const dispute = await Dispute.findOne({ DisputeID: disputeId });
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });

    dispute.ResolutionAction = resolutionAction;
    dispute.Status = status;
    dispute.ResolvedBy = resolvedById;

    await dispute.save();
    res.status(200).json({ message: "Dispute resolved", dispute });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;