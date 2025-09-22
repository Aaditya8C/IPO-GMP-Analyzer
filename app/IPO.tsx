"use client";
import React, { useEffect, useState } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import axios from "axios";

const IPO = () => {
  const [ipos, setIpos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [gmpData, setGmpData] = useState<{ [key: string]: any }>({});
  const [meta, setMeta] = useState<{ count?: number }>({});
  const [loading, setLoading] = useState(false);
  const IPO_ALERT_API = process.env.NEXT_PUBLIC_IPO_ALERTS_URL;
  const IPO_ALERTS_API_KEY = process.env.NEXT_PUBLIC_IPO_ALERTS_API_KEY;
  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!IPO_ALERT_API) {
    throw new Error(
      "NEXT_PUBLIC_IPO_ALERTS_URL is not set in the environment."
    );
  }
  if (!IPO_ALERTS_API_KEY) {
    throw new Error(
      "NEXT_PUBLIC_IPO_ALERTS_API_KEY is not set in the environment."
    );
  }
  if (!SERVER_URL) {
    throw new Error("NEXT_PUBLIC_SERVER_URL is not set in the environment.");
  }

  useEffect(() => {
    const fetchIpos = async () => {
      setLoading(true);
      try {
        // Mock Data
        // const response = {
        //   data: {
        //     meta: { count: 6, page: 1, totalPages: 6 },
        //     ipos: [
        //       {
        //         id: "2004384753",
        //         name: "Mangal Electrical Industries Ltd",
        //         about:
        //           "Patel Retail is a Maharashtra-based retail and food processing company...",
        //         issueSize: "242cr",
        //         minAmount: 14790,
        //         minQty: 58,
        //         priceRange: "237-255",
        //       },
        //     ],
        //   },
        // };
        const response = await axios.get(IPO_ALERT_API, {
          headers: {
            "x-api-key": IPO_ALERTS_API_KEY,
          },
          params: { status: "open", page },
        });
        setIpos(response.data.ipos || []);
        setMeta(response.data.meta || {});
        setGmpData({});
      } catch (error) {
        console.error("Error fetching IPO data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchIpos();
  }, [page]);

  useEffect(() => {
    const fetchGmpForIpos = async () => {
      const newGmpData: { [key: string]: any } = {};
      await Promise.all(
        ipos.map(async (ipo) => {
          try {
            const pureName = slugifyIpoName(ipo.name);
            const res = await axios.get(
              `${SERVER_URL}/gmp?ipo_name=${encodeURIComponent(
                // `http://localhost:8000/gmp?ipo_name=${encodeURIComponent(
                pureName
              )}`
            );
            // const res = {
            //   data: {
            //     base_ipo_price: 252,
            //     estimated_listing_price: 287,
            //     estimated_listing_gains: 13.89,
            //     gmp_trend: [
            //       { date: "17-08-2025", gmp: 26 },
            //       { date: "18-08-2025", gmp: 30 },
            //       { date: "19-08-2025", gmp: 30 },
            //       { date: "20-08-2025", gmp: 35 },
            //       { date: "21-08-2025", gmp: 35 },
            //     ],
            //   },
            // };
            newGmpData[ipo.name] = res.data;
          } catch (e) {
            newGmpData[ipo.name] = null;
          }
        })
      );
      setGmpData(newGmpData);
    };
    if (ipos.length > 0) fetchGmpForIpos();
  }, [ipos]);

  function slugifyIpoName(name: String) {
    // Remove common suffixes (case-insensitive)
    let s = name.replace(
      /\s+(Limited|Ltd|Industries|Corporation|Company|Enterprises|Private|Public)\s*$/i,
      ""
    );
    s = s.trim().toLowerCase();
    s = s.replace(/[^a-z0-9\s-]/g, "");
    s = s.replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
    return s;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-white text-center">
          IPO Analyzer
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-2 sm:px-4 py-6">
        <div className="w-full max-w-8xl bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6 text-center">
            Open IPOs
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* 📱 Mobile view - 2 column table */}
              <div className="sm:hidden overflow-x-auto">
                <table className="w-full border-collapse border rounded-lg text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-100 to-purple-100 text-gray-800">
                      <th className="px-3 py-2 text-left">Field</th>
                      <th className="px-3 py-2 text-left">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipos.map((ipo) => (
                      <React.Fragment key={ipo.id}>
                        <tr className="bg-gray-50">
                          <td className="border px-3 py-2 font-medium">Name</td>
                          <td className="border px-3 py-2">{ipo.name}</td>
                        </tr>
                        <tr>
                          <td className="border px-3 py-2 font-medium">
                            About
                          </td>
                          <td className="border px-3 py-2">{ipo.about}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border px-3 py-2 font-medium">
                            Issue Size
                          </td>
                          <td className="border px-3 py-2">{ipo.issueSize}</td>
                        </tr>
                        <tr>
                          <td className="border px-3 py-2 font-medium">
                            Min Amount
                          </td>
                          <td className="border px-3 py-2">₹{ipo.minAmount}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border px-3 py-2 font-medium">
                            Price Range
                          </td>
                          <td className="border px-3 py-2">{ipo.priceRange}</td>
                        </tr>
                        <tr>
                          <td className="border px-3 py-2 font-medium">
                            Est. Gains
                          </td>
                          <td className="border px-3 py-2">
                            {gmpData[ipo.name]?.estimated_listing_gains ?? "-"}%
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border px-3 py-2 font-medium">
                            GMP Trend
                          </td>
                          <td className="border px-3 py-2">
                            {gmpData[ipo.name]?.gmp_trend ? (
                              <div className="flex flex-col divide-y divide-gray-300">
                                {gmpData[ipo.name].gmp_trend.map(
                                  (gmp: any, idx: number, arr: any[]) => {
                                    let indicator = null;
                                    if (idx < arr.length - 1) {
                                      const prevGmp = arr[idx + 1].gmp;
                                      indicator =
                                        gmp.gmp > prevGmp ? (
                                          <ArrowUpIcon className="w-4 h-4 text-green-600 inline" />
                                        ) : gmp.gmp < prevGmp ? (
                                          <ArrowDownIcon className="w-4 h-4 text-red-600 inline" />
                                        ) : null;
                                    }
                                    return (
                                      <div key={idx} className="py-2">
                                        <p className="text-xs text-gray-500">
                                          {gmp.date}
                                        </p>
                                        <p className="text-sm font-medium text-gray-700">
                                          ₹{gmp.gmp} {indicator}
                                        </p>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">Loading...</span>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 💻 Desktop view - Full table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full border-collapse rounded-lg overflow-hidden text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-100 to-purple-100 text-gray-800">
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">About</th>
                      <th className="px-4 py-3">Issue Size</th>
                      <th className="px-4 py-3">Min Amount</th>
                      <th className="px-4 py-3">Min Qty</th>
                      <th className="px-4 py-3">Price Range</th>
                      {/* Subheaders for GMP Trend */}
                      <th className="px-4 py-3 text-center" colSpan={5}>
                        GMP Trend
                      </th>
                      <th className="px-4 py-3">Base IPO Price</th>
                      <th className="px-4 py-3">Est. Listing Price</th>
                      <th className="px-4 py-3">Est. Gains</th>
                    </tr>
                    {/* Subheader row for GMP dates */}
                    <tr className="bg-gray-50 text-gray-600 text-xs">
                      <th colSpan={6}></th>
                      {gmpData[ipos[0]?.name]?.gmp_trend?.map(
                        (gmp: any, idx: number) => (
                          <th key={idx} className="px-2 py-1 text-center">
                            {gmp.date}
                          </th>
                        )
                      )}
                      <th colSpan={3}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipos.map((ipo) => (
                      <tr
                        key={ipo.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition"
                      >
                        <td className="px-4 py-3 font-medium">{ipo.name}</td>
                        <td className="px-4 py-3 text-gray-600">{ipo.about}</td>
                        <td className="px-4 py-3 text-center">
                          {ipo.issueSize}
                        </td>
                        <td className="px-4 py-3 text-center">
                          ₹{ipo.minAmount}
                        </td>
                        <td className="px-4 py-3 text-center">{ipo.minQty}</td>
                        <td className="px-4 py-3 text-center">
                          {ipo.priceRange}
                        </td>

                        {/* Horizontal GMP trend values under date headers */}
                        {gmpData[ipo.name]?.gmp_trend?.map(
                          (gmp: any, idx: number, arr: any[]) => {
                            let indicator = null;
                            if (idx < arr.length - 1) {
                              const prevGmp = arr[idx + 1].gmp;
                              indicator =
                                gmp.gmp > prevGmp ? (
                                  <ArrowUpIcon className="w-4 h-4 text-green-600 inline" />
                                ) : gmp.gmp < prevGmp ? (
                                  <ArrowDownIcon className="w-4 h-4 text-red-600 inline" />
                                ) : null;
                            }
                            return (
                              <td key={idx} className="px-2 py-3 text-center">
                                ₹{gmp.gmp} {indicator}
                              </td>
                            );
                          }
                        )}

                        <td className="px-4 py-3 text-center">
                          {gmpData[ipo.name]?.base_ipo_price ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {gmpData[ipo.name]?.estimated_listing_price ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {gmpData[ipo.name]?.estimated_listing_gains ?? "-"}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="flex justify-center items-center mt-6 gap-4 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {page} {meta.count ? `/ ${meta.count}` : ""}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || (meta.count ? page >= meta.count : false)}
              className="px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default IPO;
