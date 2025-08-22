const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
};

const UNIVEST_BASE = "https://univest.in/blogs";

function slugifyIpoName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function candidateUrls(ipoName) {
  const slug = slugifyIpoName(ipoName);
  return [
    `${UNIVEST_BASE}/${slug}-ipo-gmp-3`,
    `${UNIVEST_BASE}/${slug}-ipo-gmp-2`,
    `${UNIVEST_BASE}/${slug}-ipo-gmp`,
  ];
}

async function pickFirstWorkingUrl(urls) {
  for (const url of urls) {
    try {
      const r = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      if (r.status === 200 && r.data.includes("GMP")) {
        return url;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

function parseNumber(str) {
  if (!str) return null;
  return parseFloat(str.replace(/[₹,%]/g, "").replace(/,/g, ""));
}

function normalizeGmpTable(table) {
  // table: array of arrays (rows), first row is header
  if (!table || table.length < 2) return [];
  const header = table[0].map((h) => h.trim().toLowerCase());
  const colMap = {};
  header.forEach((cl, idx) => {
    if (cl.includes("gmp date") || cl === "date") colMap["Date"] = idx;
    else if (cl.includes("ipo price") || cl.includes("issue price"))
      colMap["IPO Price"] = idx;
    else if (cl === "gmp" || cl.includes("grey market premium"))
      colMap["GMP"] = idx;
    else if (cl.includes("estimated listing price"))
      colMap["Estimated Listing Price"] = idx;
    else if (
      cl.includes("estimated listing gains") ||
      cl.includes("listing gains") ||
      cl.includes("gain")
    )
      colMap["Estimated Listing Gains"] = idx;
  });

  const keep = [
    "Date",
    "IPO Price",
    "GMP",
    "Estimated Listing Price",
    "Estimated Listing Gains",
  ].filter((c) => colMap[c] !== undefined);

  const rows = [];
  for (let i = 1; i < table.length; i++) {
    const row = {};
    for (const col of keep) {
      let val = table[i][colMap[col]];
      if (col === "Date") {
        // Try to parse date as dd-mm-yyyy
        const d = val.replace(/\//g, "-");
        row[col] = d;
      } else if (
        ["IPO Price", "GMP", "Estimated Listing Price"].includes(col)
      ) {
        row[col] = parseNumber(val);
      } else if (col === "Estimated Listing Gains") {
        row[col] = parseNumber(val);
      }
    }
    rows.push(row);
  }
  // Sort by date ascending
  rows.sort(
    (a, b) =>
      new Date(a.Date.split("-").reverse().join("-")) -
      new Date(b.Date.split("-").reverse().join("-"))
  );
  return rows;
}

function fallbackParseFromText($) {
  const hdr = $("h2,h3")
    .filter((i, el) => $(el).text().includes("GMP Grey Market Premium"))
    .first();
  if (!hdr.length) return null;
  const textAll = hdr.parent().text();
  const rowPattern =
    /(\d{2}-\d{2}-\d{4})\s*₹?\s*([\d,]+(?:\.\d+)?)\s*₹?\s*([\d,]+(?:\.\d+)?)\s*₹?\s*([\d,]+(?:\.\d+)?)\s*([\d.]+)\s*%/g;
  const rows = [];
  let m;
  const seen = new Set();
  while ((m = rowPattern.exec(textAll))) {
    const [_, date_s, ipo_s, gmp_s, elp_s, gains_s] = m;
    if (seen.has(date_s)) continue;
    seen.add(date_s);
    rows.push({
      Date: date_s,
      "IPO Price": parseNumber(ipo_s),
      GMP: parseNumber(gmp_s),
      "Estimated Listing Price": parseNumber(elp_s),
      "Estimated Listing Gains": parseNumber(gains_s),
    });
  }
  rows.sort(
    (a, b) =>
      new Date(a.Date.split("-").reverse().join("-")) -
      new Date(b.Date.split("-").reverse().join("-"))
  );
  return rows.length ? rows : null;
}

async function extractGmpHistory(url) {
  const r = await axios.get(url, { headers: HEADERS, timeout: 20000 });
  const $ = cheerio.load(r.data);

  // Try to find tables
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

  for (const t of tableRows) {
    const ndf = normalizeGmpTable(t);
    if (ndf.length) return ndf;
  }

  // Fallback to regex parsing
  const fallback = fallbackParseFromText($);
  if (fallback && fallback.length) return fallback;

  throw new Error("No valid GMP table found.");
}

module.exports = {
  candidateUrls,
  pickFirstWorkingUrl,
  extractGmpHistory,
};
