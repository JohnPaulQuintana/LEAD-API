const cache = require("../cache/memoryCache");
const { getPlaceDetails } = require("../services/google.service");

exports.getPlaceById = async (req, res) => {
  try {
    const { placeId } = req.params;

    const cacheKey = `place:${placeId}`;

    if (cache.has(cacheKey)) {
      return res.json({ result: cache.get(cacheKey) });
    }

    const data = await getPlaceDetails(placeId);
    const raw = data?.result;

    if (!raw) {
      return res.status(404).json({ error: "Place not found" });
    }

    const result = {
      place_id: raw.place_id,
      name: raw.name,
      address: raw.formatted_address || null,
      rating: raw.rating || 0,
      user_ratings_total: raw.user_ratings_total || 0,
      // CONTACT INFO
      website: raw.website || null,
      phone: raw.formatted_phone_number || null,
      // LOCATION
      location: raw.geometry?.location
        ? {
            lat: raw.geometry.location.lat,
            lng: raw.geometry.location.lng,
          }
        : null,
      // PHOTO
      photo: raw.photos?.length
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${raw.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        : null,
      // TYPES
      types: raw.types || [],
      opening_hours: raw.opening_hours
        ? {
            open_now: raw.opening_hours.open_now ?? null,
            weekday_text: raw.opening_hours.weekday_text || [],
          }
        : null,
      // REVIEWS (IMPORTANT ADDITION)
      reviews:
        raw.reviews?.map((r) => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text,
          time: r.relative_time_description,
          profile_photo: r.profile_photo_url || null,
        })) || [],
    };

    // const result = {
    //   place_id: raw.place_id,
    //   name: raw.name,
    //   address: raw.formatted_address || null,
    //   rating: raw.rating || 0,
    //   website: raw.website || null,
    //   phone: raw.formatted_phone_number || null,
    // };

    cache.set(cacheKey, result);

    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch place details" });
  }
};