require("dotenv").config();
const express = require("express");
const cors = require("cors");

const cache = require("./cache/memoryCache");
const normalizePlace = require("./utils/normalizePlace");
const { searchPlaces, getPlaceDetails } = require("./services/google.service");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

/**
 * =========================
 * DEBUG TRACKER
 * =========================
 */
const paginationDebug = {
  totalRequests: 0,
  cacheHits: 0,
  apiCalls: 0,
  pages: {},
};

/**
 * Small helper (IMPORTANT for Google pagination)
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * =========================
 * GET PLACES (PAGINATED)
 * =========================
 */
app.get("/places", async (req, res) => {
  try {
    const {
      q = "real estate pampanga",
      page,
      minRating,
      openNow,
      type,
    } = req.query;

    paginationDebug.totalRequests++;

    const cacheKey = `places:${q}:${page || "first"}`;

    console.log("\n==============================");
    console.log("📥 NEW REQUEST");
    console.log("Query:", q);
    console.log("Page token:", page || "FIRST PAGE");
    console.log("Cache Key:", cacheKey);

    /**
     * =========================
     * CACHE CHECK
     * =========================
     */
    if (cache.has(cacheKey)) {
      paginationDebug.cacheHits++;

      const cached = cache.get(cacheKey);

      console.log("⚡ CACHE HIT");
      console.log("📦 Results:", cached.results.length);
      console.log("➡️ Next page token:", cached.nextPageToken);

      return res.json(cached);
    }

    console.log("❌ CACHE MISS → calling Google API");

    paginationDebug.apiCalls++;

    /**
     * =========================
     * GOOGLE PAGINATION FIX
     * (IMPORTANT: delay required)
     * =========================
     */
    if (page) {
      console.log("⏳ Waiting for Google next_page_token...");
      await wait(2000);
    }

    /**
     * =========================
     * FETCH GOOGLE DATA
     * =========================
     */
    const data = await searchPlaces(q, page);
    console.log(data);
    console.log("DATA EXISTS:", !!data);
    console.log("RESULT COUNT:", data?.results?.length || 0);

    let results = data?.results || [];

    console.log("🌐 RAW GOOGLE RESULTS:", results.length);
    console.log("🔑 Next page token:", data.next_page_token || "NONE");

    /**
     * =========================
     * NORMALIZE DATA
     * =========================
     */
    results = results.map(normalizePlace);

    /**
     * =========================
     * FILTERS
     * =========================
     */
    if (minRating) {
      results = results.filter((p) => p.rating >= Number(minRating));
    }

    if (openNow === "true") {
      results = results.filter((p) => p.open_now === true);
    }

    if (type) {
      results = results.filter((p) => p.types.includes(type));
    }

    /**
     * =========================
     * TRACK PAGINATION DEBUG
     * =========================
     */
    if (!paginationDebug.pages[q]) {
      paginationDebug.pages[q] = [];
    }

    paginationDebug.pages[q].push({
      page: page || "first",
      count: results.length,
    });

    console.log("📊 FINAL RESULTS AFTER FILTER:", results.length);

    /**
     * =========================
     * FINAL RESPONSE FORMAT
     * (FRONTEND FRIENDLY)
     * =========================
     */
    const response = {
      results,
      nextPageToken: data.next_page_token || null,
      hasMore: !!data.next_page_token,

      meta: {
        query: q,
        pageToken: page || null,
        resultCount: results.length,
        source: page ? "pagination" : "first-page",
      },
    };

    /**
     * =========================
     * SAVE CACHE
     * =========================
     */
    cache.set(cacheKey, response);

    res.json(response);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

app.get("/place/:placeId", async (req, res) => {
  const startTime = Date.now();

  try {
    const { placeId } = req.params;

    const cacheKey = `place:${placeId}`;

    console.log("\n==============================");
    console.log("📥 PLACE DETAILS REQUEST");
    console.log("🆔 Place ID:", placeId);

    // 1. CACHE CHECK
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);

      console.log("⚡ CACHE HIT");
      console.log("⏱️ Response time:", `${Date.now() - startTime}ms`);

      return res.json({ result: cached });
    }

    console.log("❌ CACHE MISS → calling Google API");

    // 2. API CALL
    const apiStart = Date.now();
    const data = await getPlaceDetails(placeId);
    console.log("⏱️ API call time:", `${Date.now() - apiStart}ms`);

    const raw = data?.result;
    console.log(raw);
    console.log("📦 RAW RESULT EXISTS:", !!raw);

    if (!raw) {
      return res.status(404).json({ error: "Place not found" });
    }

    // 3. EXTRACT + NORMALIZE DATA
    const result = {
      place_id: raw.place_id,
      name: raw.name,

      address: raw.formatted_address || null,
      rating: raw.rating || 0,
      user_ratings_total: raw.user_ratings_total || 0,

      // 🌐 CONTACT INFO
      website: raw.website || null,
      phone: raw.formatted_phone_number || null,

      // 📍 LOCATION
      location: raw.geometry?.location
        ? {
            lat: raw.geometry.location.lat,
            lng: raw.geometry.location.lng,
          }
        : null,

      // 🖼️ PHOTO
      photo: raw.photos?.length
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${raw.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        : null,

      // 🏷️ TYPES
      types: raw.types || [],

      opening_hours: raw.opening_hours
        ? {
            open_now: raw.opening_hours.open_now ?? null,
            weekday_text: raw.opening_hours.weekday_text || [],
          }
        : null,

      // ⭐ REVIEWS (IMPORTANT ADDITION)
      reviews:
        raw.reviews?.map((r) => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text,
          time: r.relative_time_description,
          profile_photo: r.profile_photo_url || null,
        })) || [],
    };

    console.log("🔧 NORMALIZED DATA:");
    console.log({
      name: result.name,
      website: result.website,
      phone: result.phone,
      reviews: result.reviews.length,
    });

    // 4. CACHE STORE
    cache.set(cacheKey, result);

    console.log("💾 Cached successfully");
    console.log("⏱️ Total time:", `${Date.now() - startTime}ms`);
    console.log("==============================\n");

    res.json({ result });
  } catch (err) {
    console.error("❌ ERROR in /place/:placeId");
    console.error(err.message);
    console.error(err.stack);

    res.status(500).json({ error: "Failed to fetch place details" });
  }
});

/**
 * =========================
 * Image Proxy
 * =========================
 */
app.get("/image-proxy", async (req, res) => {
  try {
    const url = req.query.url;

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    res.set("Content-Type", "image/jpeg");
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send("Image load failed");
  }
});

/**
 * =========================
 * DEBUG ENDPOINT
 * =========================
 */
app.get("/debug/pagination", (req, res) => {
  res.json(paginationDebug);
});

/**
 * =========================
 * START SERVER
 * =========================
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
