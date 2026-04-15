/**
 * Hard-coded historical monthly data for indices that lack early history in taux.json.
 * Sources: annual anchors interpolated linearly between key historical reference points.
 * Live data from taux.json always takes precedence — this only fills in earlier dates.
 */

export interface HistoricalPoint {
  date: string;
  value: number;
}

/**
 * Generates monthly data points via linear interpolation between anchor values.
 * Only generates dates strictly before `stopBefore`.
 */
function interpolateMonthly(
  anchors: Array<{ year: number; month: number; value: number }>,
  stopBefore: string
): HistoricalPoint[] {
  const sorted = [...anchors].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  );
  const result: HistoricalPoint[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const fromAbs = from.year * 12 + (from.month - 1);
    const toAbs = to.year * 12 + (to.month - 1);
    const span = toAbs - fromAbs;

    for (let m = 0; m < span; m++) {
      const absMonth = fromAbs + m;
      const y = Math.floor(absMonth / 12);
      const mo = (absMonth % 12) + 1;
      const date = `${y}-${String(mo).padStart(2, '0')}-01`;
      if (date >= stopBefore) return result;
      const t = m / span;
      const value =
        Math.round((from.value + (to.value - from.value) * t) * 100) / 100;
      result.push({ date, value });
    }
  }
  return result;
}

// ─── CAC 40 (from 1988-01, live data starts 1999-12-31) ───────────────────────
// Annual anchors: known year-end closing values. Base = 1000 (Dec 31, 1987).
export const cac40Historical = interpolateMonthly(
  [
    { year: 1987, month: 12, value: 1000 },
    { year: 1988, month: 12, value: 1474 },
    { year: 1989, month: 12, value: 2001 },
    { year: 1990, month: 12, value: 1517 }, // Gulf War sell-off
    { year: 1991, month: 12, value: 1765 },
    { year: 1992, month: 12, value: 1860 },
    { year: 1993, month: 12, value: 2268 },
    { year: 1994, month: 12, value: 2087 }, // Bond market crash
    { year: 1995, month: 12, value: 1900 },
    { year: 1996, month: 12, value: 2315 },
    { year: 1997, month: 12, value: 3001 },
    { year: 1998, month: 12, value: 3943 },
    { year: 1999, month: 12, value: 5540 },
  ],
  '1999-12-31'
);

// ─── S&P 500 (from 1988-01, live data starts 2000-01-01) ──────────────────────
export const sp500Historical = interpolateMonthly(
  [
    { year: 1987, month: 12, value: 247 },
    { year: 1988, month: 12, value: 278 },
    { year: 1989, month: 12, value: 353 },
    { year: 1990, month: 12, value: 330 }, // Gulf War / recession
    { year: 1991, month: 12, value: 417 },
    { year: 1992, month: 12, value: 436 },
    { year: 1993, month: 12, value: 466 },
    { year: 1994, month: 12, value: 459 },
    { year: 1995, month: 12, value: 616 },
    { year: 1996, month: 12, value: 741 },
    { year: 1997, month: 12, value: 970 },
    { year: 1998, month: 12, value: 1229 },
    { year: 1999, month: 12, value: 1469 },
  ],
  '2000-01-01'
);

// ─── NASDAQ Composite (from 1988-01, live data starts 2000-01-01) ─────────────
export const nasdaqHistorical = interpolateMonthly(
  [
    { year: 1987, month: 12, value: 330 },
    { year: 1988, month: 12, value: 381 },
    { year: 1989, month: 12, value: 455 },
    { year: 1990, month: 12, value: 374 },
    { year: 1991, month: 12, value: 586 },
    { year: 1992, month: 12, value: 677 },
    { year: 1993, month: 12, value: 777 },
    { year: 1994, month: 12, value: 752 },
    { year: 1995, month: 12, value: 1052 },
    { year: 1996, month: 12, value: 1291 },
    { year: 1997, month: 12, value: 1570 },
    { year: 1998, month: 12, value: 2193 },
    { year: 1999, month: 12, value: 4069 }, // Dot-com bubble peak
  ],
  '2000-01-01'
);

// ─── Gold USD/oz (from 1979-01, live data starts 2000-08-28) ──────────────────
// Key historical events: Jan 1980 spike, early-80s bear, late-80s recovery, 90s bear
export const goldHistorical = interpolateMonthly(
  [
    { year: 1979, month: 1, value: 225 },
    { year: 1980, month: 1, value: 675 }, // Post-spike end-Jan level
    { year: 1980, month: 12, value: 590 },
    { year: 1981, month: 12, value: 397 },
    { year: 1982, month: 12, value: 448 },
    { year: 1983, month: 12, value: 382 },
    { year: 1984, month: 12, value: 309 },
    { year: 1985, month: 12, value: 327 },
    { year: 1986, month: 12, value: 394 },
    { year: 1987, month: 12, value: 484 },
    { year: 1988, month: 12, value: 410 },
    { year: 1989, month: 12, value: 399 },
    { year: 1990, month: 12, value: 391 },
    { year: 1991, month: 12, value: 353 },
    { year: 1992, month: 12, value: 332 },
    { year: 1993, month: 12, value: 391 },
    { year: 1994, month: 12, value: 379 },
    { year: 1995, month: 12, value: 387 },
    { year: 1996, month: 12, value: 370 },
    { year: 1997, month: 12, value: 289 },
    { year: 1998, month: 12, value: 287 },
    { year: 1999, month: 12, value: 290 },
    { year: 2000, month: 8, value: 277 },
  ],
  '2000-08-01'
);

