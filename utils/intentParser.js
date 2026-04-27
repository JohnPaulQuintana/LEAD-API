const INTENTS = {
  leads: ["real estate", "agency", "broker"],
  food: ["restaurant", "cafe", "milk tea"],
  services: ["repair", "cleaning", "salon"],
};

exports.parseIntent = (query) => {
  const q = query.toLowerCase();

  for (const [intent, keywords] of Object.entries(INTENTS)) {
    if (keywords.some((k) => q.includes(k))) {
      return intent;
    }
  }

  return "generic";
};