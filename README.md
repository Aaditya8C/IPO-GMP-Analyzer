# IPO GMP Analyzer

IPO GMP Analyzer is a full-stack web application that helps users analyze the Grey Market Premium (GMP) trends for ongoing IPOs in India. It fetches live IPO data and scrapes GMP trends from trusted sources, presenting them in a user-friendly dashboard.

## Features

- **Live IPO Listings:** Displays all currently open IPOs with key details.
- **GMP Trend Analysis:** Shows the latest GMP values and trends for each IPO.
- **Estimated Listing Gains:** Calculates and displays estimated listing gains based on GMP.
- **Responsive UI:** Optimized for both desktop and mobile devices.
- **Pagination:** Easily navigate through multiple IPOs.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Material UI
- **Backend:** Node.js, Express
- **Scraping:** Axios, Cheerio, SerpAPI
- **APIs:** [ipoalerts.in](https://api.ipoalerts.in/), [SerpAPI](https://serpapi.com/)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Setup

#### 1. Clone the repository

```bash
git clone https://github.com/yourusername/ipo-gmp-analyzer.git
cd ipo-gmp-analyzer
```

#### 2. Install dependencies

```bash
cd client
npm install
cd server
npm install
```

#### 3. Configure Environment Variables

- Copy `.env.example` to `.env` in both `client` and `server` directories.
- Fill in the required API keys and URLs.

#### 4. Run the Backend Server

```bash
cd server
npm start
# The server runs on http://localhost:8000 by default
```

#### 5. Run the Frontend

```bash
cd client
npm run dev
# The app runs on http://localhost:3000
```

## Usage

- Open [http://localhost:3000](http://localhost:3000) in your browser.
- Browse the list of open IPOs and view their GMP trends and estimated listing gains.

## Deployment

- The app can be deployed on platforms like Vercel (frontend) and Render/Heroku (backend).
- Update the environment variables accordingly for production.

## Acknowledgements

- [Univest Blog](https://univest.in/blogs) for GMP data
- [ipoalerts.in](https://api.ipoalerts.in/) for IPO listings
- [SerpAPI](https://serpapi.com/) for Google search scraping

---

Made with ❤️ for IPO investors.
