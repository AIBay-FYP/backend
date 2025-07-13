const NodeGeocoder = require('node-geocoder');

// Define custom fetch with User-Agent header
const options = {
  provider: 'openstreetmap',
  fetch: (url, opts) => {
    return fetch(url, {
      ...opts,
      headers: {
        ...opts.headers,
        'User-Agent': 'MyFYPApp/1.0 (aibay.site@gmail.com)' // <-- Replace with your real app name & email
      }
    });
  }
};

const geocoder = NodeGeocoder(options);

// Geocode location string → { lat, lon }
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

// Calculate distance between two coordinates (in km)
function getDistanceInKm(lat1, lon1, lat2, lon2) {
  const toRad = val => (val * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
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