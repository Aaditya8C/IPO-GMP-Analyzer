const express = require("express");
const cors = require("cors");
const { getGmpDataForIpo } = require("./scrapper");

const app = express();
app.use(cors());

app.get("/gmp", async (req, res) => {
  const ipoName = req.query.ipo_name;
  if (!ipoName) {
    return res.status(400).json({ detail: "IPO name required" });
  }
  try {
    const data = await getGmpDataForIpo(ipoName);
    if (!data || !data.gmp_trend || !data.gmp_trend.length) {
      return res.status(404).json({ detail: "No GMP data found" });
    }
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ detail: e.message });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`API running at http://0.0.0.0:${PORT}`);
  });
}
