const NodeCache = require("node-cache");

// cache TTL: 10 minutes
const cache = new NodeCache({ stdTTL: 600 });

module.exports = cache;