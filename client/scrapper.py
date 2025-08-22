import re
import sys
from datetime import datetime
from typing import List, Optional

import pandas as pd
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/127.0.0.0 Safari/537.36"
}

UNIVEST_BASE = "https://univest.in/blogs"


def slugify_ipo_name(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s


def candidate_urls(ipo_name: str) -> List[str]:
    slug = slugify_ipo_name(ipo_name)
    return [
        f"{UNIVEST_BASE}/{slug}-ipo-gmp-3",
        f"{UNIVEST_BASE}/{slug}-ipo-gmp-2",
        f"{UNIVEST_BASE}/{slug}-ipo-gmp",
    ]


def pick_first_working_url(urls: List[str]) -> Optional[str]:
    for url in urls:
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code == 200 and "GMP" in r.text:
                return url
        except requests.RequestException:
            continue
    return None


def normalize_gmp_table(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {}
    for col in df.columns:
        cl = str(col).strip().lower()
        if "gmp date" in cl or cl == "date":
            rename_map[col] = "Date"
        elif "ipo price" in cl or "issue price" in cl:
            rename_map[col] = "IPO Price"
        elif "gmp" == cl or "grey market premium" in cl:
            rename_map[col] = "GMP"
        elif "estimated listing price" in cl:
            rename_map[col] = "Estimated Listing Price"
        elif "estimated listing gains" in cl or "listing gains" in cl or "gain" in cl:
            rename_map[col] = "Estimated Listing Gains"
    df = df.rename(columns=rename_map)
    keep = [
        c
        for c in [
            "Date",
            "IPO Price",
            "GMP",
            "Estimated Listing Price",
            "Estimated Listing Gains",
        ]
        if c in df.columns
    ]
    df = df[keep].copy()
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(
            df["Date"].astype(str).str.replace("/", "-"),
            dayfirst=True,
            format="%d-%m-%Y",
            errors="coerce",
        )
    for col in ["IPO Price", "GMP", "Estimated Listing Price"]:
        if col in df.columns:
            df[col] = (
                df[col]
                .replace({r"[₹,]": ""}, regex=True)
                .astype(float, errors="ignore")
            )
    if "Estimated Listing Gains" in df.columns:
        df["Estimated Listing Gains"] = (
            df["Estimated Listing Gains"]
            .astype(str)
            .str.rstrip("%")
            .astype(float, errors="ignore")
        )
    df = df.dropna(subset=["Date"]) if "Date" in df.columns else df
    return df.sort_values(by="Date") if "Date" in df.columns else df


def fallback_parse_from_text(soup: BeautifulSoup) -> Optional[pd.DataFrame]:
    hdr = soup.find(
        lambda tag: tag.name in ["h2", "h3"]
        and "GMP Grey Market Premium" in tag.get_text(strip=True)
    )
    if not hdr:
        return None
    rows_seen = set()
    rows = []
    blob = hdr.find_next_sibling(string=True, recursive=True)
    text_all = hdr.parent.get_text(" ", strip=True)
    row_pattern = re.compile(
        r"(\d{2}-\d{2}-\d{4})\s*₹?\s*([\d,]+(?:\.\d+)?)\s*₹?\s*([\d,]+(?:\.\d+)?)\s*₹?\s*([\d,]+(?:\.\d+)?)\s*([\d.]+)\s*%",
        flags=re.UNICODE,
    )
    for m in row_pattern.finditer(text_all):
        date_s, ipo_s, gmp_s, elp_s, gains_s = m.groups()
        if date_s in rows_seen:
            continue
        rows_seen.add(date_s)
        rows.append(
            {
                "Date": datetime.strptime(date_s, "%d-%m-%Y").date(),
                "IPO Price": float(ipo_s.replace(",", "")),
                "GMP": float(gmp_s.replace(",", "")),
                "Estimated Listing Price": float(elp_s.replace(",", "")),
                "Estimated Listing Gains": float(gains_s),
            }
        )
    return pd.DataFrame(rows).sort_values(by="Date") if rows else None


def extract_gmp_history(url: str) -> pd.DataFrame:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")

    # Try pandas first
    dfs = pd.read_html(r.text)
    for df in dfs:
        ndf = normalize_gmp_table(df)
        if not ndf.empty:
            return ndf

    # Fallback to regex parsing
    fallback_df = fallback_parse_from_text(soup)
    if fallback_df is not None and not fallback_df.empty:
        return fallback_df

    raise RuntimeError("No valid GMP table found.")


def main(ipo: str = "Patel Retail"):
    urls = candidate_urls(ipo)
    url = pick_first_working_url(urls)
    if not url:
        print("Could not locate Univest GMP page.")
        return

    df = extract_gmp_history(url)

    print(f"Source URL: {url}\n")
    print("Full GMP History Table:")
    print(df.to_string(index=False))

    print("\nLatest 4 Days' GMP:")
    for _, row in df.tail(4).iterrows():
        print(f"{row['Date'].strftime('%d-%m-%Y')} → ₹{row['GMP']:.2f}")


if __name__ == "__main__":
    ipo_name = sys.argv[1] if len(sys.argv) > 1 else "Patel Retail"
    main(ipo_name)
