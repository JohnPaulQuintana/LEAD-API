const { scorePlace } = require("./scorePlace");

exports.enrichPlace = (place, intent) => {
  const scoring = scorePlace(place, intent);

  let lead_quality = "low";

  if (place.website || place.phone || place.rating >= 4) {
    lead_quality = "high";
  } else if (place.website || place.phone || place.rating >= 3) {
    lead_quality = "medium";
  }

  return {
    ...place,
    score: scoring.score,
    score_reasons: scoring.reasons,
    lead_quality,
  };
};