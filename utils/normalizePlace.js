module.exports = function normalizePlace(place) {
  return {
    place_id: place.place_id,
    name: place.name,

    address: place.formatted_address,
    rating: place.rating,

    website: place.website || null,
    phone: place.formatted_phone_number || null,

    photo: place.photos?.[0]?.photo_reference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      : null,

    types: place.types || [],
    open_now: place.opening_hours?.open_now ?? null,

    reviews:
      place.reviews?.map((r) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.relative_time_description,
      })) || [],
  };
};