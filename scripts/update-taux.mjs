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
  'ECBESTRVOLWGTTRMDMNRT': 'estr'
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
// 2. OAT 10 ANS — SOURCE COMPLÉMENTAIRE : Banque de France Webstat
//    Série FM.M.FR.EUR.FR2.BB.FR10YT_RR.YLD (mensuelle, quasi temps réel)
//    Utilisée pour compléter les données FRED avec les mois récents manquants
// ─────────────────────────────────────────────────────────────
// Récupère les données OAT récentes depuis l'API de la BCE
// Série IRS : taux d'intérêt à long terme, France, mensuel
// Nouveau endpoint data-api.ecb.europa.eu (l'ancien sdw-wsrest a été retiré en oct. 2025)
async function getOatRecentFromECB() {
  try {
    console.log(`  Fetching BCE (OAT 10 ans récent)...`);
    const startPeriod = new Date();
    startPeriod.setFullYear(startPeriod.getFullYear() - 3);
    const startStr = startPeriod.toISOString().substring(0, 7);

    // Clé SDMX : Fréquence=M, Pays=FR, Maturité=Long terme, Instrument=Obligations d'État 10 ans
    const url = `https://data-api.ecb.europa.eu/service/data/IRS/M.FR.L.L40.CI.0000.EUR.N.Z?startPeriod=${startStr}&format=jsondata&detail=dataonly`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.log(`  ⚠️ BCE HTTP ${response.status} — tentative format XML...`);
      // Fallback: essayer le format XML générique
      const urlXml = `https://data-api.ecb.europa.eu/service/data/IRS/M.FR.L.L40.CI.0000.EUR.N.Z?startPeriod=${startStr}`;
      const resp2 = await fetch(urlXml, { cache: 'no-store', headers: { 'Accept': 'application/xml' } });
      if (!resp2.ok) {
        console.log(`  ⚠️ BCE XML HTTP ${resp2.status}`);
        return [];
      }
      const xmlText = await resp2.text();
      const observations = [];
      const obsRegex = /TIME_PERIOD="([^"]+)"[^>]*OBS_VALUE="([^"]+)"/g;
      let m;
      while ((m = obsRegex.exec(xmlText)) !== null) {
        const date = m[1].length === 7 ? `${m[1]}-01` : m[1];
        const val = parseFloat(m[2]);
        if (!isNaN(val)) observations.push({ date, value: parseFloat(val.toFixed(2)), timestamp: new Date(date).getTime() });
      }
      if (observations.length > 0) {
        observations.sort((a, b) => a.timestamp - b.timestamp);
        const last = observations[observations.length - 1];
        console.log(`  ✓ BCE OAT (XML): ${observations.length} points, dernier: ${last.date} = ${last.value}%`);
        return observations;
      }
      return [];
    }

    const json = await response.json();

    // Format SDMX-JSON BCE :
    // - Les observations sont dans dataSets[0].series["0:0:0:0:0:0:0:0:0"].observations
    //   sous forme d'objet { "0": [valeur,...], "1": [valeur,...], ... }
    // - Les périodes correspondantes sont dans structure.dimensions.observation[0].values
    const seriesObs = json?.dataSets?.[0]?.series?.['0:0:0:0:0:0:0:0:0']?.observations;
    const allPeriods = json?.structure?.dimensions?.observation?.[0]?.values;

    if (!seriesObs || !allPeriods) {
      console.log(`  ⚠️ BCE: structure JSON inattendue`);
      return [];
    }

    const observations = [];
    for (const [idx, obs] of Object.entries(seriesObs)) {
      const periodObj = allPeriods[parseInt(idx)];
      if (!periodObj || obs[0] == null) continue;
      const period = periodObj.id; // ex: "2026-02"
      const date = `${period}-01`;
      const numValue = parseFloat(obs[0]);
      if (!isNaN(numValue)) {
        observations.push({ date, value: parseFloat(numValue.toFixed(2)), timestamp: new Date(date).getTime() });
      }
    }

    if (observations.length > 0) {
      observations.sort((a, b) => a.timestamp - b.timestamp);
      const last = observations[observations.length - 1];
      console.log(`  ✓ BCE OAT: ${observations.length} points récents, dernier: ${last.date} = ${last.value}%`);
      return observations;
    }

    console.log(`  ⚠️ BCE: aucune observation parsée`);
    return [];
  } catch (error) {
    console.error(`  ⚠️ Erreur BCE:`, error.message);
    return [];
  }
}

