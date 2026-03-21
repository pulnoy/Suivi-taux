import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
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
async function getOatRecentFromBDF() {
  try {
    console.log(`  Fetching Banque de France Webstat v2.1 (OAT 10 ans récent)...`);
    // Nouvelle API REST OpenDataSoft v2.1 — remplace l'ancienne API SDMX
    // Dataset : FM.M.FR.EUR.FR2.BB.FR10YT_RR.YLD — OAT 10 ans France (mensuel)
    // Récupère les 24 derniers mois pour couvrir le retard éventuel de FRED
    const url = `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/FM.M.FR.EUR.FR2.BB.FR10YT_RR.YLD/records?limit=24&order_by=time_period%20DESC`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.log(`  ⚠️ BDF Webstat HTTP ${response.status}`);
      return [];
    }

    const json = await response.json();
    const records = json.results ?? json.records ?? [];

    if (records.length === 0) {
      console.log(`  ⚠️ BDF Webstat: aucun enregistrement retourné`);
      return [];
    }

    const observations = [];
    for (const rec of records) {
      // Les champs peuvent varier légèrement selon le dataset
      const fields = rec.fields ?? rec;
      const period = fields.time_period ?? fields.TIME_PERIOD ?? fields.period;
      const rawValue = fields.obs_value ?? fields.OBS_VALUE ?? fields.value;

      if (!period || rawValue == null) continue;

      // Convertir "2025-01" → "2025-01-01"
      const date = String(period).length === 7 ? `${period}-01` : String(period);
      const numValue = parseFloat(rawValue);
      if (!isNaN(numValue)) {
        observations.push({
          date,
          value: parseFloat(numValue.toFixed(2)),
          timestamp: new Date(date).getTime()
        });
      }
    }

    if (observations.length > 0) {
      observations.sort((a, b) => a.timestamp - b.timestamp);
      const last = observations[observations.length - 1];
      console.log(`  ✓ BDF Webstat OAT: ${observations.length} points récents, dernier: ${last.date} = ${last.value}%`);
      return observations;
    }

    // Log de debug si aucun point parsé
    console.log(`  ⚠️ BDF Webstat: aucune observation parsée — champs disponibles:`, Object.keys(records[0]?.fields ?? records[0] ?? {}));
    return [];
  } catch (error) {
    console.error(`  ⚠️ Erreur BDF Webstat:`, error.message);
    return [];
  }
}

// Fusion FRED (historique long) + BDF (données récentes)
async function getOatHistory() {
  // 1. Récupérer l'historique long depuis FRED
  const fredData = await fetchFredSeries('IRLTLT01FRM156N');

  // 2. Récupérer les données récentes depuis la Banque de France
  const bdfData = await getOatRecentFromBDF();

  if (fredData.length === 0 && bdfData.length === 0) {
    // Fallback sur données existantes
    if (existingData?.indices?.oat?.historique?.length > 0) {
      console.log(`  ⚠️ OAT: utilisation des données existantes`);
      return existingData.indices.oat.historique;
    }
    return [];
  }

  if (bdfData.length === 0) return fredData;
  if (fredData.length === 0) return bdfData;

  // Fusionner : garder FRED comme base, compléter avec BDF pour les mois manquants
  const lastFredDate = fredData[fredData.length - 1].date;
  const newBdfPoints = bdfData.filter(d => d.date > lastFredDate);

  if (newBdfPoints.length > 0) {
    const merged = [...fredData, ...newBdfPoints];
    console.log(`  ✓ OAT fusionné: ${merged.length} points (FRED jusqu'au ${lastFredDate}, +${newBdfPoints.length} points BDF jusqu'au ${newBdfPoints[newBdfPoints.length-1].date})`);
    return merged;
  }

  console.log(`  ℹ️ OAT: BDF n'apporte pas de nouveaux points au-delà de FRED (${lastFredDate})`);
  return fredData;
}

