exports.mediaProxy = async (req, res) => {
  try {
    const url = req.query.url;

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    res.set("Content-Type", "image/jpeg");
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send("Image load failed");
  }
};
