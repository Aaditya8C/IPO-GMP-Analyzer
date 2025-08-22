from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from datetime import datetime
import time


def get_open_ipos(
    url="https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/33/",
):
    # Set up Selenium WebDriver (adjust path to your ChromeDriver if needed)
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")  # Run in headless mode (no browser UI)
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    )

    # Replace with path to your ChromeDriver if not in PATH
    driver = webdriver.Chrome(options=options)
    driver.get(url)

    # Wait for page to load (adjust as needed)
    time.sleep(3)  # Simple delay; consider WebDriverWait for robustness

    ipos = []
    # Find table rows (adjust selector based on page structure)
    try:
        rows = driver.find_elements(By.CSS_SELECTOR, "table.table-bordered tbody tr")
    except Exception as e:
        print(f"Error finding table rows: {e}")
        driver.quit()
        return []

    # Current date for filtering open IPOs
    current_date = datetime(2025, 8, 21)  # As of August 21, 2025

    for row in rows:
        try:
            # Get columns
            columns = row.find_elements(By.TAG_NAME, "td")
            if len(columns) < 6:
                continue  # Skip rows with insufficient data

            # Extract data
            company_name = columns[0].text.strip()
            open_date_str = columns[1].text.strip()
            close_date_str = columns[2].text.strip()
            price_range = columns[3].text.strip()
            lot_size = columns[4].text.strip()
            min_investment = columns[5].text.strip() if len(columns) > 5 else "N/A"

            # Parse dates to check if IPO is open
            try:
                open_date = datetime.strptime(open_date_str, "%b %d, %Y")
                close_date = datetime.strptime(close_date_str, "%b %d, %Y")

                # Check if IPO is open (current date is between open and close dates)
                if open_date <= current_date <= close_date:
                    ipos.append(
                        {
                            "Company": company_name,
                            "Open Date": open_date_str,
                            "Close Date": close_date_str,
                            "Price Range": price_range,
                            "Lot Size": lot_size,
                            "Min Investment": min_investment,
                        }
                    )
            except ValueError as e:
                print(f"Error parsing dates for {company_name}: {e}")
                continue

        except Exception as e:
            print(f"Error processing row: {e}")
            continue

    driver.quit()
    return ipos


# Example usage
if __name__ == "__main__":
    url = "https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/33/"
    open_ipos = get_open_ipos(url)

    if open_ipos:
        print("Currently Open IPOs:")
        for ipo in open_ipos:
            print(ipo)
    else:
        print("No open IPOs found or scraping failed.")
