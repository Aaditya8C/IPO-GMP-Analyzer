const express = require("express");
const cors = require("cors");
const {
  candidateUrls,
  pickFirstWorkingUrl,
  extractGmpHistory,
} = require("./scrapper");

const app = express();
app.use(cors());

app.get("/gmp", async (req, res) => {
  const ipoName = req.query.ipo_name;
  if (!ipoName) {
    return res.status(400).json({ detail: "IPO name required" });
  }
  const urls = candidateUrls(ipoName);
  const url = await pickFirstWorkingUrl(urls);
  if (!url) {
    return res.status(404).json({ detail: "GMP page not found" });
  }
  try {
    const df = await extractGmpHistory(url);
    if (!df || !df.length) {
      return res.status(404).json({ detail: "No GMP data found" });
    }
    const last5 = df.slice(-5).reverse();
    const gmpArray = last5.map((row) => ({
      date: row.Date,
      gmp: row.GMP,
    }));

    const latest = last5[1] || last5[0] || {};
    const baseIpoPrice = latest["IPO Price"] || null;
    const estListingPrice = latest["Estimated Listing Price"] || null;
    const estListingGains = latest["Estimated Listing Gains"] || null;

    return res.json({
      base_ipo_price: baseIpoPrice,
      estimated_listing_price: estListingPrice,
      estimated_listing_gains: estListingGains,
      gmp_trend: gmpArray,
    });
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