// ─── Euro STOXX 50 (from 2000-01, live data starts 2007-03-25) ────────────────
// Key events: dot-com bust, 9/11, 2002-03 bottom, 2003-07 bull run
export const stoxx50Historical = interpolateMonthly(
  [
    { year: 1999, month: 12, value: 4904 },
    { year: 2000, month: 3, value: 5464 }, // Tech bubble peak
    { year: 2000, month: 12, value: 4772 },
    { year: 2001, month: 9, value: 3033 }, // Post-9/11 low
    { year: 2001, month: 12, value: 3806 },
    { year: 2002, month: 12, value: 2386 },
    { year: 2003, month: 3, value: 2116 }, // Cycle bottom
    { year: 2003, month: 12, value: 2760 },
    { year: 2004, month: 12, value: 2951 },
    { year: 2005, month: 12, value: 3578 },
    { year: 2006, month: 12, value: 4119 },
    { year: 2007, month: 3, value: 4181 },
  ],
  '2007-03-25'
);

// ─── Stoxx Europe 600 (base 100 on 1991-12-31, live data starts 1998-01-02) ──
// Key events: post-base climb, tech bubble, global indices broadly rising
export const stoxx600Historical = interpolateMonthly(
  [
    { year: 1991, month: 12, value: 100 },  // Base date
    { year: 1992, month: 12, value: 109 },
    { year: 1993, month: 12, value: 138 },
    { year: 1994, month: 12, value: 134 },
    { year: 1995, month: 12, value: 145 },
    { year: 1996, month: 12, value: 175 },
    { year: 1997, month: 12, value: 222 },
    { year: 1998, month: 1, value: 232 },
  ],
  '1998-01-02'
);

// ─── Brent crude USD/bbl (from 2000-01, live data starts 2007-07-30) ──────────
export const brentHistorical = interpolateMonthly(
  [
    { year: 1999, month: 12, value: 25 },
    { year: 2000, month: 10, value: 36.6 }, // Short-term peak
    { year: 2000, month: 12, value: 23.5 },
    { year: 2001, month: 12, value: 20.0 },
    { year: 2002, month: 12, value: 29.0 },
    { year: 2003, month: 12, value: 33.3 },
    { year: 2004, month: 10, value: 52.9 }, // Iraq war premium
    { year: 2004, month: 12, value: 40.3 },
    { year: 2005, month: 8, value: 65.4 },  // Katrina spike
    { year: 2005, month: 12, value: 57.6 },
    { year: 2006, month: 7, value: 76.7 },  // Mid-2006 peak
    { year: 2006, month: 12, value: 59.5 },
    { year: 2007, month: 7, value: 74.75 },
  ],
  '2007-07-30'
);

// ─── MSCI World ETF equiv (from 2000-01, live data starts 2012-01-09) ─────────
// Values scaled to match the 50.3 start on 2012-01-09 (scale ≈ 0.0373 × MSCI World index)
export const worldHistorical = interpolateMonthly(
  [
    { year: 1999, month: 12, value: 50.4 },
    { year: 2000, month: 3, value: 57.4 }, // Tech bubble peak
    { year: 2000, month: 12, value: 47.4 },
    { year: 2001, month: 9, value: 37.2 }, // 9/11 bottom
    { year: 2001, month: 12, value: 39.2 },
    { year: 2002, month: 12, value: 30.2 },
    { year: 2003, month: 3, value: 25.0 }, // Cycle bottom
    { year: 2003, month: 12, value: 37.7 },
    { year: 2004, month: 12, value: 42.2 },
    { year: 2005, month: 12, value: 49.6 },
    { year: 2006, month: 12, value: 59.7 },
    { year: 2007, month: 10, value: 67.1 }, // Pre-GFC peak
    { year: 2007, month: 12, value: 64.5 },
    { year: 2008, month: 12, value: 34.5 }, // GFC bottom area
    { year: 2009, month: 3, value: 28.8 },  // Market bottom
    { year: 2009, month: 12, value: 49.2 },
    { year: 2010, month: 12, value: 55.6 },
    { year: 2011, month: 12, value: 49.2 },
    { year: 2012, month: 1, value: 50.3 },
  ],
  '2012-01-09'
);

