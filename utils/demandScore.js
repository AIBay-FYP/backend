const Listings = require("../models/Listings");

const actionWeights = {
  view: 0.5,
  addToCart: 1.5,
  bookingRequest: 3.0,
  completedBooking: 5.0,
  purchase: 8.0,
};

async function updateDemandScore(listingID, actionType) {
  if (!actionWeights[actionType]) return;

  try {
    await Listings.findByIdAndUpdate(
      listingID,
      { $inc: { DemandScore: actionWeights[actionType] } },
      { new: true }
    );
  } catch (error) {
    console.error(`Error updating demand score for ${listingID}:`, error);
  }
}

module.exports = { updateDemandScore };