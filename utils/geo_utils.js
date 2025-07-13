// utils/geo_utils.js
require('dotenv').config();  

const NodeGeocoder = require('node-geocoder');

const options = {
  provider: 'locationiq',
  apiKey: process.env.LOCATIONIQ_API_KEY,
  formatter: null
};

const geocoder = NodeGeocoder(options);

// Geocode location string → { latitude, longitude }
async function geocodeLocation(location) {
  try {
    const res = await geocoder.geocode(location);
    if (res.length > 0) {
      return { lat: res[0].latitude, lon: res[0].longitude };
    }
    return null;
  } catch (err) {
    console.error("❌ Geocoding error:", err);
    return null;
  }
}

// Calculate distance between two coords (in km)
function getDistanceInKm(lat1, lon1, lat2, lon2) {
  const toRad = val => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { geocodeLocation, getDistanceInKm };