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
// Mapping des series IDs vers les clés d'indices dans le fichier JSON
const FRED_SERIES_MAP = {
  'IRLTLT01FRM156N': 'oat',
  'ECBESTRVOLWGTTRMDMNRT': 'estr'
};

async function fetchFredSeries(seriesId) {
  if (!FRED_API_KEY) {
    // Fallback: utiliser les données existantes
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
    // Récupération depuis 2000 pour avoir ~25 ans d'historique
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

// 2. Inflation IPCH
async function getInflationFromIndex() {
  if (!FRED_API_KEY) {
    // Fallback: utiliser les données existantes
    if (existingData?.indices?.inflation?.historique?.length > 0) {
      console.log(`  ⚠️ Inflation: utilisation des données existantes (pas de clé API)`);
      return existingData.indices.inflation.historique;
    }
    console.log(`  ❌ Inflation: pas de clé API et pas de données existantes`);
    return [];
  }
  
  const indices = await fetchFredSeries('CP0000FRM086NEST');
  if (!indices || indices.length < 13) return [];
  const inflationHistory = [];
  for (let i = 12; i < indices.length; i++) {
    const current = indices[i];
    const old = indices[i - 12]; 
    if (old.value !== 0) {
      const inflationRate = ((current.value - old.value) / old.value) * 100;
      inflationHistory.push({ date: current.date, value: parseFloat(inflationRate.toFixed(2)) });
    }
  }
  console.log(`  ✓ Inflation: ${inflationHistory.length} points calculés`);
  return inflationHistory;
}

// 3. Yahoo Finance - Historique maximum avec period1/period2 (données hebdomadaires pour 20+ ans)
async function fetchYahooHistory(ticker, useWeekly = true) {
  try {
    const now = Math.floor(Date.now() / 1000);
    // Début : 1er janvier 2000 (timestamp Unix)
    const period1 = 946684800; // 2000-01-01 00:00:00 UTC
    // Pour certains actifs récents, ajuster la date de début
    const interval = useWeekly ? '1wk' : '1d'; // Hebdomadaire pour réduire les points
    
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
      
      console.log(`  ✓ ${ticker}: ${history.length} points, ${history[0]?.date || 'N/A'} → ${history[history.length-1]?.date || 'N/A'}`);
      return history;
    }
  } catch (error) { 
    console.error(`Erreur Yahoo (${ticker}):`, error.message); 
  }
  return [];
}

// 3b. Yahoo Finance avec fallback (essaie hebdomadaire, puis quotidien si pas assez de données)
async function fetchYahooHistoryWithFallback(ticker) {
  // D'abord essayer hebdomadaire pour avoir 20+ ans
  let history = await fetchYahooHistory(ticker, true);
  
  // Si pas assez de données (ETF récents par ex.), essayer quotidien sur 10 ans
  if (history.length < 100) {
    console.log(`  Fallback vers données quotidiennes pour ${ticker}...`);
    const now = Math.floor(Date.now() / 1000);
    const period1 = now - (10 * 365 * 24 * 60 * 60); // 10 ans en arrière
    
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
        
        // Échantillonner une valeur par semaine pour réduire la taille
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
  
  return history;
}

// 4. SCPI - Historique étendu (données ASPIM/IEIF)
function getScpiHistory() {
  return [
    // Données historiques approximatives basées sur les rapports IEIF/ASPIM
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
  ];
}

// --- MAIN ---
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  MISE À JOUR TAUX.JSON - HISTORIQUE 20+ ANS");
  console.log("═══════════════════════════════════════════════════════════\n");
  
  if (!FRED_API_KEY) {
    console.log("⚠️  FRED_API_KEY non définie - les données FRED seront conservées depuis le fichier existant");
    console.log("   Pour obtenir une clé gratuite: https://fred.stlouisfed.org/docs/api/api_key.html\n");
  }

  // MACRO - Données FRED
  console.log("📊 Récupération des données FRED...");
  const historyOat = await fetchFredSeries('IRLTLT01FRM156N'); 
  const historyInflation = await getInflationFromIndex();
  const historyEstr = await fetchFredSeries('ECBESTRVOLWGTTRMDMNRT');
  
  // MACRO - Yahoo Finance
  console.log("\n📈 Récupération des données Yahoo Finance...");
  const historyEurUsd = await fetchYahooHistoryWithFallback('EURUSD=X');

  // ACTIONS - Indices majeurs
  console.log("\n📊 Récupération des indices boursiers...");
  const historyCac40 = await fetchYahooHistoryWithFallback('%5EFCHI'); 
  const historyCacMid = await fetchYahooHistoryWithFallback('C6E.PA'); 
  const historyStoxx50 = await fetchYahooHistoryWithFallback('%5ESTOXX50E'); 
  const historySP500 = await fetchYahooHistoryWithFallback('%5EGSPC'); 
  const historyNasdaq = await fetchYahooHistoryWithFallback('%5ENDX'); 
  const historyWorld = await fetchYahooHistoryWithFallback('URTH'); 
  const historyEmerging = await fetchYahooHistoryWithFallback('EEM'); 

  // DIVERS & CRYPTO
  console.log("\n💰 Récupération matières premières et crypto...");
  const historyBrent = await fetchYahooHistoryWithFallback('BZ=F'); 
  const historyGold = await fetchYahooHistoryWithFallback('GC=F'); 
  const historyBtc = await fetchYahooHistoryWithFallback('BTC-USD');
  const historyScpi = getScpiHistory(); 

  const getLast = (arr) => arr && arr.length ? arr[arr.length - 1].value : 0;

  const nouvellesDonnees = {
    date_mise_a_jour: new Date().toISOString(),
    indices: {
      oat: { titre: "OAT 10 ans", valeur: getLast(historyOat), suffixe: "%", historique: historyOat },
      inflation: { titre: "Inflation (1 an)", valeur: getLast(historyInflation), suffixe: "%", historique: historyInflation },
      estr: { titre: "€STR", valeur: getLast(historyEstr), suffixe: "%", historique: historyEstr },
      eurusd: { titre: "Euro / Dollar", valeur: getLast(historyEurUsd), suffixe: "$", historique: historyEurUsd },

      cac40: { titre: "CAC 40", valeur: getLast(historyCac40), suffixe: "pts", historique: historyCac40 },
      cacmid: { titre: "CAC Mid 60", valeur: getLast(historyCacMid), suffixe: "pts", historique: historyCacMid },
      stoxx50: { titre: "Euro Stoxx 50", valeur: getLast(historyStoxx50), suffixe: "pts", historique: historyStoxx50 },

      sp500: { titre: "S&P 500", valeur: getLast(historySP500), suffixe: "pts", historique: historySP500 },
      nasdaq: { titre: "Nasdaq 100", valeur: getLast(historyNasdaq), suffixe: "pts", historique: historyNasdaq },
      world: { titre: "MSCI World", valeur: getLast(historyWorld), suffixe: "$", historique: historyWorld },
      emerging: { titre: "Émergents", valeur: getLast(historyEmerging), suffixe: "$", historique: historyEmerging },

      brent: { titre: "Pétrole (Brent)", valeur: getLast(historyBrent), suffixe: "$", historique: historyBrent },
      gold: { titre: "Or (Once)", valeur: getLast(historyGold), suffixe: "$", historique: historyGold },
      btc: { titre: "Bitcoin", valeur: getLast(historyBtc), suffixe: "$", historique: historyBtc }, // AJOUT DU BITCOIN
      scpi: { titre: "Moyenne SCPI", valeur: getLast(historyScpi), suffixe: "%", historique: historyScpi },
    }
  };

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
  console.log("Fichier JSON généré avec succès.");
}

main();
