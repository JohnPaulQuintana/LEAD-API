const express = require("express");
const router = express.Router();

const { getPlaceById } = require("../controllers/place.controller");

router.get("/:placeId", getPlaceById);

module.exports = router;