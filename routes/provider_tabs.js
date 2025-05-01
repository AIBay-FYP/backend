const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Mongoose Models (using your provided schemas)
const User = require('../models/user');
const Listings = require('../models/Listings');
const Purchase = require('../models/Purchase');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const ComplianceLog = require('../models/ComplianceLog');


// GET Provider Profile
router.get('/provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params; // providerId is Firebase UID
    const { tab = 'All Services' } = req.query;

    // Find user by Firebase UID to get MongoDB _id and profile data
    const user = await User.findOne({ FirebaseUID: providerId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.RoleType !== 'provider') {
      return res.status(403).json({ error: 'User is not a provider' });
    }
    const mongoProviderId = user._id; // Use this for queries
    const providerProfile = user; // Use user document as providerProfile

    let services = [];

    // Fetch services based on the tab
    switch (tab) {
      case 'All Services':
        // Fetch all listings for the provider
        services = await Listings.find({ ProviderID: mongoProviderId });
        break;

      case 'To Ship':
        // Fetch listings where Booking.Status is 'Confirmed' and EscrowStatus is 'Pending' or 'Secured'
        const toShipBookings = await Booking.find({
          ProviderID: mongoProviderId,
          Status: 'Confirmed',
          EscrowStatus: { $in: ['Pending', 'Secured'] },
        }).select('ListingID');

        const toShipListingIds = toShipBookings.map((booking) => booking.ListingID);
        services = await Listings.find({
          _id: { $in: toShipListingIds },
          ProviderID: mongoProviderId,
        });
        break;

      case 'In-Review':
        // Fetch listings where ComplianceLog.Status is 'under-review'
        const inReviewLogs = await ComplianceLog.find({
          Status: 'under-review',
        }).select('ListingID');

        const inReviewListingIds = inReviewLogs.map((log) => log.ListingID);
        services = await Listings.find({
          _id: { $in: inReviewListingIds },
          ProviderID: mongoProviderId,
        });
        break;

      case 'Completed':
        // Fetch listings where:
        // - For rentals: Payment.Status is 'Completed'
        // - For sales: Purchase.EscrowStatus is 'Completed' or 'Released'
        const completedPayments = await Payment.find({
          Status: 'Completed',
        })
          .populate({
            path: 'BookingID',
            match: { ProviderID: mongoProviderId },
            select: 'ListingID',
          })
          .select('BookingID');

        const completedPaymentListingIds = completedPayments
          .filter((payment) => payment.BookingID)
          .map((payment) => payment.BookingID.ListingID);

        const completedPurchases = await Purchase.find({
          ProviderID: mongoProviderId,
          EscrowStatus: { $in: ['Completed', 'Released'] },
        }).select('ListingID');

        const completedPurchaseListingIds = completedPurchases.map((purchase) => purchase.ListingID);

        const completedListingIds = [...new Set([...completedPaymentListingIds, ...completedPurchaseListingIds])];

        services = await Listings.find({
          _id: { $in: completedListingIds },
          ProviderID: mongoProviderId,
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid tab parameter' });
    }

    // Fetch reviews for the provider's listings
    const reviews = await Review.find()
      .populate({
        path: 'BookingID',
        match: { ProviderID: mongoProviderId },
        select: 'ListingID ProviderID',
      })
      .select('ReviewID BookingID ReviewerID Rating Comment Timestamp');
    const filteredReviews = reviews.filter((review) => review.BookingID); // Keep only reviews with matching bookings

    // Return the data in the expected format
    res.json({
      providerProfile,
      services,
      reviews: filteredReviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;