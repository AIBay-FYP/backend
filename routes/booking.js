const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const User = require("../models/user");
const Listing = require("../models/listings");
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
    const consumer = await User.findOne({ FirebaseUID: firebaseUID });

    if (!consumer) return res.status(404).json({ success: false, message: "Consumer not found." });

    const listing = await Listing.findById(ListingID);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

    const provider = await User.findById(listing.ProviderID);

    const booking = new Booking({
      BookingID: await generateBookingID(),
      ConsumerID: consumer._id,
      ProviderID: provider._id,
      ListingID,
      StartDate,
      EndDate,
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

    res.status(201).json({ success: true, message: "Booking requested", booking });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

//  Update Booking Status (approve, reject, ongoing, complete, cancel)
router.patch("/update/:bookingID", async (req, res) => {
  try {
    const { bookingID } = req.params;
    const { status, escrow, cancelledBy, firebaseUID } = req.body;

    const booking = await Booking.findOne({ BookingID: bookingID }).populate("ListingID").populate("ConsumerID").populate("ProviderID");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    // Handle cancellation logic
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

    // Apply updates
    if (status) booking.Status = status;
    if (escrow) booking.EscrowStatus = escrow;
    await booking.save();

    // Send notification based on status
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

router.get('/:bookingID', async (req, res) => {
    try {
      const { bookingID } = req.params;
      const booking = await Booking.findOne({ BookingID: bookingID }).populate("ListingID").populate("ConsumerID").populate("ProviderID");
  
      if (!booking) return res.status(404).json({ message: "Booking not found" });
  
      res.status(200).json({ success: true, booking });
    } catch (error) {
      console.error("Get booking detail error:", error);
      res.status(500).json({ message: "Server error", error });
    }
});    

module.exports = router;