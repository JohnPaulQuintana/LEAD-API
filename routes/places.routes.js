const express = require("express");
const router = express.Router();

const { getPlaces } = require("../controllers/places.controller");

router.get("/", getPlaces);

module.exports = router;