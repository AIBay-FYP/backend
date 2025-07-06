const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const User = require("../models/user");
const Listing = require("../models/Listings");
const Notification = require("../models/Notification");
const sendNotification = require("../utils/sendNotification")

const { updateDemandScore } = require("../utils/demandScore");

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

    if (!firebaseUID || !ListingID || !StartDate || !EndDate || !Price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (firebaseUID, ListingID, StartDate, EndDate, Price)."
      });
    }

    const startDateObj = new Date(StartDate);
    const endDateObj = new Date(EndDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format for StartDate or EndDate."
      });
    }

    if (startDateObj >= endDateObj) {
      return res.status(400).json({
        success: false,
        message: "StartDate must be earlier than EndDate."
      });
    }

    console.log("Finding consumer...");
    const consumer = await User.findOne({ FirebaseUID: firebaseUID });
    if (!consumer) {
      console.log("Consumer not found.");
      return res.status(404).json({ success: false, message: "Consumer not found." });
    }
    console.log("Consumer found:", consumer._id);

    console.log("Finding listing...");
    const listing = await Listing.findById(ListingID);
    if (!listing) {
      console.log("Listing not found.");
      return res.status(404).json({ success: false, message: "Listing not found." });
    }
    console.log("Listing found:", listing._id);

    console.log("Finding provider...");
    const provider = await User.findById(listing.ProviderID);
    if (!provider) {
      console.log("Provider not found.");
      return res.status(404).json({ success: false, message: "Provider not found." });
    }
    console.log("Provider found:", provider._id);

    const bookingID = await generateBookingID();
    console.log("Creating booking with ID:", bookingID);

    const booking = new Booking({
      BookingID: bookingID,
      ConsumerID: consumer._id,
      ProviderID: provider._id,
      ListingID: listing._id,
      StartDate: startDateObj,
      EndDate: endDateObj,
      Price,
    });

    await booking.save();
    console.log("Booking saved:", booking._id);

    await updateDemandScore(ListingID, "bookingRequest");

    const notification = new Notification({
      NotificationID: `N${Date.now()}`,
      UserID: provider._id,
      Message: `New service request for "${listing.Title}"`,
      Type: "Booking",
    });

    await notification.save();
    console.log("Notification saved");

    if (provider.FCMToken) {
  await sendNotification({
    token: provider.fcm_token,
    title: "New Booking Request",
    body: `You have a new booking request for "${listing.Title}"`,
    data: {
      type: "Booking",
      listingId: listing._id.toString(),
      bookingId: booking._id.toString(),
    }
  });
}


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


