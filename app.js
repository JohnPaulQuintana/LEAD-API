const express = require("express");
const cors = require("cors");

const placesRoutes = require("./routes/places.routes");
const placeRoutes = require("./routes/place.routes");
const imageProxy = require("./routes/image.routes");

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/places", placesRoutes);
app.use("/place", placeRoutes);
app.use("/proxy", imageProxy);
module.exports = app;