# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install (required flag due to ESLint peer-dep conflicts)
npm install --legacy-peer-deps

# Development
npm run dev        # http://localhost:3000

# Build & production
npm run build
npm run start

# Lint
npm run lint

# Manually trigger data update (requires FRED_API_KEY env var)
node scripts/update-taux.mjs
```

## Environment Variables

Create `.env.local` for local development:

```env
NEXTAUTH_URL=http://localhost:3000
FRED_API_KEY=           # Required for live OAT, €STR, JGB, Gilt, Inflation data
ALPHA_VANTAGE_API_KEY=  # Optional, for live CAC40 YTD via Alpha Vantage
WEBSTAT_API_KEY=        # Optional, for Banque de France Webstat API
OILPRICEAPI_API_KEY=    # Optional, for live oil prices
```

## Architecture

This is a **Next.js 14** (App Router) dashboard for tracking French and global financial indices. It is a read-only, data-display application — no user authentication or write operations exist in the UI.

### Data Flow

```
GitHub Actions (daily cron) → scripts/update-taux.mjs
  → fetches live data from FRED, BCE, Yahoo Finance, etc.
  → writes public/taux.json

Browser → GET /api/taux (app/api/taux/route.ts)
  → reads public/taux.json
  → merges with lib/historical-data.ts (fills pre-2000 gaps via interpolation)
  → returns enriched JSON with 5-min CDN cache

app/page.tsx → fetches /api/taux → passes indices to <Comparator>
```

`public/taux.json` is the single source of truth for all live data. The API route merges it with hard-coded historical anchors from `lib/historical-data.ts`, which uses linear interpolation to fill in early history (pre-2000) that the APIs don't provide.

### Critical Files — Do Not Break

| File | Why |
|------|-----|
| `app/api/taux/route.ts` | Consumed by external sites via the `/api/taux` endpoint |
| `public/taux.json` | Single data source; modified only by the update script |
| `scripts/update-taux.mjs` | The daily update script that populates `taux.json` |
| `.github/workflows/update-taux.yml` | Runs `update-taux.mjs` daily at ~09h Paris time |

### Key Components

- **`components/comparator.tsx`** — The main dashboard panel. Manages index selection (up to 5), display mode switching (`real` / `percent` / base-100), period selection (`1M`…`MAX`/`CUSTOM`), and placement/simulation inputs. Passes `DatasetConfig[]` down to `EnhancedChart`.
- **`components/enhanced-chart.tsx`** — Recharts-based chart supporting brush/zoom, moving averages (MA50/MA200), base-100 normalization, placement simulation, PNG export via `html2canvas`, and CSV export.
- **`components/status-panel.tsx`** — Shows freshness status (`ok`/`stale`/`fail`) for every index using thresholds defined in `lib/staleness.ts`.
- **`components/timeline-crises.tsx`** — Static educational timeline of historical financial crises.

### Library Layer (`lib/`)

- **`financial-utils.ts`** — All financial math: `calculateAllStats`, `filterDataByPeriod`, `normalizeToBase100`, `computeCapitalizedSeries` (placement with monthly contributions), `calculateMonthlyIRR`. `SAVINGS_KEYS` and `COMPOUNDING_RULES` define which indices use rate-based compounding vs. price-based returns.
- **`historical-data.ts`** — Hard-coded monthly anchors (year-end closing values) for CAC40 back to 1987, plus other indices. Uses `interpolateMonthly()` to generate intermediate monthly points. Live data from `taux.json` always takes precedence — historical data only fills earlier dates.
- **`staleness.ts`** — `UPDATE_FREQUENCY` map defining the expected update cadence and staleness threshold (in days) for every index key. `getIndexStatus()` returns `'ok' | 'stale' | 'fail'`.
- **`educational-data.ts`** — `INDEX_EDUCATION` record with category, descriptions, source URLs, and display colors for each index. `CATEGORY_CONFIG` groups indices into `rates`, `savings`, `stocks`, `forex`, `commodities`, `crypto`.

### Index Keys

Index keys (e.g. `oat`, `estr`, `cac40`, `btc`, `eurusd`) are used as object keys throughout `taux.json`, `HISTORICAL_DATA`, `UPDATE_FREQUENCY`, `INDEX_EDUCATION`, and `COMPOUNDING_RULES`. When adding a new index, all four files need updating.

### UI Stack

- **shadcn/ui** components in `components/ui/` — generated via the shadcn CLI (see `components.json`). Do not hand-edit these; regenerate with `npx shadcn@latest add <component>`.
- **Tailwind CSS** with a custom `app-header` gradient class defined in `app/globals.css`.
- **next-themes** (`ThemeProvider` in `app/layout.tsx`) — light/dark mode, system default.
- **Recharts** for all charts; **Framer Motion** for animations; **Lucide React** for icons.

### Build Notes

`next.config.js` sets `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` for TypeScript and ESLint respectively. The build will succeed even with type errors — rely on your editor's type checking rather than the build for correctness signals.

The Prisma schema (`prisma/schema.prisma`) defines a `FinancialRate` model but is not wired into the application — the app reads from `taux.json`, not a database.
