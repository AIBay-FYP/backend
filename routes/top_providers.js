const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
// Models
const Booking = require('../models/Booking');

// Endpoint to get top providers
router.get('/top-providers', async (req, res) => {
  try {
    // Step 1: Initial aggregation query
    const topProviders = await Booking.aggregate([
      {
        $lookup: {
          from: 'listings',               // Lookup 'listings' collection
          localField: 'ListingID',         // Field from bookings
          foreignField: '_id',            // Field from listings
          as: 'listingDetails',           // Result array to be added to each document
        },
      },
      {
        $unwind: '$listingDetails',       // Unwind the 'listingDetails' array
      },
      // Step 2: Lookup to join 'User' collection (provider)
      {
        $lookup: {
          from: 'users',                  // Corrected collection name to 'users'
          localField: 'listingDetails.ProviderID', // Reference provider field
          foreignField: '_id',            // Match with '_id' in 'users'
          as: 'providerDetails',
        },
      },
      {
        $unwind: '$providerDetails',      // Unwind the 'providerDetails' array
      },
      // Step 3: Lookup to join 'User' collection (consumer)
      {
        $lookup: {
          from: 'users',                  // Corrected collection name to 'users'
          localField: 'ConsumerID',        // Reference consumer field
          foreignField: '_id',            // Match with '_id' in 'users'
          as: 'consumerDetails',
        },
      },
      {
        $unwind: '$consumerDetails',      // Unwind the 'consumerDetails' array
      },
      // Step 4: Grouping the data for metrics calculation
      {
        $group: {
          _id: '$listingDetails.ProviderID',
          providerName: { $first: '$providerDetails.Name' },
          providerEmail: { $first: '$providerDetails.Email' },
          providerRating: { $first: '$providerDetails.Rating' },
          providerLocation: { $first: '$providerDetails.Location' },
          providerContact: { $first: '$providerDetails.ContactNumber' },
          providerPicture: { $first: '$providerDetails.ProfilePicture' },
          firebaseUID: { $first: '$providerDetails.FirebaseUID' },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$Price' },
          totalQuantity: { $first: '$listingDetails.Quantity' },
          totalDaysAvailable: { $first: '$listingDetails.DaysAvailable' },
          listingTitle: { $first: '$listingDetails.Title' }
        }
      },
      
      // Step 5: Sort by totalRevenue (descending order)
      {
        $sort: { totalRevenue: -1 },
      },
    ]);
    console.log(topProviders);
    // Check if we got any results
    if (topProviders.length === 0) {
      console.log("No bookings found, returning default top providers.");
      // If no bookings exist, we could define a fallback set of providers.
      const defaultProviders = await getDefaultProviders();
      console.log("Default providers:", defaultProviders);
      return res.json(defaultProviders);
    }

    // Return the top providers in the response
    res.json(topProviders);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

async function getDefaultProviders() {
  try {
    const providers = await mongoose.model('User').aggregate([
      {
        $match: { RoleType: 'Provider' },
      },
      {
        $lookup: {
          from: 'listings',
          localField: '_id',
          foreignField: 'ProviderID',
          as: 'listings',
        },
      },
      {
        $unwind: {
          path: '$listings',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$_id',
          providerName: { $first: '$Name' },
          providerEmail: { $first: '$Email' },
          providerRating: { $first: '$Rating' },
          providerLocation: { $first: '$listings.Location' },
          providerContact: { $first: '$ContactNumber' },
          providerPicture: { $first: '$ProfilePicture' },
          firebaseUID: { $first: '$FirebaseUID' },
          totalBookings: { $first: { $literal: 0 } },
          totalRevenue: { $first: { $literal: 0 } },
          totalQuantity: { $first: '$listings.Quantity' },
          totalDaysAvailable: { $first: '$listings.DaysAvailable' },
          listingTitle: { $first: '$listings.Title' }
        }
      },
      
      {
        $sort: { providerRating: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    return providers;
  } catch (err) {
    console.error("Error fetching default providers:", err);
    return [];
  }
}


module.exports = router;
