const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Dispute = require("../models/dispute");
const User = require("../models/user");
const Contract = require("../models/contract");
const sendNotification = require("../utils/sendNotification");

// Helper to generate dispute ID
const generateDisputeID = async () => {
  const count = await Dispute.countDocuments();
  return "D" + (count + 1).toString().padStart(3, "0");
};

router.post("/:firebaseUID", async (req, res) => {
  try {
    const {
      bookingId,
      title,
      description,
      evidence,
      contractId,
      natureOfDispute
    } = req.body;
    const { firebaseUID } = req.params;
    const user = await User.findOne({ FirebaseUID: firebaseUID });


    if (!user) {
      console.log("[DEBUG] User not found for FirebaseUID:", firebaseUID);
      return res.status(404).json({ message: "User not found" });
    }
    const disputeID = await generateDisputeID();

    // Create dispute with empty comment
    const dispute = new Dispute({
      DisputeID: disputeID,
      BookingID: new mongoose.Types.ObjectId(bookingId),
      Title: title,
      Description: description,
      Evidence: evidence,
      CreatedBy: user._id,
      Comment: "" // Always empty on creation
    });

    await dispute.save();

    console.log("Dispute created with ID:", disputeID);
    console.log("Dispute Nature:", natureOfDispute);
    // Update contract's DisputeNature
    if (contractId && natureOfDispute) {
      await Contract.findOneAndUpdate(
        { ContractID:  contractId },
        { DisputeNature: natureOfDispute }
      );
    }
    console.log("Dispute created:", dispute);

    res.status(201).json({ message: "Dispute created", dispute });
  } catch (error) {
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
// @desc    Get all disputes created by a user and send notification if any status has changed
router.get("/user/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ FirebaseUID: req.params.userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const disputes = await Dispute.find({ CreatedBy: user._id }).sort({ Date: -1 });

    // Send notification for disputes with updated status (not "Pending")
    for (const dispute of disputes) {
      if (dispute.Status && dispute.Status !== "Pending") {
        // Create in-app notification
        const Notification = require("../models/Notification");
        await new Notification({
          NotificationID: `N${Date.now()}`,
          UserID: user._id,
          Message: `Your dispute "${dispute.Title}" status updated to "${dispute.Status}".`,
          Type: "Dispute",
          ReadStatus: false,
          Timestamp: new Date()
        }).save();

        // Send FCM notification if user has fcm_token
        if (user.fcm_token) {
          await sendNotification({
            token: user.fcm_token,
            title: "Dispute Status Update",
            body: `Your dispute "${dispute.Title}" status updated to "${dispute.Status}".`,
            data: {
              type: "Dispute",
              disputeId: dispute.DisputeID,
              status: dispute.Status
            }
          });
        }
      }
    }

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

// GET /disputes/:bookingId
router.get("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const disputes = await Dispute.find({ BookingID: bookingId }).lean();

    // Always include comment in response
    const response = disputes.map(d => ({
      disputeID: d.DisputeID,
      title: d.Title,
      description: d.Description,
      date: d.Date,
      createdBy: d.CreatedBy,
      resolvedBy: d.ResolvedBy,
      status: d.Status,
      resolutionAction: d.ResolutionAction,
      evidence: d.Evidence,
      comment: d.Comment // Include comment
    }));

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;