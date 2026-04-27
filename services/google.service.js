const axios = require("axios");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const GOOGLE_BASE = "https://maps.googleapis.com/maps/api/place";

async function searchPlaces(query, pageToken = null) {
  const url = `${GOOGLE_BASE}/textsearch/json`;

  const res = await axios.get(url, {
    params: {
      query,
      pagetoken: pageToken || undefined,
      key: API_KEY,
    },
  });

  return res.data;
}

async function getPlaceDetails(placeId) {
  const url = `${GOOGLE_BASE}/details/json`;

  const res = await axios.get(url, {
    params: {
      place_id: placeId,
      key: API_KEY,
      fields:
        "name,formatted_phone_number,website,formatted_address,geometry,rating,user_ratings_total,opening_hours,photos,reviews,types",
    },
  });

  return res.data;
}

module.exports = {
  searchPlaces,
  getPlaceDetails,
};