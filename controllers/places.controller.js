const cache = require("../cache/memoryCache");
const normalizePlace = require("../utils/normalizePlace");
const { searchPlaces } = require("../services/google.service");
const { wait } = require("../utils/wait");
const debug = require("../config/debug");

const { parseIntent } = require("../utils/intentParser");
const { smartFilter } = require("../utils/smartFilter");
const { enrichPlace } = require("../utils/enrichPlace");

exports.getPlaces = async (req, res) => {
  try {
    const {
      q = "real estate",
      page,
      minRating,
      openNow,
      type,
      mode,
      limit,
      debug: debugMode,
    } = req.query;

    // 🧠 1. Detect intent
    const intent = parseIntent(q);

    debug.totalRequests++;

    // 🧠 Cache key (complete)
    const cacheKey = `places:${q}:${intent}:${page || "first"}:${minRating || 0}:${openNow || "all"}:${type || "all"}:${mode || "all"}:${limit || "all"}`;

    if (cache.has(cacheKey)) {
      debug.cacheHits++;
      return res.json(cache.get(cacheKey));
    }

    debug.apiCalls++;

    // ⏳ Google pagination delay
    if (page) await wait(2000);

    const data = await searchPlaces(q, page);

    // 🔄 2. Normalize
    let results = (data?.results || []).map(normalizePlace);

    // ⚙️ 3. Basic filters
    if (minRating) {
      results = results.filter((p) => p.rating >= Number(minRating));
    }

    if (openNow === "true") {
      results = results.filter((p) => p.open_now === true);
    }

    if (type) {
      results = results.filter((p) => p.types.includes(type));
    }

    // 🧠 4. Smart filter
    results = smartFilter(results, intent);

    // ⭐ 5. Enrich (score + lead quality)
    results = results.map((place) => enrichPlace(place, intent));

    // 🎯 6. Mode filtering
    if (mode === "leads_only") {
      // only boost ranking, do NOT filter
      results = results.map((p) => ({
        ...p,
        lead_boost: p.lead_quality === "high" ? 20 : 0,
      }));
    }

    // 📊 7. Smart sorting (score + popularity)
    results.sort((a, b) => {
      const scoreA = a.score + (a.lead_boost || 0);
      const scoreB = b.score + (b.lead_boost || 0);

      if (scoreB !== scoreA) return scoreB - scoreA;

      return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
    });

    // 🔢 8. Limit results
    const finalLimit = Number(limit) || 20;
    results = results.slice(0, finalLimit);

    // 📦 9. Response
    const response = {
      intent,
      results,

      nextPageToken: data?.next_page_token || null,
      hasMore: !!data?.next_page_token,

      meta: {
        query: q,
        ranking: "custom-score-v1",
        resultCount: results.length,
        generatedAt: new Date().toISOString(),
      },
    };

    // 🐞 Optional debug info
    if (debugMode === "true") {
      response.debug = {
        totalRequests: debug.totalRequests,
        cacheHits: debug.cacheHits,
        apiCalls: debug.apiCalls,
      };
    }

    // 💾 Cache result
    cache.set(cacheKey, response);

    res.json(response);
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "Failed to fetch places" });
  }
};
