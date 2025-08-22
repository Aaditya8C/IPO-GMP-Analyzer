"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

const IPO = () => {
  const [ipos, setIpos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [gmpData, setGmpData] = useState<{ [key: string]: any }>({});
  const [meta, setMeta] = useState<{ count?: number }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchIpos = async () => {
      setLoading(true);
      try {
        // Uncomment for real API
        const response = await axios.get("https://api.ipoalerts.in/ipos", {
          headers: {
            "x-api-key":
              "913bcfa6f2e3427c598fe4e965451dfaa7995919eb7c93f70f87bc0b5aa4cf67",
          },
          params: { status: "open", page },
        });
        // setIpos(response.data.ipos || []);
        // setMeta(response.data.meta || {});

        // Mock data for development
        // const response = {
        //   data: {
        //     meta: {
        //       count: 6,
        //       countOnPage: 1,
        //       totalPages: 6,
        //       page: 1,
        //       limit: 1,
        //     },
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
        setIpos(response.data.ipos || []);
        setMeta(response.data.meta || {});
        setGmpData({}); // Reset GMP data on page change
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
            // Remove " Limited" or " Ltd" from the end of the name
            const pureName = slugifyIpoName(ipo.name);
            const res = await axios.get(
              `https://ipo-gmp-analyzer.onrender.com/gmp?ipo_name=${encodeURIComponent(
                // `http://localhost:8000/gmp?ipo_name=${encodeURIComponent(
                pureName
              )}`
            );
            newGmpData[ipo.name] = res.data;
          } catch (e) {
            newGmpData[ipo.name] = null;
          }
        })
      );
      setGmpData(newGmpData);
    };

    if (ipos.length > 0) {
      fetchGmpForIpos();
    }
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

  const handleNext = () => {
    if (meta.count && page < meta.count) setPage(page + 1);
  };

  const handlePrev = () => {
    if (page > 1) setPage(page - 1);
  };

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        IPO List
      </Typography>
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="30vh"
        >
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2}>Name</TableCell>
                <TableCell rowSpan={2}>About</TableCell>
                <TableCell rowSpan={2}>Issue Size</TableCell>
                <TableCell rowSpan={2}>Min Amount</TableCell>
                <TableCell rowSpan={2}>Min Qty</TableCell>
                <TableCell rowSpan={2}>Price Range</TableCell>
                <TableCell colSpan={5} align="center">
                  GMP (Last 5 Days)
                </TableCell>
                <TableCell rowSpan={2}>Base IPO Price</TableCell>
                <TableCell rowSpan={2}>Est. Listing Price</TableCell>
                <TableCell rowSpan={2}>Est. Listing Gains</TableCell>
              </TableRow>
              <TableRow>
                {/* Subheader for GMP dates */}
                {(() => {
                  // Find the first IPO with GMP data
                  const firstGmp =
                    ipos.length > 0
                      ? gmpData[ipos[0].name]?.gmp_trend || []
                      : [];
                  return firstGmp.map((gmp: any, idx: number) => (
                    <TableCell key={idx} align="center">
                      {gmp.date}
                    </TableCell>
                  ));
                })()}
              </TableRow>
            </TableHead>
            <TableBody>
              {ipos.length > 0 ? (
                ipos.map((ipo) => (
                  <TableRow key={ipo.id}>
                    <TableCell>{ipo.name}</TableCell>
                    <TableCell>{ipo.about}</TableCell>
                    <TableCell>{ipo.issueSize}</TableCell>
                    <TableCell>{ipo.minAmount}</TableCell>
                    <TableCell>{ipo.minQty}</TableCell>
                    <TableCell>{ipo.priceRange}</TableCell>
                    {/* GMP values for each date */}
                    {gmpData[ipo.name]?.gmp_trend
                      ? gmpData[ipo.name].gmp_trend.map(
                          (gmp: any, idx: number, arr: any[]) => {
                            // Compare with previous day's GMP
                            let indicator = null;
                            if (idx < arr.length - 1) {
                              const prevGmp = arr[idx + 1].gmp;
                              if (gmp.gmp > prevGmp) {
                                indicator = (
                                  <ArrowDropUpIcon
                                    color="success"
                                    fontSize="medium"
                                  />
                                );
                              } else if (gmp.gmp < prevGmp) {
                                indicator = (
                                  <ArrowDropDownIcon
                                    color="error"
                                    fontSize="medium"
                                  />
                                );
                              }
                            }
                            return (
                              <TableCell key={idx} align="center">
                                ₹{gmp.gmp}
                                {indicator}
                              </TableCell>
                            );
                          }
                        )
                      : [...Array(5)].map((_, idx) => (
                          <TableCell key={idx} align="center">
                            {gmpData[ipo.name] === null ? (
                              <Typography variant="body2" color="textSecondary">
                                No Data
                              </Typography>
                            ) : (
                              <CircularProgress size={16} />
                            )}
                          </TableCell>
                        ))}
                    <TableCell>
                      {gmpData[ipo.name]?.base_ipo_price ?? "-"}
                    </TableCell>
                    <TableCell>
                      {gmpData[ipo.name]?.estimated_listing_price ?? "-"}
                    </TableCell>
                    <TableCell>
                      {gmpData[ipo.name]?.estimated_listing_gains ?? "-"}%
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    No IPO data found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        mt={2}
        gap={2}
      >
        <Button
          variant="contained"
          onClick={handlePrev}
          disabled={page === 1 || loading}
        >
          Previous
        </Button>
        <Typography>
          Page {page} {meta.count ? `/ ${meta.count}` : ""}
        </Typography>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading || (meta.count ? page >= meta.count : false)}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default IPO;