// ─────────────────────────────────────────────────────────────
// 3. INFLATION FRANCE — SOURCE PRIMAIRE : API INSEE BDM
//    Série principale  : 001761313 (IPC glissement annuel, base 2015)
//    Série de secours  : 001763852 (IPC glissement annuel, base 2015 – révision)
//    Fallback final    : FRED FRACPIALLMINMEI (retard ~1-2 mois)
// ─────────────────────────────────────────────────────────────

async function fetchINSEESerie(serieId) {
  try {
    const startYear = HISTORY_START_DATE.substring(0, 4);
    const url = `https://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM/${serieId}?startPeriod=${startYear}`;
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

    // Format 1 : TIME_PERIOD="2025-12" OBS_VALUE="0.8"
    const obsRegex = /TIME_PERIOD="([^"]+)"[^>]*OBS_VALUE="([^"]+)"/g;
    let match;
    while ((match = obsRegex.exec(xmlText)) !== null) {
      const [_, period, value] = match;
      const date = period.length === 7 ? `${period}-01` : period;
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        observations.push({
          date,
          value: parseFloat(numValue.toFixed(2)),
          timestamp: new Date(date).getTime()
        });
      }
    }

    // Format 2 : <generic:ObsValue value="..."> précédé de <generic:Value id="TIME_PERIOD" value="...">
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
            value: parseFloat(numValue.toFixed(2)),
            timestamp: new Date(date).getTime()
          });
        }
      }
    }

    if (observations.length > 0) {
      observations.sort((a, b) => a.timestamp - b.timestamp);
      const last = observations[observations.length - 1];
      console.log(`  ✓ INSEE ${serieId}: ${observations.length} points, dernier: ${last.date} = ${last.value}%`);
      return observations;
    }

    console.log(`  ⚠️ INSEE ${serieId}: aucune observation parsée`);
    return [];
  } catch (error) {
    console.error(`  ⚠️ Erreur INSEE ${serieId}:`, error.message);
    return [];
  }
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
  // ⚠️ IMPORTANT : depuis février 2026, l'INSEE a migré vers la base 2025.
  // Les séries base 2015 (001761313, 001763852) sont arrêtées à décembre 2025.
  // Les nouvelles séries base 2025 sont rétropolées depuis 1996.

  // 1. NOUVELLE série INSEE base 2025 — IPC glissement annuel, ensemble des ménages, France
  //    Source : https://www.insee.fr/fr/statistiques/serie/011812231
  let data = await fetchINSEESerie('011812231');
  if (data.length > 0) return data;

  // 2. Série de secours base 2025 — IPCH glissement annuel
  console.log(`  ⚠️ Série 011812231 indisponible, tentative série 011812232...`);
  data = await fetchINSEESerie('011812232');
  if (data.length > 0) return data;

  // 3. Anciennes séries base 2015 (historique jusqu'à déc. 2025 uniquement)
  console.log(`  ⚠️ Base 2025 indisponible, tentative base 2015 (001761313)...`);
  data = await fetchINSEESerie('001761313');
  if (data.length > 0) return data;

  console.log(`  ⚠️ Tentative base 2015 secours (001763852)...`);
  data = await fetchINSEESerie('001763852');
  if (data.length > 0) return data;

  // 4. Fallback FRED
  console.log(`  ⚠️ INSEE indisponible, tentative FRED...`);
  data = await getInflationFromFRED();
  if (data.length > 0) return data;

  // 5. Fallback données existantes
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
// 5. SCPI — Données historiques approximatives ASPIM/IEIF
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

  // OAT 10 ans : FRED + Banque de France pour les mois récents
  console.log("📊 Récupération OAT 10 ans (FRED + Banque de France)...");
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
  console.log(`  €STR         : ${nouvellesDonnees.indices.estr.valeur}% (dernier: ${historyEstr[historyEstr.length-1]?.date ?? 'N/A'})`);

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
  console.log("\n✅ Fichier taux.json généré avec succès.\n");
}

main();
