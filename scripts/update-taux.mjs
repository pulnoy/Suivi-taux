import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const WEBSTAT_API_KEY = process.env.WEBSTAT_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// Charger les données existantes pour fallback si FRED_API_KEY non disponible
let existingData = null;
try {
  if (fs.existsSync(FILE_PATH)) {
    existingData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
  }
} catch (e) { /* ignore */ }

// Date de début pour maximiser l'historique (20 ans de données)
const HISTORY_START_DATE = '2000-01-01';

// --- FONCTIONS UTILITAIRES ---

// 1. Récupération FRED - Historique maximum depuis 2000
const FRED_SERIES_MAP = {
  'IRLTLT01FRM156N': 'oat',
  'ECBESTRVOLWGTTRMDMNRT': 'estr',
  'IRLTLT01JPM156N': 'jgb',
  'IRLTLT01GBM156N': 'gilt',
};

async function fetchFredSeries(seriesId) {
  if (!FRED_API_KEY) {
    const indiceKey = FRED_SERIES_MAP[seriesId];
    if (existingData?.indices?.[indiceKey]?.historique?.length > 0) {
      console.log(`  ⚠️ FRED ${seriesId}: utilisation des données existantes (pas de clé API)`);
      return existingData.indices[indiceKey].historique;
    }
    console.log(`  ❌ FRED ${seriesId}: pas de clé API et pas de données existantes`);
    return [];
  }

  try {
    const timestamp = new Date().getTime();
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${HISTORY_START_DATE}&_t=${timestamp}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    if (data.observations) {
      const result = data.observations
        .map(obs => ({
          date: obs.date,
          value: parseFloat(parseFloat(obs.value).toFixed(2)),
          timestamp: new Date(obs.date).getTime()
        }))
        .filter(item => !isNaN(item.value))
        .sort((a, b) => a.timestamp - b.timestamp);
      console.log(`  ✓ FRED ${seriesId}: ${result.length} points, ${result[0]?.date} → ${result[result.length-1]?.date}`);
      return result;
    }
  } catch (error) { console.error(`Erreur FRED (${seriesId}):`, error.message); }
  return [];
}

// ─────────────────────────────────────────────────────────────
// 2. OAT 10 ANS — BCE mensuel + FRED historique
// ─────────────────────────────────────────────────────────────

