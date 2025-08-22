from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import pandas as pd

from scrapper import candidate_urls, pick_first_working_url, extract_gmp_history

app = FastAPI()

# Enable CORS for all origins (adjust as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/gmp")
def get_gmp(ipo_name: str = Query(..., description="IPO name")):
    urls = candidate_urls(ipo_name)
    url = pick_first_working_url(urls)
    if not url:
        raise HTTPException(status_code=404, detail="GMP page not found")

    try:
        df = extract_gmp_history(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if df.empty:
        raise HTTPException(status_code=404, detail="No GMP data found")

    last5 = df.tail(5).iloc[::-1]  # Reverse the order for descending dates
    gmp_array = [
        {
            "date": (
                row["Date"].strftime("%d-%m-%Y") if not pd.isnull(row["Date"]) else None
            ),
            "gmp": row["GMP"],
        }
        for _, row in last5.iterrows()
    ]

    latest = last5.iloc[1]
    base_ipo_price = latest.get("IPO Price", None)
    est_listing_price = latest.get("Estimated Listing Price", None)
    est_listing_gains = latest.get("Estimated Listing Gains", None)

    return {
        "base_ipo_price": base_ipo_price,
        "estimated_listing_price": est_listing_price,
        "estimated_listing_gains": est_listing_gains,
        "gmp_trend": gmp_array,
    }


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