// ─── OAT 10-year yield % (from 1993-01, live data starts 2000-01-01) ──────────
// Key events: 1994 bond market crash, gradual decline to EMU convergence
export const oatHistorical = interpolateMonthly(
  [
    { year: 1993, month: 1, value: 7.35 },
    { year: 1993, month: 12, value: 5.72 },
    { year: 1994, month: 3, value: 7.00 }, // Bond market crash spike
    { year: 1994, month: 12, value: 8.32 },
    { year: 1995, month: 12, value: 6.32 },
    { year: 1996, month: 12, value: 5.75 },
    { year: 1997, month: 12, value: 5.27 },
    { year: 1998, month: 12, value: 3.91 },
    { year: 1999, month: 12, value: 5.04 },
  ],
  '2000-01-01'
);

// ─── EUR/USD (from 1999-01, live data starts 2003-12-01 at 1.22) ──────────────
// Euro launched Jan 1, 1999 at ~1.17; reached all-time low 0.82 in Oct 2000
export const eurusdHistorical = interpolateMonthly(
  [
    { year: 1999, month: 1, value: 1.17 },
    { year: 1999, month: 12, value: 1.00 },
    { year: 2000, month: 10, value: 0.82 }, // All-time low
    { year: 2000, month: 12, value: 0.94 },
    { year: 2001, month: 12, value: 0.89 },
    { year: 2002, month: 12, value: 1.05 },
    { year: 2003, month: 12, value: 1.22 },
  ],
  '2003-12-01'
);

// ─── EUR/GBP (from 1999-01, live data starts 2000-01-01 at 0.63) ──────────────
export const eurgbpHistorical = interpolateMonthly(
  [
    { year: 1999, month: 1, value: 0.71 },
    { year: 1999, month: 12, value: 0.63 },
  ],
  '2000-01-01'
);

// ─── EUR/JPY (from 1999-01, live data starts 2003-01-20 at 127.6) ─────────────
export const eurjpyHistorical = interpolateMonthly(
  [
    { year: 1999, month: 1, value: 133 },
    { year: 1999, month: 12, value: 102 },
    { year: 2000, month: 12, value: 109 },
    { year: 2001, month: 12, value: 115 },
    { year: 2002, month: 12, value: 124 },
    { year: 2003, month: 1, value: 126 },
  ],
  '2003-01-20'
);

// ─── EUR/CHF (from 1999-01, live data starts 2003-01-20 at 1.47) ──────────────
export const eurchfHistorical = interpolateMonthly(
  [
    { year: 1999, month: 1, value: 1.60 },
    { year: 1999, month: 12, value: 1.60 },
    { year: 2000, month: 12, value: 1.52 },
    { year: 2001, month: 12, value: 1.48 },
    { year: 2002, month: 12, value: 1.45 },
    { year: 2003, month: 1, value: 1.47 },
  ],
  '2003-01-20'
);

// ─── EUR/CNY (from 1999-01, live data starts 2003-12-01 at 10.04) ─────────────
// CNY was pegged to USD ~8.27; EUR/CNY derived from EUR/USD × USD/CNY
export const eurcnyHistorical = interpolateMonthly(
  [
    { year: 1999, month: 1, value: 9.68 },  // 1.17 × 8.28
    { year: 2000, month: 10, value: 6.79 }, // 0.82 × 8.28 (EUR low)
    { year: 2000, month: 12, value: 7.78 },
    { year: 2001, month: 12, value: 7.36 },
    { year: 2002, month: 12, value: 8.69 },
    { year: 2003, month: 12, value: 10.04 },
  ],
  '2003-12-01'
);

// ─── MSCI Emerging Markets ETF equiv (from 2000-01, live data starts 2003-04-14 at 11.57) ──
// Scaled to match 11.57 on 2003-04-14 (scale ≈ 0.033 × MSCI EM index)
export const emergingHistorical = interpolateMonthly(
  [
    { year: 1999, month: 12, value: 15.2 }, // MSCI EM ~460
    { year: 2000, month: 3, value: 17.2 },  // ~520 peak
    { year: 2000, month: 12, value: 13.2 },
    { year: 2001, month: 12, value: 9.9 },
    { year: 2002, month: 12, value: 9.2 },
    { year: 2003, month: 4, value: 11.57 },
  ],
  '2003-04-14'
);

// ─── Master map: index key → historical data ────────────────────────────────────
export const HISTORICAL_DATA: Record<string, HistoricalPoint[]> = {
  cac40: cac40Historical,
  sp500: sp500Historical,
  nasdaq: nasdaqHistorical,
  gold: goldHistorical,
  stoxx50: stoxx50Historical,
  stoxx600: stoxx600Historical,
  brent: brentHistorical,
  world: worldHistorical,
  oat: oatHistorical,
  eurusd: eurusdHistorical,
  eurgbp: eurgbpHistorical,
  eurjpy: eurjpyHistorical,
  eurchf: eurchfHistorical,
  eurcny: eurcnyHistorical,
  emerging: emergingHistorical,
};