// Fusion FRED (historique long) + BCE (données récentes)
async function getOatHistory() {
  // 1. Récupérer l'historique long depuis FRED
  const fredData = await fetchFredSeries('IRLTLT01FRM156N');

  // 2. Récupérer les données récentes depuis la BCE
  const ecbData = await getOatRecentFromECB();

  if (fredData.length === 0 && ecbData.length === 0) {
    if (existingData?.indices?.oat?.historique?.length > 0) {
      console.log(`  ⚠️ OAT: utilisation des données existantes`);
      return existingData.indices.oat.historique;
    }
    return [];
  }

  if (ecbData.length === 0) return fredData;
  if (fredData.length === 0) return ecbData;

  // Fusionner : FRED comme base historique, BCE pour les mois manquants récents
  const lastFredDate = fredData[fredData.length - 1].date;
  const newEcbPoints = ecbData.filter(d => d.date > lastFredDate);

  if (newEcbPoints.length > 0) {
    const merged = [...fredData, ...newEcbPoints];
    const lastNew = newEcbPoints[newEcbPoints.length - 1];
    console.log(`  ✓ OAT fusionné: ${merged.length} points (FRED → ${lastFredDate}, +${newEcbPoints.length} points BCE → ${lastNew.date})`);
    return merged;
  }

  console.log(`  ℹ️ OAT: BCE n'apporte pas de nouveaux points au-delà de FRED (${lastFredDate})`);
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
      let allObs = [];
      let offset = 0;
      let total = null;

      while (total === null || offset < total) {
        const pageUrl = `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/observations/records?where=series_key='MIR1.M.FR.B.L23FRLA.D.R.A.2230U6.EUR.O'&order_by=time_period_start ASC&limit=100&offset=${offset}&apikey=${WEBSTAT_API_KEY}`;
        const resp = await fetch(pageUrl, { cache: 'no-store' });
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
      let allObs = [];
      let offset = 0;
      let total = null;

      while (total === null || offset < total) {
        const pageUrl = `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/observations/records?where=series_key='RPP.Q.FR.N.ED.00.1.00'&order_by=time_period_start ASC&limit=100&offset=${offset}&apikey=${WEBSTAT_API_KEY}`;
        const resp = await fetch(pageUrl, { cache: 'no-store' });
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
// 7. SCPI — Données historiques approximatives ASPIM/IEIF
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
    { date: "2026-01-01", value: 4.58 },
  ];
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

  // €STR : FRED
  console.log("\n📊 Récupération €STR (FRED)...");
  const historyEstr = await fetchFredSeries('ECBESTRVOLWGTTRMDMNRT');

  // Devises
  console.log("\n📈 Récupération des données Yahoo Finance...");
  const historyEurUsd = await fetchYahooHistoryWithFallback('EURUSD=X');

  // Indices boursiers
  console.log("\n📊 Récupération des indices boursiers...");
  const historyCac40    = await fetchYahooHistoryWithFallback('%5EFCHI');
  const historyCacMid   = await fetchYahooHistoryWithFallback('C6E.PA');
  const historyStoxx50  = await fetchYahooHistoryWithFallback('%5ESTOXX50E');
  const historySP500    = await fetchYahooHistoryWithFallback('%5EGSPC');
  const historyNasdaq   = await fetchYahooHistoryWithFallback('%5ENDX');
  const historyWorld    = await fetchYahooHistoryWithFallback('URTH');
  const historyEmerging = await fetchYahooHistoryWithFallback('EEM');

  // Matières premières & crypto
  console.log("\n💰 Récupération matières premières et crypto...");
  const historyBrent = await fetchYahooHistoryWithFallback('BZ=F');
  const historyGold  = await fetchYahooHistoryWithFallback('GC=F');
  const historyBtc   = await fetchYahooHistoryWithFallback('BTC-USD');
  // Livret A & Prix immobilier
  console.log("\n🏦 Récupération Livret A et prix immobilier (Webstat BdF)...");
  const historyLivretA   = await getLivretAHistory();
  const historyPrixImmo  = await getPrixImmobilierHistory();
  const historyScpi  = getScpiHistory();

  const getLast = (arr) => arr && arr.length ? arr[arr.length - 1].value : 0;

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
      // Taux (pas de performance annualisée)
      oat:       { titre: "OAT 10 ans",       valeur: getLast(historyOat),       suffixe: "%", historique: historyOat },
      inflation: { titre: "Inflation France", valeur: getLast(historyInflation), suffixe: "%", historique: historyInflation },
      estr:      { titre: "€STR",             valeur: getLast(historyEstr),      suffixe: "%", historique: historyEstr },
      livreta:   { titre: "Livret A",           valeur: getLast(historyLivretA),   suffixe: "%", historique: historyLivretA },
      prixImmo:  { titre: "Prix immo (var. annuelle)", valeur: getLast(historyPrixImmo), suffixe: "%", historique: historyPrixImmo },

      // Devises et indices avec performances annualisées
      eurusd:   createIndexData("Euro / Dollar",    getLast(historyEurUsd),   "$",   historyEurUsd),
      cac40:    createIndexData("CAC 40",           getLast(historyCac40),    "pts", historyCac40),
      cacmid:   createIndexData("CAC Mid 60",       getLast(historyCacMid),   "pts", historyCacMid),
      stoxx50:  createIndexData("Euro Stoxx 50",    getLast(historyStoxx50),  "pts", historyStoxx50),
      sp500:    createIndexData("S&P 500",          getLast(historySP500),    "pts", historySP500),
      nasdaq:   createIndexData("Nasdaq 100",       getLast(historyNasdaq),   "pts", historyNasdaq),
      world:    createIndexData("MSCI World",       getLast(historyWorld),    "$",   historyWorld),
      emerging: createIndexData("Émergents",        getLast(historyEmerging), "$",   historyEmerging),
      brent:    createIndexData("Pétrole (Brent)",  getLast(historyBrent),    "$",   historyBrent),
      gold:     createIndexData("Or (Once)",        getLast(historyGold),     "$",   historyGold),
      btc:      createIndexData("Bitcoin",          getLast(historyBtc),      "$",   historyBtc),

      // SCPI (taux, pas de performance)
      scpi: { titre: "Moyenne SCPI", valeur: getLast(historyScpi), suffixe: "%", historique: historyScpi },
    }
  };

  // Résumé final
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  RÉSUMÉ DES DONNÉES");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  OAT 10 ans   : ${nouvellesDonnees.indices.oat.valeur}% (dernier: ${historyOat[historyOat.length-1]?.date ?? 'N/A'})`);
  console.log(`  Inflation    : ${nouvellesDonnees.indices.inflation.valeur}% (dernier: ${historyInflation[historyInflation.length-1]?.date ?? 'N/A'})`);
  console.log(`  Livret A     : ${nouvellesDonnees.indices.livreta.valeur}% (dernier: ${historyLivretA[historyLivretA.length-1]?.date ?? 'N/A'})`);
  console.log(`  Prix immo    : ${nouvellesDonnees.indices.prixImmo.valeur}% var/an (dernier: ${historyPrixImmo[historyPrixImmo.length-1]?.date ?? 'N/A'})`);
  console.log(`  €STR         : ${nouvellesDonnees.indices.estr.valeur}% (dernier: ${historyEstr[historyEstr.length-1]?.date ?? 'N/A'})`);

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
  console.log("\n✅ Fichier taux.json généré avec succès.\n");
}

main();