router.get('/between/:consumerId/:providerId', async (req, res) => {
  try {
    const { consumerId, providerId } = req.params;

    const consumer = await User.findOne({ FirebaseUID: consumerId });
    if (!consumer) {
        return res.status(404).json({ success: false, message: "Consumer not found" });
    }

    const provider = await User.findOne({ FirebaseUID: providerId });
    if (!provider) {
        return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const bookings = await Booking.find({
      ConsumerID: consumer,
      ProviderID: provider,
      Status: { $in: ['Confirmed'] }
    })
    .sort({ StartDate: -1 })
    .populate('ListingID')  // Populate the ListingID to get access to the serviceType
    .populate('ConsumerID')
    .populate('ProviderID');

    // Filter bookings based on the serviceType of the associated listing
    const filteredBookings = bookings.filter(booking => booking.ListingID.ServiceType === 'Rent');
    console.log('Filtered bookings:', filteredBookings);
    
    if (!filteredBookings || filteredBookings.length === 0) {
      return res.status(404).json({ success: false, message: 'No active rental bookings found between these users.' });
    }

    res.status(200).json({ success: true, bookings: filteredBookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});




router.get('/active/:consumerId/:providerId', async (req, res) => {
  try {
      const { consumerId, providerId } = req.params;

      const consumer = await User.findOne({ FirebaseUID: consumerId });
      if (!consumer) {
          return res.status(404).json({ success: false, message: "Consumer not found" });
      }

      const provider = await User.findOne({ FirebaseUID: providerId });
      if (!provider) {
          return res.status(404).json({ success: false, message: "Provider not found" });
      }

      console.log('Fetching active booking for consumer:', consumerId, 'and provider:', providerId);
      const booking = await Booking.findOne({
          ConsumerID: consumer,
          ProviderID: provider,
          Status: { $in: ['Confirmed'] }
      })
      .sort({ BookingDate: -1 })  // Adjust according to your date field
      .populate('ListingID')  // Populate the ListingID to get access to the serviceType
      .populate('ConsumerID')
      .populate('ProviderID');

      // Check if the serviceType of the Listing is 'Rent'
      if (booking && booking.ListingID.serviceType !== 'Rent') {
          return res.status(404).json({ success: false, message: 'No active rental booking found between these users.' });
      }

      if (!booking) {
          return res.status(404).json({ success: false, message: 'No active booking found between these users.' });
      }

      console.log('Active booking found:', booking);
      res.status(200).json({ success: true, booking });
  } catch (error) {
      console.error('Error fetching active booking:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
      let bookings = [];
      if (!user) return res.status(404).json({ message: "User not found" });
      
      if(user.RoleType === "Provider") {
        const listings = await Listing.find({ ProviderID: user._id });
        if (!listings || listings.length === 0) {
          return res.status(404).json({ message: "No listings found for this provider." });
        }
        bookings = await Booking.find({ ListingID: { $in: listings.map(listing => listing._id) } })
          .populate("ConsumerID")
          .populate("ProviderID")
          .sort({ DateCreated: -1 });
      }
      else{
        
              bookings = await Booking.find({
                $or: [{ ConsumerID: user._id }]
              }).populate("ListingID").sort({ DateCreated: -1 });
          

      }

      res.status(200).json({ success: true, bookings });
    } catch (error) {
      console.error("Fetch bookings error:", error);
      res.status(500).json({ message: "Server error", error });
    }
});

router.get('/userAll/:firebaseUID', async (req, res) => {
  try {
    const { firebaseUID } = req.params;
    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) return res.status(404).json({ message: "User not found" });

    let bookings = [];

    if (user.RoleType === "Provider") {
      // Get all listings created by this provider
      const listings = await Listing.find({ ProviderID: user._id });
      if (!listings || listings.length === 0) {
        return res.status(404).json({ message: "No listings found for this provider." });
      }

      // Get all bookings for these listings
      bookings = await Booking.find({ ListingID: { $in: listings.map(l => l._id) } })
        .populate("ListingID")       // Include Listing details
        .populate("ConsumerID")      // Include Consumer user details
        .populate("ProviderID")      // Include Provider user details
        .sort({ DateCreated: -1 });

    } else {
      // Consumer bookings
      bookings = await Booking.find({ ConsumerID: user._id })
        .populate("ListingID")       // Include Listing details
        .populate("ConsumerID")      // Include Consumer user details
        .populate("ProviderID")      // Include Provider user details
        .sort({ DateCreated: -1 });
    }

    res.status(200).json({ success: true, bookings });

  } catch (error) {
    console.error("Fetch enriched bookings error:", error);
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
      Message: `Booking for your service ${booking.ListingID.Title} has been cancelled.`,
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

    
    // Update demand score for the listing
    await updateDemandScore(listingID, "completedBooking");

    await booking.save();

    res.status(200).json({ message: "Booking status updated", booking });
  } catch (error) {
    console.error("Complete booking error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


router.patch("/confirm/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { firebaseUID } = req.body;

    console.log('Received firebaseUID:', firebaseUID);


    // Validate booking ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid Booking ID format" });
    }

    // Find the booking and populate related data
    const booking = await Booking.findById(id)
      .populate("ListingID")
      .populate("ConsumerID")
      .populate("ProviderID");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify user exists
    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Verify user is the provider
    if (!user._id.equals(booking.ProviderID._id)) {
      return res.status(403).json({ success: false, message: "Only the provider can confirm this booking" });
    }

    // Check if booking is in a valid state to be confirmed
    if (booking.Status !== "Pending") {
      return res.status(400).json({ 
        success: false, 
        message: `Booking cannot be confirmed. Current status: ${booking.Status}`
      });
    }

    // Update booking status
    booking.Status = "Confirmed";
    booking.EscrowStatus = "Pending";
    booking.updatedAt = new Date();

    await booking.save();

    // Create notification for consumer
    const notification = new Notification({
      NotificationID: `N${Date.now()}`,
      UserID: booking.ConsumerID._id,
      Message: `Your booking for "${booking.ListingID.Title}" has been confirmed by the provider.`,
      Type: "Booking",
      ReadStatus: false,
      Timestamp: new Date()
    });

    await notification.save();

    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully",
      booking
    });

  } catch (error) {
    console.error("Confirm booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;