// listingCache.js
const Listing = require("./models/Listings");
const { geocodeLocation } = require('./utils/geo_utils');

const listingCoordsCache = {}; // shared object

async function initializeListingCoordsCache() {
  try {
    console.log("🔄 Initializing listing geo-coordinates cache...");
    const listings = await Listing.find({});
    for (const listing of listings) {
      if (listing.Location) {
        const coords = await geocodeLocation(listing.Location);
        if (coords) {
          listingCoordsCache[listing._id.toString()] = coords;
        }
      }
    }
    console.log(`✅ Cache initialized! Cached listings: ${Object.keys(listingCoordsCache).length}`);
  } catch (err) {
    console.error("❌ Error initializing cache:", err);
  }
}

module.exports = {
  listingCoordsCache,
  initializeListingCoordsCache
};