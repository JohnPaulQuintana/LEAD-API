exports.smartFilter = (places, intent) => {
  switch (intent) {
    case "leads":
      return places;

    case "food":
      return places.filter((p) => p.rating >= 3.5);

    default:
      return places;
  }
};