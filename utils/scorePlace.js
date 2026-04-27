const normalizeScore = (score) =>
  Math.min(100, Math.round(score * 10));

exports.scorePlace = (place, intent) => {
  let score = 0;
  const reasons = [];

  if (place.rating) {
    score += place.rating * 2;
    reasons.push("high rating");
  }

  if (place.user_ratings_total) {
    score += Math.log(place.user_ratings_total + 1);
    reasons.push("popular");
  }

  if (place.open_now) {
    score += 2;
    reasons.push("open now");
  }

  if (place.website) {
    score += 3;
    reasons.push("has website");
  }

  if (place.phone) {
    score += 2;
    reasons.push("has phone");
  }

  if (intent === "leads" && place.types.includes("real_estate_agency")) {
    score += 5;
    reasons.push("matches lead intent");
  }

  return {
    score: normalizeScore(score),
    reasons,
  };
};