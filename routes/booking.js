const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const User = require("../models/user");
const Listing = require("../models/Listings");
const Notification = require("../models/Notification");

// Helper to generate BookingID like B001, B002...
const generateBookingID = async () => {
  const count = await Booking.countDocuments();
  return `B${(count + 1).toString().padStart(3, "0")}`;
};

// Request Booking
router.post("/request", async (req, res) => {
  try {
    const { firebaseUID, ListingID, StartDate, EndDate, Price } = req.body;
    console.log("Requesting booking with data:", req.body);
    // Validate required fields
    if (!firebaseUID || !ListingID || !StartDate || !EndDate || !Price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (firebaseUID, ListingID, StartDate, EndDate, Price)."
      });
    }

    const startDateObj = new Date(StartDate);
    const endDateObj = new Date(EndDate);

    // Check if valid dates
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format for StartDate or EndDate."
      });
    }

    // Ensure StartDate is before EndDate
    if (startDateObj >= endDateObj) {
      return res.status(400).json({
        success: false,
        message: "StartDate must be earlier than EndDate."
      });
    }

    // Find consumer
    const consumer = await User.findOne({ FirebaseUID: firebaseUID });
    if (!consumer) {
      return res.status(404).json({ success: false, message: "Consumer not found." });
    }

    // Find listing
    const listing = await Listing.findById(ListingID);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    // Find provider
    const provider = await User.findById(listing.ProviderID);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found." });
    }

    // Create booking
    const booking = new Booking({
      BookingID: await generateBookingID(),
      ConsumerID: consumer._id,
      ProviderID: provider._id,
      ListingID,
      StartDate: startDateObj,
      EndDate: endDateObj,
      Price,
    });

    await booking.save();

    // Notify provider
    const notification = new Notification({
      NotificationID: `N${Date.now()}`,
      UserID: provider._id,
      Message: `New service request for "${listing.Title}"`,
      Type: "Booking",
    });
    await notification.save();

    return res.status(201).json({
      success: true,
      message: "Booking requested successfully.",
      booking,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
      error: error.message || error,
    });
  }
});

router.patch("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, escrow, cancelledBy, firebaseUID } = req.body;

    const booking = await Booking.findById(id)
      .populate("ListingID")
      .populate("ConsumerID")
      .populate("ProviderID");

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    if (status === "Cancelled") {
      const listing = booking.ListingID;
      if (booking.Status === "Confirmed" && listing.CancellationFee > 0) {
        return res.status(400).json({
          success: false,
          message: `Booking must be cancelled with a fee of ${listing.CancellationFee}`,
          fee: listing.CancellationFee,
        });
      }
    }

    if (status) booking.Status = status;
    if (escrow) booking.EscrowStatus = escrow;
    booking.updatedAt = new Date();
    await booking.save();

    let userToNotify, message;
    if (status === "Confirmed") {
      userToNotify = booking.ConsumerID;
      message = `Your booking for "${booking.ListingID.Title}" has been approved.`;
    } else if (status === "Rejected") {
      userToNotify = booking.ConsumerID;
      message = `Your booking for "${booking.ListingID.Title}" was rejected.`;
    } else if (status === "On-going") {
      userToNotify = booking.ProviderID;
      message = `Contract has started for "${booking.ListingID.Title}".`;
    } else if (status === "Completed") {
      userToNotify = booking.ConsumerID;
      message = `Booking for "${booking.ListingID.Title}" is now marked complete.`;
    } else if (status === "Cancelled") {
      const user = await User.findOne({ FirebaseUID: firebaseUID });
      userToNotify = user;
      message = `Booking for "${booking.ListingID.Title}" has been cancelled by ${cancelledBy}.`;
    }

    if (userToNotify) {
      const notification = new Notification({
        NotificationID: `N${Date.now()}`,
        UserID: userToNotify._id,
        Message: message,
        Type: "Booking",
      });
      await notification.save();
    }

    res.status(200).json({ success: true, message: "Booking updated", booking });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

router.get('/user/:firebaseUID', async (req, res) => {
    try {
      const { firebaseUID } = req.params;
      const user = await User.findOne({ FirebaseUID: firebaseUID });
  
      if (!user) return res.status(404).json({ message: "User not found" });
  
      const bookings = await Booking.find({
        $or: [{ ConsumerID: user._id }, { ProviderID: user._id }]
      }).populate("ListingID").sort({ DateCreated: -1 });
  
      res.status(200).json({ success: true, bookings });
    } catch (error) {
      console.error("Fetch bookings error:", error);
      res.status(500).json({ message: "Server error", error });
    }
});

// Get a single booking by MongoDB _id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is a valid MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid Booking ID format" });
    }

    const booking = await Booking.findById(id)
      .populate("ListingID")
      .populate("ConsumerID")
      .populate("ProviderID");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error("Get booking detail error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});    

// Cancel Booking (by Consumer)
router.patch("/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate("ListingID");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.Status === "Cancelled" || booking.Status === "Completed") {
      return res.status(400).json({ message: "Booking cannot be cancelled at this stage." });
    }

    let cancellationFee = 0;

    if (booking.Status === "Approved") {
      cancellationFee = booking.ListingID.CancellationFee || 0;
      // In real payment logic, deduct cancellation fee from consumer or withhold escrow
    }

    booking.Status = "Cancelled";
    booking.EscrowStatus = "Released";
    booking.DateCancelled = new Date();
    booking.updatedAt = new Date();
    await booking.save();

    // Add notification (you already set this up)
    await new Notification({
      NotificationID: `N-${Date.now()}`,
      UserID: booking.ProviderID,
      Message: `Booking ${booking._id} has been cancelled.`,
      Type: "Alert",
      ReadStatus: false,
      Timestamp: new Date()
    }).save();

    res.status(200).json({
      message: `Booking cancelled. Cancellation fee: ${cancellationFee}`,
      cancellationFee,
      booking
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// PATCH Mark Booking as Complete (by Consumer or Provider)
router.patch("/complete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { firebaseUID } = req.body;

    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) return res.status(404).json({ message: "User not found" });

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (user._id.equals(booking.ConsumerID)) {
      booking.ConsumerCompleted = true;
    } else if (user._id.equals(booking.ProviderID)) {
      booking.ProviderCompleted = true;
    } else {
      return res.status(403).json({ message: "You are not part of this booking." });
    }

    if (booking.ConsumerCompleted && booking.ProviderCompleted) {
      booking.Status = "Completed";
      booking.EscrowStatus = "Completed";
      booking.DateCompleted = new Date();

      // Notify both parties
      await new Notification({
        NotificationID: `N-${Date.now()}`,
        UserID: booking.ConsumerID,
        Message: `Booking ${booking._id} is marked as completed.`,
        Type: "Info",
        ReadStatus: false,
        Timestamp: new Date()
      }).save();

      await new Notification({
        NotificationID: `N-${Date.now() + 1}`,
        UserID: booking.ProviderID,
        Message: `Booking ${booking._id} is marked as completed.`,
        Type: "Info",
        ReadStatus: false,
        Timestamp: new Date()
      }).save();
    }

    await booking.save();

    res.status(200).json({ message: "Booking status updated", booking });
  } catch (error) {
    console.error("Complete booking error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;