// 2a5561f7bb31f0cd4f711e45a1b875a14a33d6ab8fde15d3c44dcb9bb822edb6
const axios = require("axios");
const cheerio = require("cheerio");

require("dotenv").config();

const SERP_URL = process.env.SERP_URL;
const SERP_API_KEY = process.env.SERP_API_KEY;
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
};

// 🔹 Step 1: Search Univest blog via SerpAPI
async function searchUnivestUrl(ipoName) {
  // Debug: Log the IPO name and query URL
  console.log("[DEBUG] searchUnivestUrl called with ipoName:", ipoName);
  const query = `${ipoName} ipo gmp univest`;
  const url = `${SERP_URL}?q=${encodeURIComponent(
    query
  )}&engine=google&location=India&hl=hi&gl=in&api_key=${SERP_API_KEY}`;

  try {
    const res = await axios.get(url);
    const results = res.data.organic_results || [];
    // Debug: Log the number of results found
    console.log("[DEBUG] SERP API results count:", results.length);
    const univestLink = results
      .map((r) => r.link)
      .find(
        (link) =>
          link.includes("univest.in/blogs") || link.includes("univest.in/ipo")
      );
    // Debug: Log the found Univest link
    console.log("[DEBUG] Univest link found:", univestLink);
    return univestLink || null;
  } catch (err) {
    // Debug: Log error from SERP API
    console.error("[ERROR] searchUnivestUrl axios error:", err);
    return null;
  }
}

// 🔹 Utils
function parseNumber(str) {
  if (!str) return null;
  return parseFloat(str.replace(/[₹,%]/g, "").replace(/,/g, ""));
}

function normalizeGmpTable(table) {
  // Debug: Log the table received for normalization
  console.log("[DEBUG] normalizeGmpTable input table:", table && table.length);
  if (!table || table.length < 2) return [];
  const header = table[0].map((h) => h.trim().toLowerCase());
  const colMap = {};
  header.forEach((cl, idx) => {
    if (cl.includes("date")) colMap["Date"] = idx;
    else if (cl.includes("ipo price")) colMap["IPO Price"] = idx;
    else if (cl.includes("gmp")) colMap["GMP"] = idx;
    else if (cl.includes("estimated listing price"))
      colMap["Estimated Listing Price"] = idx;
    else if (cl.includes("listing gains"))
      colMap["Estimated Listing Gains"] = idx;
  });

  const rows = [];
  for (let i = 1; i < table.length; i++) {
    const row = {};
    for (const col in colMap) {
      let val = table[i][colMap[col]];
      if (col === "Date") {
        const d = val.replace(/\//g, "-");
        row[col] = d;
      } else {
        row[col] = parseNumber(val);
      }
    }
    rows.push(row);
  }

  rows.sort(
    (a, b) =>
      new Date(a.Date.split("-").reverse().join("-")) -
      new Date(b.Date.split("-").reverse().join("-"))
  );
  // Debug: Log normalized rows
  console.log("[DEBUG] normalizeGmpTable output rows:", rows.length);
  return rows;
}

// 🔹 Extract GMP history
async function extractGmpHistory(url) {
  // Debug: Log the URL being scraped
  console.log("[DEBUG] extractGmpHistory called with url:", url);
  try {
    const r = await axios.get(url, { headers: HEADERS });
    const $ = cheerio.load(r.data);

    let tableRows = [];
    $("table").each((i, table) => {
      const rows = [];
      $(table)
        .find("tr")
        .each((j, tr) => {
          const cols = [];
          $(tr)
            .find("th,td")
            .each((k, td) => {
              cols.push($(td).text().trim());
            });
          if (cols.length) rows.push(cols);
        });
      if (rows.length > 1) tableRows.push(rows);
    });

    // Debug: Log number of tables found
    console.log("[DEBUG] extractGmpHistory tables found:", tableRows.length);

    for (const t of tableRows) {
      const ndf = normalizeGmpTable(t);
      if (ndf.length) {
        // Debug: Log if a valid table is found
        console.log("[DEBUG] Valid GMP table found with rows:", ndf.length);
        return ndf;
      }
    }

    throw new Error("No valid GMP table found.");
  } catch (err) {
    // Debug: Log error during extraction
    console.error("[ERROR] extractGmpHistory error:", err);
    throw err;
  }
}

// 🔹 Final restructuring
function parseDMY(dateStr) {
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day); // JS Date: month is 0-based
}

function restructureData(gmpData) {
  // Debug: Log input GMP data length
  console.log(
    "[DEBUG] restructureData input length:",
    gmpData && gmpData.length
  );
  if (!gmpData || !gmpData.length) return null;

  // Keep only last 5 entries
  const lastFive = gmpData.slice(-5);

  // Sort descending by parsed date (latest first)
  const sorted = lastFive.sort(
    (a, b) => parseDMY(b["Date"]) - parseDMY(a["Date"])
  );

  const latest = sorted[0];

  return {
    base_ipo_price: latest["IPO Price"] || null,
    estimated_listing_price: latest["Estimated Listing Price"] || null,
    estimated_listing_gains: latest["Estimated Listing Gains"] || null,
    gmp_trend: sorted.map((row) => ({
      date: row["Date"],
      gmp: row["GMP"],
    })),
  };
}

// 🔹 Orchestrator
// (async () => {
//   const ipoName = "Patel Retail"; // Example IPO

//   const url = await searchUnivestUrl(ipoName);
//   if (!url) {
//     console.error("No Univest URL found for:", ipoName);
//     return;
//   }

//   console.log("✅ Found Univest URL:", url);

//   const gmpData = await extractGmpHistory(url);
//   const structured = restructureData(gmpData);

//   console.log("📊 Final Output:", JSON.stringify(structured, null, 2));
// })();

async function getGmpDataForIpo(ipoName) {
  // Debug: Log function entry
  console.log("[DEBUG] getGmpDataForIpo called with:", ipoName);
  const url = await searchUnivestUrl(ipoName);
  if (!url) {
    console.error("[ERROR] No Univest URL found for:", ipoName);
    throw new Error("No Univest URL found for: " + ipoName);
  }
  const gmpData = await extractGmpHistory(url);
  const result = restructureData(gmpData);
  // Debug: Log the final result
  console.log("[DEBUG] getGmpDataForIpo result:", result);
  return result;
}

module.exports = { getGmpDataForIpo };