// Fetch generique BCE mensuel pour obligations d'État d'une zone Euro (FR, DE…)
async function fetchEcbBondMonthly(countryCode, label, existingKey) {
  try {
    const url = `https://data-api.ecb.europa.eu/service/data/IRS/M.${countryCode}.L.L40.CI.0000.EUR.N.Z?startPeriod=2000-01-01&format=jsondata&detail=dataonly`;
    const response = await fetch(url, { cache: 'no-store', headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      console.log(`  ⚠️ BCE ${label} HTTP ${response.status}`);
      return existingData?.indices?.[existingKey]?.historique ?? [];
    }
    const json = await response.json();
    const points = parseEcbSdmxJson(json);
    if (points.length > 0) {
      const last = points[points.length - 1];
      console.log(`  ✓ BCE ${label}: ${points.length} pts, dernier: ${last.date} = ${last.value}%`);
      return points;
    }
    return existingData?.indices?.[existingKey]?.historique ?? [];
  } catch (err) {
    console.log(`  ⚠️ BCE ${label} erreur: ${err.message}`);
    return existingData?.indices?.[existingKey]?.historique ?? [];
  }
}

// Parse un bloc d'observations SDMX-JSON BCE et retourne les points triés
function parseEcbSdmxJson(json) {
  const seriesKey = Object.keys(json?.dataSets?.[0]?.series ?? {})[0];
  const seriesObs = json?.dataSets?.[0]?.series?.[seriesKey]?.observations;
  const allPeriods = json?.structure?.dimensions?.observation?.[0]?.values;
  if (!seriesObs || !allPeriods) return [];
  const points = [];
  for (const [idx, obs] of Object.entries(seriesObs)) {
    const periodObj = allPeriods[parseInt(idx)];
    if (!periodObj || obs[0] == null) continue;
    const period = periodObj.id; // ex: "2026-04-08" ou "2026-02"
    const date = period.length === 7 ? `${period}-01` : period;
    const val = parseFloat(obs[0]);
    if (!isNaN(val)) points.push({ date, value: parseFloat(val.toFixed(3)), timestamp: new Date(date).getTime() });
  }
  points.sort((a, b) => a.timestamp - b.timestamp);
  return points;
}

// Tentative BCE : d'abord quotidien (D), puis mensuel (M) en fallback
async function fetchOatFromECB(freq = 'D') {
  try {
    const startPeriod = freq === 'D' ? '2024-01-01' : new Date(Date.now() - 3 * 365 * 86400000).toISOString().slice(0, 7);
    const url = `https://data-api.ecb.europa.eu/service/data/IRS/${freq}.FR.L.L40.CI.0000.EUR.N.Z?startPeriod=${startPeriod}&format=jsondata&detail=dataonly`;
    const response = await fetch(url, { cache: 'no-store', headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      if (freq === 'D') {
        console.log(`  ⚠️ BCE OAT quotidien HTTP ${response.status}, tentative mensuel...`);
        return fetchOatFromECB('M');
      }
      console.log(`  ⚠️ BCE OAT mensuel HTTP ${response.status}`);
      return [];
    }
    const json = await response.json();
    const points = parseEcbSdmxJson(json);
    if (points.length === 0 && freq === 'D') {
      console.log(`  ⚠️ BCE OAT quotidien: aucun point, tentative mensuel...`);
      return fetchOatFromECB('M');
    }
    if (points.length > 0) {
      const last = points[points.length - 1];
      console.log(`  ✓ BCE OAT (${freq === 'D' ? 'quotidien' : 'mensuel'}): ${points.length} pts, dernier: ${last.date} = ${last.value}%`);
    }
    return points;
  } catch (err) {
    if (freq === 'D') {
      console.log(`  ⚠️ BCE OAT quotidien erreur: ${err.message}, tentative mensuel...`);
      return fetchOatFromECB('M');
    }
    console.log(`  ⚠️ BCE OAT mensuel erreur: ${err.message}`);
    return [];
  }
}

// Fusion : FRED (historique long mensuel) + BCE daily pour les points récents
async function getOatHistory() {
  // 1. Historique long FRED (mensuel, depuis 2000)
  const fredData = await fetchFredSeries('IRLTLT01FRM156N');

  // 2. BCE mensuel (quotidien retourne 404 pour ce dataset)
  const ecbData = await fetchOatFromECB('M');

  if (fredData.length === 0 && ecbData.length === 0) {
    if (existingData?.indices?.oat?.historique?.length > 0) {
      console.log(`  ⚠️ OAT: conservation données existantes`);
      return existingData.indices.oat.historique;
    }
    return [];
  }

  if (ecbData.length === 0) return fredData;
  if (fredData.length === 0) return ecbData;

  // Garder FRED comme base historique, BCE pour les points plus récents
  const lastFredDate = fredData[fredData.length - 1].date;
  const newPoints = ecbData.filter(d => d.date > lastFredDate);
  if (newPoints.length > 0) {
    const merged = [...fredData, ...newPoints];
    const last = newPoints[newPoints.length - 1];
    console.log(`  ✓ OAT fusionné: ${merged.length} pts (FRED → ${lastFredDate}, +${newPoints.length} BCE → ${last.date})`);
    return merged;
  }
  console.log(`  ℹ️ OAT: BCE n'apporte pas de points plus récents que FRED (${lastFredDate})`);
  return fredData;
}

// ─────────────────────────────────────────────────────────────
// 3. INFLATION FRANCE — SOURCE PRIMAIRE : API INSEE BDM
//
//  Stratégie :
//   A) Base 2025 (actuelle depuis fév. 2026) — série indice brut → glissement calculé
//      011812231 : IPC ensemble des ménages, France entière, base 2025
//   B) Base 2015 (archivée, jusqu'à déc. 2025) — série glissement annuel direct
//      001761313 / 001763852
//   C) Fallback FRED FRACPIALLMINMEI
// ─────────────────────────────────────────────────────────────

// Récupère une série INSEE BDM brute (retourne les valeurs telles quelles)
async function fetchINSEESerie(serieId) {
  try {
    // On remonte jusqu'à 1999 pour avoir 13 mois avant HISTORY_START_DATE
    // et pouvoir calculer le glissement annuel dès janvier 2000
    const url = `https://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM/${serieId}?startPeriod=1999`;
    console.log(`  Fetching INSEE BDM série ${serieId}...`);

    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Accept': 'application/xml' }
    });

    if (!response.ok) {
      console.log(`  ⚠️ INSEE ${serieId}: HTTP ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    console.log(`  INSEE ${serieId}: ${xmlText.length} chars reçus`);

    const observations = [];

    // Format 1 : TIME_PERIOD="2025-12" OBS_VALUE="99.8"
    const obsRegex = /TIME_PERIOD="([^"]+)"[^>]*OBS_VALUE="([^"]+)"/g;
    let match;
    while ((match = obsRegex.exec(xmlText)) !== null) {
      const [_, period, value] = match;
      const date = period.length === 7 ? `${period}-01` : period;
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        observations.push({
          date,
          value: parseFloat(numValue.toFixed(4)),
          timestamp: new Date(date).getTime()
        });
      }
    }

    // Format 2 : <generic:Value id="TIME_PERIOD" value="..."> + <generic:ObsValue value="...">
    if (observations.length === 0) {
      const timeRegex = /<(?:generic:)?Value[^>]*id="TIME_PERIOD"[^>]*value="([^"]+)"/g;
      const valueRegex = /<(?:generic:)?ObsValue[^>]*value="([^"]+)"/g;
      const times = [], values = [];
      let m;
      while ((m = timeRegex.exec(xmlText)) !== null) times.push(m[1]);
      while ((m = valueRegex.exec(xmlText)) !== null) values.push(m[1]);
      for (let i = 0; i < Math.min(times.length, values.length); i++) {
        const period = times[i];
        const date = period.length === 7 ? `${period}-01` : period;
        const numValue = parseFloat(values[i]);
        if (!isNaN(numValue)) {
          observations.push({
            date,
            value: parseFloat(numValue.toFixed(4)),
            timestamp: new Date(date).getTime()
          });
        }
      }
    }

    if (observations.length > 0) {
      observations.sort((a, b) => a.timestamp - b.timestamp);
      const last = observations[observations.length - 1];
      console.log(`  ✓ INSEE ${serieId}: ${observations.length} points, dernier: ${last.date} = ${last.value}`);
      return observations;
    }

    console.log(`  ⚠️ INSEE ${serieId}: aucune observation parsée`);
    return [];
  } catch (error) {
    console.error(`  ⚠️ Erreur INSEE ${serieId}:`, error.message);
    return [];
  }
}

// Calcule le glissement annuel (%) depuis un tableau d'indices bruts
// glissement[i] = (indice[i] / indice[i-12] - 1) * 100
function computeGlissementAnnuel(rawSeries) {
  if (rawSeries.length < 13) return [];

  // Indexer par date pour lookup rapide
  const byDate = {};
  for (const pt of rawSeries) byDate[pt.date] = pt.value;

  const result = [];
  for (const pt of rawSeries) {
    // Date il y a 12 mois
    const d = new Date(pt.date);
    d.setFullYear(d.getFullYear() - 1);
    const prevDate = d.toISOString().split('T')[0];

    const prevVal = byDate[prevDate];
    if (prevVal == null || prevVal === 0) continue;

    const glissement = parseFloat(((pt.value / prevVal - 1) * 100).toFixed(2));

    // Ne garder que les points à partir de HISTORY_START_DATE
    if (pt.date >= HISTORY_START_DATE) {
      result.push({
        date: pt.date,
        value: glissement,
        timestamp: pt.timestamp
      });
    }
  }

  if (result.length > 0) {
    const last = result[result.length - 1];
    console.log(`  ✓ Glissement annuel calculé: ${result.length} points, dernier: ${last.date} = ${last.value}%`);
  }
  return result;
}

// Récupère la série IPC base 2025 et calcule le glissement annuel
async function getInflationBase2025() {
  // Série IPC ensemble des ménages, France entière, base 2025
  const raw = await fetchINSEESerie('011812231');
  if (raw.length === 0) return [];
  return computeGlissementAnnuel(raw);
}

async function getInflationFromFRED() {
  if (!FRED_API_KEY) return [];

  try {
    console.log(`  Fetching FRED FRACPIALLMINMEI (fallback)...`);
    const timestamp = new Date().getTime();
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=FRACPIALLMINMEI&api_key=${FRED_API_KEY}&file_type=json&observation_start=${HISTORY_START_DATE}&units=pc1&_t=${timestamp}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.observations) {
      const result = data.observations
        .map(obs => ({
          date: obs.date,
          value: parseFloat(parseFloat(obs.value).toFixed(2)),
          timestamp: new Date(obs.date).getTime()
        }))
        .filter(item => !isNaN(item.value))
        .sort((a, b) => a.timestamp - b.timestamp);
      console.log(`  ✓ FRED Inflation: ${result.length} points, ${result[0]?.date} → ${result[result.length-1]?.date}`);
      return result;
    }
  } catch (error) {
    console.error(`  ⚠️ Erreur FRED Inflation:`, error.message);
  }
  return [];
}

async function getInflationFromIndex() {
  // ⚠️ Depuis fév. 2026 : séries base 2015 arrêtées → utiliser base 2025

  // 1. Base 2025 : indice brut → glissement annuel calculé (couvre 1996 → aujourd'hui)
  let data = await getInflationBase2025();
  if (data.length > 0) return data;

  // 2. Base 2015 glissement direct (dernier point = déc. 2025, pour fallback historique)
  console.log(`  ⚠️ Base 2025 indisponible, tentative base 2015 (001761313)...`);
  data = await fetchINSEESerie('001761313');
  if (data.length > 0) return data;

  console.log(`  ⚠️ Tentative base 2015 secours (001763852)...`);
  data = await fetchINSEESerie('001763852');
  if (data.length > 0) return data;

  // 3. Fallback FRED
  console.log(`  ⚠️ INSEE indisponible, tentative FRED...`);
  data = await getInflationFromFRED();
  if (data.length > 0) return data;

  // 4. Fallback données existantes
  if (existingData?.indices?.inflation?.historique?.length > 0) {
    console.log(`  ⚠️ Inflation France: utilisation des données existantes`);
    return existingData.indices.inflation.historique;
  }

  console.log(`  ❌ Inflation France: aucune source disponible`);
  return [];
}

// ─────────────────────────────────────────────────────────────
// 4. Yahoo Finance — Historique maximum avec données hybrides
// ─────────────────────────────────────────────────────────────

async function fetchYahooHistory(ticker, useWeekly = true) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const period1 = 946684800; // 2000-01-01
    const interval = useWeekly ? '1wk' : '1d';

    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${now}&interval=${interval}`;
    console.log(`  Fetching ${ticker} (${interval})...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    const data = await response.json();

    if (data.chart?.error) {
      console.error(`  Erreur API Yahoo (${ticker}):`, data.chart.error.description);
      return [];
    }

    const result = data.chart?.result?.[0];
    if (result && result.timestamp && result.indicators?.quote?.[0]?.close) {
      const dates = result.timestamp;
      const prices = result.indicators.quote[0].close;
      const history = [];

      for (let i = 0; i < dates.length; i++) {
        if (prices[i] != null && !isNaN(prices[i])) {
          history.push({
            date: new Date(dates[i] * 1000).toISOString().split('T')[0],
            value: parseFloat(prices[i].toFixed(2)),
            timestamp: dates[i] * 1000
          });
        }
      }

      console.log(`  ✓ ${ticker}: ${history.length} points, ${history[0]?.date} → ${history[history.length-1]?.date}`);
      return history;
    }
  } catch (error) {
    console.error(`Erreur Yahoo (${ticker}):`, error.message);
  }
  return [];
}

async function fetchYahooRecentDaily(ticker) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${thirtyDaysAgo}&period2=${now}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (result?.timestamp?.length > 0) {
      const dates = result.timestamp;
      const prices = result.indicators.quote[0].close;
      const history = [];

      for (let i = 0; i < dates.length; i++) {
        if (prices[i] != null && !isNaN(prices[i])) {
          history.push({
            date: new Date(dates[i] * 1000).toISOString().split('T')[0],
            value: parseFloat(prices[i].toFixed(2)),
            timestamp: dates[i] * 1000
          });
        }
      }
      return history;
    }
  } catch (error) {
    // Silently fail for recent data
  }
  return [];
}

async function fetchYahooHistoryWithFallback(ticker) {
  let history = await fetchYahooHistory(ticker, true);

  if (history.length < 100) {
    console.log(`  Fallback vers données quotidiennes pour ${ticker}...`);
    const now = Math.floor(Date.now() / 1000);
    const period1 = now - (10 * 365 * 24 * 60 * 60);

    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${now}&interval=1d`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        cache: 'no-store'
      });
      const data = await response.json();
      const result = data.chart?.result?.[0];

      if (result?.timestamp?.length > history.length) {
        const dates = result.timestamp;
        const prices = result.indicators.quote[0].close;
        history = [];

        let lastWeek = null;
        for (let i = 0; i < dates.length; i++) {
          if (prices[i] != null && !isNaN(prices[i])) {
            const weekNum = Math.floor(dates[i] / (7 * 24 * 60 * 60));
            if (weekNum !== lastWeek) {
              history.push({
                date: new Date(dates[i] * 1000).toISOString().split('T')[0],
                value: parseFloat(prices[i].toFixed(2)),
                timestamp: dates[i] * 1000
              });
              lastWeek = weekNum;
            }
          }
        }
        console.log(`  ✓ ${ticker} (fallback): ${history.length} points`);
      }
    } catch (error) {
      console.error(`Erreur fallback Yahoo (${ticker}):`, error.message);
    }
  }

  const recentDaily = await fetchYahooRecentDaily(ticker);
  if (recentDaily.length > 0 && history.length > 0) {
    const lastHistoDate = history[history.length - 1].date;
    const newDailyData = recentDaily.filter(d => d.date > lastHistoDate);

    if (newDailyData.length > 0) {
      history = [...history, ...newDailyData];
      console.log(`  + ${ticker}: ajout de ${newDailyData.length} points quotidiens récents jusqu'au ${newDailyData[newDailyData.length - 1].date}`);
    }
  }

  return history;
}

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// 5. LIVRET A — Banque de France Webstat (source officielle)
//    Série MIR1.M.FR.B.L23FRLA.D.R.A.2230U6.EUR.O
//    Données depuis 1966, mises à jour en temps réel
//    Fallback : historique hardcodé si pas de clé API
// ─────────────────────────────────────────────────────────────
async function getLivretAHistory() {
  const WEBSTAT_API_KEY = process.env.WEBSTAT_API_KEY;

  if (WEBSTAT_API_KEY) {
    try {
      console.log(`  Fetching Livret A (Webstat BdF)...`);
      // 723 observations depuis 1966 — on les récupère toutes en une passe
      const url = `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/observations/records?where=series_key='MIR1.M.FR.B.L23FRLA.D.R.A.2230U6.EUR.O'&order_by=time_period_start ASC&limit=100&offset=0&apikey=${WEBSTAT_API_KEY}`;

      // L'API limite à 100 par page — on pagine pour tout récupérer
      const WEBSTAT_HEADERS = {
        'Authorization': `Apikey ${WEBSTAT_API_KEY}`,
        'Accept': 'application/json'
      };
      let allObs = [];
      let offset = 0;
      let total = null;

      while (total === null || offset < total) {
        const pageUrl = `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/observations/records?where=series_key='MIR1.M.FR.B.L23FRLA.D.R.A.2230U6.EUR.O'&order_by=time_period_start ASC&limit=100&offset=${offset}`;
        const resp = await fetch(pageUrl, { cache: 'no-store', headers: WEBSTAT_HEADERS });
        if (!resp.ok) { console.log(`  ⚠️ Webstat HTTP ${resp.status}`); break; }
        const json = await resp.json();
        if (total === null) total = json.total_count;
        const results = json.results ?? [];
        if (results.length === 0) break;
        allObs = allObs.concat(results);
        offset += results.length;
        if (results.length < 100) break;
      }

      if (allObs.length > 0) {
        const history = allObs
          .filter(r => r.obs_value != null && r.time_period_start)
          .map(r => ({
            date: r.time_period_start.substring(0, 10),
            value: parseFloat(parseFloat(r.obs_value).toFixed(2)),
            timestamp: new Date(r.time_period_start).getTime()
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
        const last = history[history.length - 1];
        console.log(`  ✓ Livret A Webstat: ${history.length} points, ${history[0].date} → ${last.date} = ${last.value}%`);
        return history;
      }
    } catch (error) {
      console.error(`  ⚠️ Erreur Webstat Livret A:`, error.message);
    }
  } else {
    console.log(`  ⚠️ WEBSTAT_API_KEY non définie — fallback historique Livret A`);
  }

  // Fallback : historique hardcodé officiel (Banque de France)
  const changes = [
    { date: "1966-01-01", value: 3.00 }, { date: "1968-01-01", value: 3.50 },
    { date: "1969-06-01", value: 4.00 }, { date: "1970-01-01", value: 4.25 },
    { date: "1974-01-01", value: 6.00 }, { date: "1974-07-01", value: 6.50 },
    { date: "1975-01-01", value: 7.50 }, { date: "1976-01-01", value: 6.50 },
    { date: "1980-04-01", value: 7.50 }, { date: "1981-10-16", value: 8.50 },
    { date: "1983-08-01", value: 7.50 }, { date: "1984-08-16", value: 6.50 },
    { date: "1985-07-01", value: 6.00 }, { date: "1986-05-16", value: 4.50 },
    { date: "1996-02-27", value: 3.50 }, { date: "1998-06-07", value: 3.00 },
    { date: "1999-07-23", value: 2.25 }, { date: "2000-06-29", value: 3.00 },
    { date: "2003-08-01", value: 2.25 }, { date: "2005-08-01", value: 2.00 },
    { date: "2006-02-01", value: 2.25 }, { date: "2006-08-01", value: 2.75 },
    { date: "2007-08-01", value: 3.00 }, { date: "2008-02-01", value: 3.50 },
    { date: "2008-08-01", value: 4.00 }, { date: "2009-02-01", value: 2.50 },
    { date: "2009-05-01", value: 1.75 }, { date: "2009-08-01", value: 1.25 },
    { date: "2010-08-01", value: 1.75 }, { date: "2011-02-01", value: 2.00 },
    { date: "2011-08-01", value: 2.25 }, { date: "2013-02-01", value: 1.75 },
    { date: "2013-08-01", value: 1.25 }, { date: "2014-08-01", value: 1.00 },
    { date: "2015-08-01", value: 0.75 }, { date: "2020-02-01", value: 0.50 },
    { date: "2022-02-01", value: 1.00 }, { date: "2022-08-01", value: 2.00 },
    { date: "2023-02-01", value: 3.00 }, { date: "2024-02-01", value: 3.00 },
    { date: "2025-02-01", value: 2.40 }, { date: "2025-08-01", value: 1.70 },
    { date: "2026-02-01", value: 1.50 },
  ];
  const result = [];
  const start = new Date("2000-01-01");
  const end = new Date();
  let currentRate = changes.filter(c => c.date <= "2000-01-01").slice(-1)[0]?.value ?? 3.00;
  let hIdx = changes.findIndex(c => c.date > "2000-01-01");
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const dateStr = d.toISOString().split('T')[0].substring(0, 7) + '-01';
    while (hIdx < changes.length && dateStr >= changes[hIdx].date) { currentRate = changes[hIdx].value; hIdx++; }
    result.push({ date: dateStr, value: currentRate, timestamp: new Date(dateStr).getTime() });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// 6. PRIX IMMOBILIER — Banque de France Webstat
//    Série RPP.Q.FR.N.ED.00.1.00
//    Indice des prix des logements anciens, France entière, base 100 = 2015
//    Données trimestrielles, glissement annuel calculé
// ─────────────────────────────────────────────────────────────
async function getPrixImmobilierHistory() {
  const WEBSTAT_API_KEY = process.env.WEBSTAT_API_KEY;

  if (WEBSTAT_API_KEY) {
    try {
      console.log(`  Fetching prix immobilier (Webstat BdF RPP)...`);
      // Série trimestrielle — 120 points environ depuis 1996
      const WEBSTAT_HEADERS = {
        'Authorization': `Apikey ${WEBSTAT_API_KEY}`,
        'Accept': 'application/json'
      };
      let allObs = [];
      let offset = 0;
      let total = null;

      while (total === null || offset < total) {
        const pageUrl = `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/observations/records?where=series_key='RPP.Q.FR.N.ED.00.1.00'&order_by=time_period_start ASC&limit=100&offset=${offset}`;
        const resp = await fetch(pageUrl, { cache: 'no-store', headers: WEBSTAT_HEADERS });
        if (!resp.ok) { console.log(`  ⚠️ Webstat RPP HTTP ${resp.status}`); break; }
        const json = await resp.json();
        if (total === null) total = json.total_count;
        const results = json.results ?? [];
        if (results.length === 0) break;
        allObs = allObs.concat(results);
        offset += results.length;
        if (results.length < 100) break;
      }

      if (allObs.length > 0) {
        // Calculer le glissement annuel sur l'indice brut
        const rawPoints = allObs
          .filter(r => r.obs_value != null && r.time_period_start)
          .map(r => ({
            date: r.time_period_start.substring(0, 10),
            value: parseFloat(r.obs_value),
            timestamp: new Date(r.time_period_start).getTime()
          }))
          .sort((a, b) => a.timestamp - b.timestamp);

        // Glissement annuel = (indice_T / indice_T-4 - 1) * 100
        const byDate = {};
        for (const p of rawPoints) byDate[p.date] = p.value;

        const glissement = [];
        for (const p of rawPoints) {
          const dPrev = new Date(p.date);
          dPrev.setFullYear(dPrev.getFullYear() - 1);
          const prevDate = dPrev.toISOString().split('T')[0];
          const prevVal = byDate[prevDate];
          if (prevVal == null || prevVal === 0) continue;
          const variation = parseFloat(((p.value / prevVal - 1) * 100).toFixed(2));
          if (p.date >= '2000-01-01') {
            glissement.push({ date: p.date, value: variation, timestamp: p.timestamp });
          }
        }

        if (glissement.length > 0) {
          const last = glissement[glissement.length - 1];
          console.log(`  ✓ Prix immo Webstat: ${glissement.length} points (glissement annuel), dernier: ${last.date} = ${last.value}%`);
          return glissement;
        }
      }
    } catch (error) {
      console.error(`  ⚠️ Erreur Webstat RPP:`, error.message);
    }
  } else {
    console.log(`  ⚠️ WEBSTAT_API_KEY non définie — fallback prix immobilier`);
  }

  // Fallback données existantes
  if (existingData?.indices?.prixImmo?.historique?.length > 0) {
    console.log(`  ⚠️ Prix immo: utilisation données existantes`);
    return existingData.indices.prixImmo.historique;
  }

  // Fallback historique minimal
  return [
    { date: "2000-01-01", value: 8.5 }, { date: "2005-01-01", value: 12.0 },
    { date: "2010-01-01", value: 3.5 }, { date: "2012-01-01", value: -1.5 },
    { date: "2015-01-01", value: -1.0 }, { date: "2017-01-01", value: 3.5 },
    { date: "2020-01-01", value: 5.5 }, { date: "2022-01-01", value: 5.0 },
    { date: "2023-01-01", value: -4.0 }, { date: "2024-01-01", value: -3.5 },
    { date: "2025-01-01", value: 2.0 },
  ].map(p => ({ ...p, timestamp: new Date(p.date).getTime() }));
}

// ─────────────────────────────────────────────────────────────
// FONCTION GÉNÉRIQUE WEBSTAT — récupère n'importe quelle série
// avec pagination automatique et gestion d'authentification
// ─────────────────────────────────────────────────────────────
async function fetchWebstatSerie(seriesKey, label, startDate = '2000-01-01') {
  if (!WEBSTAT_API_KEY) {
    console.log(`  ⚠️ WEBSTAT_API_KEY non définie — ${label} indisponible`);
    return [];
  }
  try {
    console.log(`  Fetching ${label} (Webstat BdF)...`);
    const headers = { 'Authorization': `Apikey ${WEBSTAT_API_KEY}`, 'Accept': 'application/json' };
    const whereClause = encodeURIComponent(`series_key='${seriesKey}' AND time_period_start>='${startDate}'`);
    let allObs = [], offset = 0, total = null;

    while (total === null || offset < total) {
      const url = `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/observations/records?where=${whereClause}&order_by=time_period_start ASC&limit=100&offset=${offset}`;
      const resp = await fetch(url, { cache: 'no-store', headers });
      if (!resp.ok) { console.log(`  ⚠️ Webstat ${label} HTTP ${resp.status}`); break; }
      const json = await resp.json();
      if (total === null) total = json.total_count;
      const results = json.results ?? [];
      if (results.length === 0) break;
      allObs = allObs.concat(results);
      offset += results.length;
      if (results.length < 100) break;
    }

    if (allObs.length > 0) {
      const history = allObs
        .filter(r => r.obs_value != null && r.time_period_start)
        .map(r => ({
          date: r.time_period_start.substring(0, 10),
          value: parseFloat(parseFloat(r.obs_value).toFixed(3)),
          timestamp: new Date(r.time_period_start).getTime()
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      const last = history[history.length - 1];
      console.log(`  ✓ ${label}: ${history.length} points, dernier: ${last.date} = ${last.value}%`);
      return history;
    }
    console.log(`  ⚠️ ${label}: aucune observation retournée`);
  } catch (error) {
    console.error(`  ⚠️ Erreur Webstat ${label}:`, error.message);
  }
  return [];
}

// ─────────────────────────────────────────────────────────────
// 8. TEC 10 ANS — Taux de l'Échéance Constante 10 ans
//    Série FM.D.FR.EUR.FR2.BB.FRMOYTEC10.HSTA (quotidienne, J+1)
//    Source officielle BdF, plus à jour que l'OAT FRED mensuelle
// ─────────────────────────────────────────────────────────────
async function getTec10History() {
  const data = await fetchWebstatSerie(
    'FM.D.FR.EUR.FR2.BB.FRMOYTEC10.HSTA',
    'TEC 10 ans',
    '2000-01-01'
  );
  // Fallback sur données existantes
  if (data.length === 0 && existingData?.indices?.tec10?.historique?.length > 0) {
    console.log(`  ⚠️ TEC 10: utilisation données existantes`);
    return existingData.indices.tec10.historique;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// 9. TAUX CRÉDIT IMMOBILIER — nouveaux crédits habitat, > 1 an
//    Série MIR1.M.FR.B.A22.K.R.A.2254U6.EUR.N (mensuelle)
//    Remplace le fallback BCE MIR qui ne fonctionnait pas
// ─────────────────────────────────────────────────────────────
async function getTauxCreditImmoHistory() {
  const data = await fetchWebstatSerie(
    'MIR1.M.FR.B.A22.K.R.A.2254U6.EUR.N',
    'Taux crédit immo',
    '2003-01-01'
  );
  if (data.length === 0 && existingData?.indices?.tauxImmo?.historique?.length > 0) {
    console.log(`  ⚠️ Taux crédit immo: utilisation données existantes`);
    return existingData.indices.tauxImmo.historique;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// 10. TAUX PEL — Plan d'Épargne Logement (nouveaux PEL)
//     Série MIR1.M.FR.B.L22FRSP.H.R.A.2250U6.EUR.N (mensuelle)
// ─────────────────────────────────────────────────────────────
async function getTauxPelHistory() {
  const data = await fetchWebstatSerie(
    'MIR1.M.FR.B.L22FRSP.H.R.A.2250U6.EUR.N',
    'Taux PEL',
    '2000-01-01'
  );
  if (data.length === 0 && existingData?.indices?.pel?.historique?.length > 0) {
    console.log(`  ⚠️ Taux PEL: utilisation données existantes`);
    return existingData.indices.pel.historique;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// €STR — Euro Short-Term Rate (BCE, quotidien, depuis oct. 2019)
//     Série FM.B.U2.EUR.RT.MM.ESTRXO.HSTA (ECB Data Portal, sans clé)
// ─────────────────────────────────────────────────────────────
async function getEstrHistory() {
  try {
    console.log('  Fetching €STR (ECB Data Portal)...');
    const url = 'https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.RT.MM.ESTRXO.HSTA?startPeriod=2019-10-01&format=jsondata&detail=dataonly';
    const resp = await fetch(url, { cache: 'no-store', headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const dates = json.structure?.dimensions?.observation?.[0]?.values ?? [];
    const values = Object.entries(json.dataSets?.[0]?.series?.['0:0:0:0:0:0:0']?.observations ?? {});
    const result = values
      .map(([idx, [val]]) => ({ date: dates[parseInt(idx)]?.id, value: parseFloat(parseFloat(val).toFixed(3)) }))
      .filter(p => p.date && !isNaN(p.value))
      .map(p => ({ ...p, timestamp: new Date(p.date).getTime() }))
      .sort((a, b) => a.timestamp - b.timestamp);
    if (result.length > 0) {
      console.log(`  ✓ €STR ECB: ${result.length} points, dernier: ${result[result.length-1].date} = ${result[result.length-1].value}`);
      return result;
    }
    throw new Error('no data');
  } catch (e) {
    console.log(`  ⚠️ €STR ECB: ${e.message}, tentative FRED...`);
    const fred = await fetchFredSeries('ECBESTRVOLWGTTRMDMNRT');
    if (fred.length > 0) return fred;
    console.log('  ⚠️ €STR: utilisation données existantes');
    return existingData?.indices?.estr?.historique ?? [];
  }
}

// ─────────────────────────────────────────────────────────────
// OIL PRICE API — Brent & TTF (api.oilpriceapi.com)
//     Clé: OILPRICEAPI_API_KEY
//     Codes: BRENT_CRUDE_USD, DUTCH_TTF_EUR
// ─────────────────────────────────────────────────────────────
const OILPRICEAPI_KEY = process.env.OILPRICEAPI_API_KEY || '';

// Récupère le dernier point OilPriceAPI et le merge avec une liste existante
async function fetchOilPriceLatest(productCode, label) {
  if (!OILPRICEAPI_KEY) return null;
  const parseItem = (p) => {
    const date = (p.created_at ?? p.date ?? p.time ?? '').slice(0, 10);
    const value = parseFloat(parseFloat(p.price ?? p.value ?? p.close ?? 0).toFixed(2));
    return { date, value, timestamp: new Date(date).getTime() };
  };
  try {
    const headers = { 'Authorization': `Token ${OILPRICEAPI_KEY}`, 'Accept': 'application/json' };
    const resp = await fetch(`https://api.oilpriceapi.com/v1/prices/latest?by_code=${productCode}`, { cache: 'no-store', headers });
    if (!resp.ok) { console.log(`  DEBUG OilPriceAPI HTTP ${resp.status}`); throw new Error(`HTTP ${resp.status}`); }
    const json = await resp.json();
    const items = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
    const points = items.map(parseItem).filter(p => p.date && !isNaN(p.value) && p.value > 0);
    return points.length > 0 ? points[points.length - 1] : null;
  } catch (e) {
    console.log(`  ⚠️ OilPriceAPI ${label}: ${e.message}`);
    return null;
  }
}

// Brent : historique long via Yahoo Finance BZ=F + dernier point OilPriceAPI
async function fetchBrentHistory() {
  console.log(`  Fetching Pétrole Brent (Yahoo BZ=F + OilPriceAPI)...`);
  const yahooHistory = await fetchYahooHistoryWithFallback('BZ=F');
  const latestPoint = await fetchOilPriceLatest('BRENT_CRUDE_USD', 'Brent');
  const base = yahooHistory.length > 0 ? yahooHistory : (existingData?.indices?.brent?.historique ?? []);
  if (!latestPoint) {
    console.log(`  ✓ Pétrole Brent: ${base.length} points (Yahoo uniquement)`);
    return base;
  }
  const seen = new Map(base.map(p => [p.date, p]));
  seen.set(latestPoint.date, latestPoint);
  const merged = [...seen.values()].sort((a, b) => a.timestamp - b.timestamp);
  console.log(`  ✓ Pétrole Brent: ${merged.length} points (Yahoo+OilPriceAPI), dernier: ${latestPoint.date} = ${latestPoint.value}`);
  return merged;
}

// Gaz TTF : Yahoo Finance TTF=F pour l'historique + OilPriceAPI pour la dernière valeur
async function fetchGazTTFHistory() {
  console.log(`  Fetching Gaz TTF (Yahoo TTF=F + OilPriceAPI)...`);

  // Historique via Yahoo Finance TTF=F (futures TTF EUR/MWh)
  const yahooRaw = await fetchYahooHistoryWithFallback('TTF=F');
  // Filtrer les valeurs aberrantes (< 10 = probablement pas du TTF EUR/MWh)
  const yahooTTF = yahooRaw.filter(p => p.value > 1);

  // Conserver les points existants clairement TTF (> 10 EUR/MWh) comme fallback
  const existing = (existingData?.indices?.gaz?.historique ?? []).filter(p => p.value > 1);

  // Base : Yahoo si on a des données, sinon existing
  const base = yahooTTF.length > 0 ? yahooTTF : existing;

  // Dernier point OilPriceAPI (DUTCH_TTF_EUR) pour la valeur la plus fraîche
  const latestPoint = await fetchOilPriceLatest('DUTCH_TTF_EUR', 'Gaz TTF');

  if (!latestPoint) {
    console.log(`  ✓ Gaz TTF: ${base.length} points (Yahoo uniquement)`);
    return base;
  }

  const seen = new Map(base.map(p => [p.date, p]));
  seen.set(latestPoint.date, latestPoint);
  const merged = [...seen.values()].sort((a, b) => a.timestamp - b.timestamp);
  console.log(`  ✓ Gaz TTF: ${merged.length} points (Yahoo+OilPriceAPI), dernier: ${latestPoint.date} = ${latestPoint.value} EUR/MWh`);
  return merged;
}

// ─────────────────────────────────────────────────────────────
// 11. TAUX DE DÉPÔT BCE — Facilité de dépôt (taux plancher)
//     Série FM.D.U2.EUR.4F.KR.DFR.LEV (quotidienne, J+1)
// ─────────────────────────────────────────────────────────────
async function getTauxDepotBCEHistory() {
  const data = await fetchWebstatSerie(
    'FM.D.U2.EUR.4F.KR.DFR.LEV',
    'Taux dépôt BCE',
    '2000-01-01'
  );
  if (data.length === 0 && existingData?.indices?.tauxDepotBCE?.historique?.length > 0) {
    console.log(`  ⚠️ Taux dépôt BCE: utilisation données existantes`);
    return existingData.indices.tauxDepotBCE.historique;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// 12. SCPI — Données historiques approximatives ASPIM/IEIF
// ─────────────────────────────────────────────────────────────
function getScpiHistory() {
  return [
    { date: "2000-01-01", value: 7.20 },
    { date: "2001-01-01", value: 7.10 },
    { date: "2002-01-01", value: 6.90 },
    { date: "2003-01-01", value: 6.70 },
    { date: "2004-01-01", value: 6.40 },
    { date: "2005-01-01", value: 6.00 },
    { date: "2006-01-01", value: 5.60 },
    { date: "2007-01-01", value: 5.40 },
    { date: "2008-01-01", value: 5.70 },
    { date: "2009-01-01", value: 5.90 },
    { date: "2010-01-01", value: 5.60 },
    { date: "2011-01-01", value: 5.40 },
    { date: "2012-01-01", value: 5.30 },
    { date: "2013-01-01", value: 5.10 },
    { date: "2014-01-01", value: 5.00 },
    { date: "2015-01-01", value: 4.85 },
    { date: "2016-01-01", value: 4.70 },
    { date: "2017-01-01", value: 4.55 },
    { date: "2018-01-01", value: 4.50 },
    { date: "2019-01-01", value: 4.45 },
    { date: "2020-01-01", value: 4.40 },
    { date: "2021-01-01", value: 4.49 },
    { date: "2022-01-01", value: 4.53 },
    { date: "2023-01-01", value: 4.52 },
    { date: "2024-01-01", value: 4.52 },
    { date: "2025-01-01", value: 4.55 },
    { date: "2026-01-01", value: 4.67 },
  ];
}


// ─────────────────────────────────────────────────────────────
// 13. FONDS EUROS — Taux moyen marché (France Assureurs / ACPR)
//     Données annuelles hardcodées, mise à jour 1x/an (mars)
//     Sources : France Assureurs, ACPR, MoneyVox
// ─────────────────────────────────────────────────────────────
function getFondsEurosHistory() {
  // Taux moyen annuel publié par France Assureurs / ACPR
  // Mis à jour chaque année en mars (publication avec 1 an de décalage)
  const annualRates = [
    { year: 2000, value: 5.30 },
    { year: 2001, value: 5.10 },
    { year: 2002, value: 4.90 },
    { year: 2003, value: 4.50 },
    { year: 2004, value: 4.40 },
    { year: 2005, value: 4.20 },
    { year: 2006, value: 4.05 },
    { year: 2007, value: 4.10 },
    { year: 2008, value: 3.98 },
    { year: 2009, value: 3.65 },
    { year: 2010, value: 3.40 },
    { year: 2011, value: 3.00 },
    { year: 2012, value: 2.90 },
    { year: 2013, value: 2.80 },
    { year: 2014, value: 2.50 },
    { year: 2015, value: 2.30 },
    { year: 2016, value: 1.93 },
    { year: 2017, value: 1.80 },
    { year: 2018, value: 1.80 },
    { year: 2019, value: 1.46 },
    { year: 2020, value: 1.30 },
    { year: 2021, value: 1.28 }, // source France Assureurs
    { year: 2022, value: 1.90 }, // source France Assureurs
    { year: 2023, value: 2.60 }, // source France Assureurs / ACPR
    { year: 2024, value: 2.60 }, // source France Assureurs / ACPR (confirmé mars 2025)
    { year: 2025, value: 2.50 }, // estimation MoneyVox / Meilleurtaux (en cours d'annonce)
  ];

  // Générer un point par mois (taux constant sur l'année)
  const result = [];
  for (const { year, value } of annualRates) {
    for (let month = 1; month <= 12; month++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      if (dateStr > new Date().toISOString().split('T')[0]) break;
      result.push({ date: dateStr, value, timestamp: new Date(dateStr).getTime() });
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  MISE À JOUR TAUX.JSON - HISTORIQUE 20+ ANS");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (!FRED_API_KEY) {
    console.log("⚠️  FRED_API_KEY non définie - les données FRED seront conservées depuis le fichier existant");
    console.log("   Pour obtenir une clé gratuite: https://fred.stlouisfed.org/docs/api/api_key.html\n");
  }

  // OAT 10 ans : FRED (historique) + BCE (mois récents manquants)
  console.log("📊 Récupération OAT 10 ans (FRED + BCE)...");
  const historyOat = await getOatHistory();

  // Inflation : INSEE BDM (série principale + secours) puis FRED
  console.log("\n📊 Récupération Inflation France (INSEE BDM)...");
  const historyInflation = await getInflationFromIndex();

  // €STR : ECB Data Portal (sans clé) avec fallback FRED
  console.log("\n📊 Récupération €STR (ECB)...");
  const historyEstr = await getEstrHistory();

  // Devises
  console.log("\n📈 Récupération des données Yahoo Finance...");
  // Helper : Yahoo avec fallback sur données existantes si vide
  const yahooWithFallback = async (ticker, existingKey) => {
    const data = await fetchYahooHistoryWithFallback(ticker);
    if (data.length === 0 && existingData?.indices?.[existingKey]?.historique?.length > 0) {
      console.log(`  ⚠️ ${ticker}: Yahoo vide, conservation des ${existingData.indices[existingKey].historique.length} points existants`);
      return existingData.indices[existingKey].historique;
    }
    return data;
  };

  const historyEurUsd = await yahooWithFallback('EURUSD=X', 'eurusd');
  const historyEurGbp = await yahooWithFallback('EURGBP=X', 'eurgbp');
  const historyEurJpy = await yahooWithFallback('EURJPY=X', 'eurjpy');
  const historyEurChf = await yahooWithFallback('EURCHF=X', 'eurchf');
  const historyEurCny = await yahooWithFallback('EURCNY=X', 'eurcny');

  // Indices boursiers
  console.log("\n📊 Récupération des indices boursiers...");
  const historyCac40    = await yahooWithFallback('%5EFCHI', 'cac40');
  const historyCacMid   = await yahooWithFallback('C6E.PA', 'cacmid');
  const historyStoxx50  = await yahooWithFallback('%5ESTOXX50E', 'stoxx50');
  const historyDax      = await yahooWithFallback('%5EGDAXI', 'dax');
  const historyFtse     = await yahooWithFallback('%5EFTSE', 'ftse');
  const historyNikkei   = await yahooWithFallback('%5EN225', 'nikkei');
  const historySP500    = await yahooWithFallback('%5EGSPC', 'sp500');
  const historyNasdaq   = await yahooWithFallback('%5ENDX', 'nasdaq');
  const historyWorld    = await yahooWithFallback('URTH', 'world');
  const historyEmerging = await yahooWithFallback('EEM', 'emerging');

  // Matières premières & crypto
  console.log("\n💰 Récupération matières premières et crypto...");
  const historyBrent = await fetchBrentHistory();
  const historyGaz   = await fetchGazTTFHistory();
  const historyGold  = await yahooWithFallback('GC=F', 'gold');
  const historyBtc   = await yahooWithFallback('BTC-USD', 'btc');
  const historyEth   = await yahooWithFallback('ETH-USD', 'eth');
  const historySol   = await yahooWithFallback('SOL-USD', 'sol');
  const historyXrp   = await yahooWithFallback('XRP-USD', 'xrp');
  // Livret A, Prix immobilier + nouvelles séries Webstat
  console.log("\n🏦 Récupération données Webstat BdF...");
  const historyLivretA      = await getLivretAHistory();
  const historyPrixImmo     = await getPrixImmobilierHistory();
  const historyTec10        = await getTec10History();
  const historyTauxImmo     = await getTauxCreditImmoHistory();
  const historyPel          = await getTauxPelHistory();
  const historyTauxDepotBCE = await getTauxDepotBCEHistory();
  const historyScpi         = getScpiHistory();
  const historyFondsEuros   = getFondsEurosHistory();

  // Obligations d'État étrangères 10 ans
  console.log("\n🌍 Récupération obligations d'État étrangères (10 ans)...");
  const historyUs10y = await yahooWithFallback('%5ETNX', 'us10y');            // US Treasury (Yahoo, quotidien)
  const historyBund  = await fetchEcbBondMonthly('DE', 'Bund DE', 'bund');    // Bund allemand (ECB, mensuel)
  const historyJgb   = await fetchFredSeries('IRLTLT01JPM156N');              // JGB japonais (FRED, mensuel)
  const historyGilt  = await fetchFredSeries('IRLTLT01GBM156N');              // Gilt britannique (FRED, mensuel)

  const getLast = (arr) => arr && arr.length ? arr[arr.length - 1].value : null;

  const calculateAnnualizedPerformance = (historique, years) => {
    if (!historique || historique.length < 2) return null;

    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setFullYear(targetDate.getFullYear() - years);

    const currentValue = historique[historique.length - 1]?.value;
    let pastValue = null;

    for (let i = historique.length - 1; i >= 0; i--) {
      const pointDate = new Date(historique[i].date);
      if (pointDate <= targetDate) {
        pastValue = historique[i].value;
        break;
      }
    }

    if (pastValue === null && historique.length > 0) {
      const firstPoint = historique[0];
      const firstDate = new Date(firstPoint.date);
      const actualYears = (now - firstDate) / (365.25 * 24 * 60 * 60 * 1000);
      if (actualYears < years * 0.5) return null;
      pastValue = firstPoint.value;
      years = actualYears;
    }

    if (!pastValue || !currentValue || pastValue <= 0 || currentValue <= 0) return null;

    const performance = (Math.pow(currentValue / pastValue, 1 / years) - 1) * 100;
    return parseFloat(performance.toFixed(2));
  };

  const createIndexData = (titre, valeur, suffixe, historique) => {
    const data = { titre, valeur, suffixe, historique };

    if (suffixe !== '%' && historique && historique.length > 0) {
      data.performances = {
        annualisee_1an:  calculateAnnualizedPerformance(historique, 1),
        annualisee_3ans: calculateAnnualizedPerformance(historique, 3),
        annualisee_5ans: calculateAnnualizedPerformance(historique, 5)
      };
    }

    return data;
  };

  const nouvellesDonnees = {
    date_mise_a_jour: new Date().toISOString(),
    indices: {
      // Taux de marché France
      oat:          { titre: "OAT 10 ans",        valeur: getLast(historyOat),          suffixe: "%", historique: historyOat },
      tec10:        { titre: "TEC 10 ans",         valeur: getLast(historyTec10),         suffixe: "%", historique: historyTec10 },
      estr:         { titre: "€STR",               valeur: getLast(historyEstr),          suffixe: "%", historique: historyEstr },
      tauxDepotBCE: { titre: "Taux dépôt BCE",     valeur: getLast(historyTauxDepotBCE),  suffixe: "%", historique: historyTauxDepotBCE },
      inflation:    { titre: "Inflation France",   valeur: getLast(historyInflation),     suffixe: "%", historique: historyInflation },
      tauxImmo:     { titre: "Taux crédit immo",   valeur: getLast(historyTauxImmo),      suffixe: "%", historique: historyTauxImmo },
      prixImmo:     { titre: "Prix immo (var.an.)",valeur: getLast(historyPrixImmo),      suffixe: "%", historique: historyPrixImmo },

      // Obligations d'État étrangères 10 ans
      us10y: { titre: "Treasury US 10 ans",      valeur: getLast(historyUs10y), suffixe: "%", historique: historyUs10y },
      bund:  { titre: "Bund allemand 10 ans",    valeur: getLast(historyBund),  suffixe: "%", historique: historyBund  },
      jgb:   { titre: "JGB japonais 10 ans",     valeur: getLast(historyJgb),   suffixe: "%", historique: historyJgb   },
      gilt:  { titre: "Gilt britannique 10 ans", valeur: getLast(historyGilt),  suffixe: "%", historique: historyGilt  },

      // Épargne réglementée
      livreta:    { titre: "Livret A",           valeur: getLast(historyLivretA),    suffixe: "%", historique: historyLivretA },
      pel:        { titre: "PEL",                valeur: getLast(historyPel),        suffixe: "%", historique: historyPel },
      fondsEuros: { titre: "Fonds euros (moy.)", valeur: getLast(historyFondsEuros), suffixe: "%", historique: historyFondsEuros },
      scpi:       { titre: "Moyenne SCPI",       valeur: getLast(historyScpi),       suffixe: "%", historique: historyScpi },

      // Devises
      eurusd:   createIndexData("EUR / USD", getLast(historyEurUsd), "$",   historyEurUsd),
      eurgbp:   createIndexData("EUR / GBP", getLast(historyEurGbp), "£",   historyEurGbp),
      eurjpy:   createIndexData("EUR / JPY", getLast(historyEurJpy), "¥",   historyEurJpy),
      eurchf:   createIndexData("EUR / CHF", getLast(historyEurChf), "CHF", historyEurChf),
      eurcny:   createIndexData("EUR / CNY", getLast(historyEurCny), "¥",   historyEurCny),

      // Actions
      cac40:    createIndexData("CAC 40",        getLast(historyCac40),    "pts", historyCac40),
      cacmid:   createIndexData("CAC Mid 60",    getLast(historyCacMid),   "pts", historyCacMid),
      stoxx50:  createIndexData("Euro Stoxx 50", getLast(historyStoxx50),  "pts", historyStoxx50),
      dax:      createIndexData("DAX",           getLast(historyDax),     "pts", historyDax),
      ftse:     createIndexData("FTSE 100",      getLast(historyFtse),    "pts", historyFtse),
      nikkei:   createIndexData("Nikkei 225",    getLast(historyNikkei),  "pts", historyNikkei),
      sp500:    createIndexData("S&P 500",        getLast(historySP500),   "pts", historySP500),
      nasdaq:   createIndexData("Nasdaq 100",    getLast(historyNasdaq),  "pts", historyNasdaq),
      world:    createIndexData("MSCI World",    getLast(historyWorld),   "$",   historyWorld),
      emerging: createIndexData("Émergents",     getLast(historyEmerging),"$",   historyEmerging),

      // Matières premières
      brent:    createIndexData("Pétrole (Brent)",  getLast(historyBrent), "$", historyBrent),
      gold:     createIndexData("Or (Once)",         getLast(historyGold),  "$", historyGold),
      gaz:      createIndexData("Gaz naturel (TTF)", getLast(historyGaz),   "€", historyGaz),

      // Crypto
      btc:      createIndexData("Bitcoin",   getLast(historyBtc), "$", historyBtc),
      eth:      createIndexData("Ethereum",  getLast(historyEth), "$", historyEth),
      sol:      createIndexData("Solana",    getLast(historySol), "$", historySol),
      xrp:      createIndexData("XRP",       getLast(historyXrp), "$", historyXrp),
    }
  };

  // Résumé final
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  RÉSUMÉ DES DONNÉES");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  OAT 10 ans   : ${nouvellesDonnees.indices.oat.valeur}% (dernier: ${historyOat[historyOat.length-1]?.date ?? 'N/A'})`);
  console.log(`  TEC 10 ans   : ${nouvellesDonnees.indices.tec10.valeur}% (dernier: ${historyTec10[historyTec10.length-1]?.date ?? 'N/A'})`);
  console.log(`  Inflation    : ${nouvellesDonnees.indices.inflation.valeur}% (dernier: ${historyInflation[historyInflation.length-1]?.date ?? 'N/A'})`);
  console.log(`  Taux dépôt   : ${nouvellesDonnees.indices.tauxDepotBCE.valeur}% (dernier: ${historyTauxDepotBCE[historyTauxDepotBCE.length-1]?.date ?? 'N/A'})`);
  console.log(`  Livret A     : ${nouvellesDonnees.indices.livreta.valeur}% (dernier: ${historyLivretA[historyLivretA.length-1]?.date ?? 'N/A'})`);
  console.log(`  PEL          : ${nouvellesDonnees.indices.pel.valeur}% (dernier: ${historyPel[historyPel.length-1]?.date ?? 'N/A'})`);
  console.log(`  Taux immo    : ${nouvellesDonnees.indices.tauxImmo.valeur}% (dernier: ${historyTauxImmo[historyTauxImmo.length-1]?.date ?? 'N/A'})`);
  console.log(`  Prix immo    : ${nouvellesDonnees.indices.prixImmo.valeur}% var/an (dernier: ${historyPrixImmo[historyPrixImmo.length-1]?.date ?? 'N/A'})`);
  console.log(`  €STR         : ${nouvellesDonnees.indices.estr.valeur}% (dernier: ${historyEstr[historyEstr.length-1]?.date ?? 'N/A'})`);

  // Validation : au moins 50% des indices doivent avoir des données
  const allIndices = Object.values(nouvellesDonnees.indices);
  const withData = allIndices.filter(i => i.historique && i.historique.length > 0);
  console.log(`\n📋 Validation: ${withData.length}/${allIndices.length} indices avec données`);
  if (withData.length < allIndices.length * 0.5) {
    console.error(`\n❌ ABANDON: trop d'indices sans données (${withData.length}/${allIndices.length}). taux.json non écrasé.`);
    process.exit(1);
  }

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
  console.log("\n✅ Fichier taux.json généré avec succès.\n");
}

main().catch(err => { console.error('❌ Erreur fatale:', err); process.exit(1); });
