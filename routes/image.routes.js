const express = require("express");
const router = express.Router();

const { mediaProxy } = require("../controllers/image.proxy.controller");

router.get("/image-proxy", mediaProxy);

module.exports = router;