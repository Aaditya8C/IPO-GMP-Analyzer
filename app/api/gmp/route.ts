import axios from "axios";
import { load } from "cheerio";
import { NextRequest } from "next/server";

const SERP_URL = process.env.SERP_URL;
const SERP_API_KEY = process.env.SERP_API_KEY;
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
};

async function searchUnivestUrl(ipoName: string): Promise<string | null> {
  const query = `${ipoName} ipo gmp univest`;
  const url = `${SERP_URL}?q=${encodeURIComponent(
    query
  )}&engine=google&location=India&hl=hi&gl=in&api_key=${SERP_API_KEY}`;
  try {
    const res = await axios.get(url);
    const results = res.data.organic_results || [];
    const univestLink = results
      .map((r: any) => r.link)
      .find(
        (link: string) =>
          link.includes("univest.in/blogs") || link.includes("univest.in/ipo")
      );
    return univestLink || null;
  } catch (err) {
    return null;
  }
}

function parseNumber(str: string): number | null {
  if (!str) return null;
  return parseFloat(str.replace(/[₹,%]/g, "").replace(/,/g, ""));
}

function normalizeGmpTable(table: string[][]): any[] {
  if (!table || table.length < 2) return [];
  const header = table[0].map((h) => h.trim().toLowerCase());
  const colMap: { [key: string]: number } = {};
  header.forEach((cl, idx) => {
    if (cl.includes("date")) colMap["Date"] = idx;
    else if (cl.includes("ipo price")) colMap["IPO Price"] = idx;
    else if (cl.includes("gmp")) colMap["GMP"] = idx;
    else if (cl.includes("estimated listing price"))
      colMap["Estimated Listing Price"] = idx;
    else if (cl.includes("listing gains"))
      colMap["Estimated Listing Gains"] = idx;
  });

  const rows: any[] = [];
  for (let i = 1; i < table.length; i++) {
    const row: any = {};
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

  rows.sort((a, b) => parseDMY(a.Date).getTime() - parseDMY(b.Date).getTime());
  return rows;
}

async function extractGmpHistory(url: string): Promise<any[]> {
  try {
    const r = await axios.get(url, { headers: HEADERS });
    const $ = load(r.data);

    let tableRows: string[][][] = [];
    $("table").each((i: any, table: any) => {
      const rows: string[][] = [];
      $(table)
        .find("tr")
        .each((j: any, tr: any) => {
          const cols: string[] = [];
          $(tr)
            .find("th,td")
            .each((k: any, td: any) => {
              cols.push($(td).text().trim());
            });
          if (cols.length) rows.push(cols);
        });
      if (rows.length > 1) tableRows.push(rows);
    });

    for (const t of tableRows) {
      const ndf = normalizeGmpTable(t);
      if (ndf.length) {
        return ndf;
      }
    }

    throw new Error("No valid GMP table found.");
  } catch (err) {
    throw err;
  }
}

function parseDMY(dateStr: string): Date {
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function restructureData(gmpData: any[]): any {
  if (!gmpData || !gmpData.length) return null;
  const lastFive = gmpData.slice(-5);
  const sorted = lastFive.sort(
    (a: any, b: any) =>
      parseDMY(b["Date"]).getTime() - parseDMY(a["Date"]).getTime()
  );
  const latest = sorted[0];
  return {
    base_ipo_price: latest["IPO Price"] || null,
    estimated_listing_price: latest["Estimated Listing Price"] || null,
    estimated_listing_gains: latest["Estimated Listing Gains"] || null,
    gmp_trend: sorted.map((row: any) => ({
      date: row["Date"],
      gmp: row["GMP"],
    })),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ipoName = searchParams.get("ipo_name");
  if (!ipoName) {
    return new Response(JSON.stringify({ detail: "IPO name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const url = await searchUnivestUrl(ipoName);
    if (!url) {
      return new Response(JSON.stringify({ detail: "No Univest URL found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const gmpData = await extractGmpHistory(url);
    const result = restructureData(gmpData);
    if (!result || !result.gmp_trend || !result.gmp_trend.length) {
      return new Response(JSON.stringify({ detail: "No GMP data found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ detail: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
