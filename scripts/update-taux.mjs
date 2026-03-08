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

// 2. Inflation France - SOURCE PRIMAIRE: API INSEE BDM (pas de clé API requise)
// Série 001761313: IPC Glissement annuel (variation sur 1 an)
// Note: L'API FRED FRACPIALLMINMEI a un retard de ~1 an, donc on utilise INSEE en priorité
async function getInflationFromINSEE() {
  try {
    console.log(`  Fetching INSEE BDM (série 001761313)...`);
    // API INSEE BDM - Glissement annuel IPC France
    // Format SDMX XML, pas de clé API requise pour les données publiques
    const url = `https://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM/001761313?startPeriod=${HISTORY_START_DATE.substring(0,4)}`;
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/xml' }
    });
    const xmlText = await response.text();
    
    // Parser le XML SDMX pour extraire les observations
    const observations = [];
    const obsRegex = /TIME_PERIOD="([^"]+)"[^>]*OBS_VALUE="([^"]+)"/g;
    let match;
    while ((match = obsRegex.exec(xmlText)) !== null) {
      const [_, period, value] = match;
      // Convertir "2025-12" en "2025-12-01" pour cohérence
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
    
    if (observations.length > 0) {
      // Trier par date (les données INSEE sont en ordre inverse)
      observations.sort((a, b) => a.timestamp - b.timestamp);
      console.log(`  ✓ INSEE Inflation: ${observations.length} points, ${observations[0]?.date} → ${observations[observations.length-1]?.date}`);
      return observations;
    }
  } catch (error) {
    console.error(`  ⚠️ Erreur INSEE:`, error.message);
  }
  return [];
}

// Fallback: API FRED (retard d'environ 1 an)
async function getInflationFromFRED() {
  if (!FRED_API_KEY) {
    return [];
  }
  
  try {
    console.log(`  Fetching FRED FRACPIALLMINMEI (fallback)...`);
    const timestamp = new Date().getTime();
    // FRACPIALLMINMEI: Consumer Price Index France (OECD)
    // units=pc1: Percent Change from Year Ago (variation sur 1 an)
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

// Fonction principale: essaie INSEE d'abord, puis FRED, puis données existantes
async function getInflationFromIndex() {
  // 1. Essayer l'API INSEE (source primaire, données plus récentes)
  let inseeData = await getInflationFromINSEE();
  if (inseeData.length > 0) {
    return inseeData;
  }
  
  // 2. Fallback sur FRED si INSEE échoue
  console.log(`  ⚠️ INSEE indisponible, tentative FRED...`);
  let fredData = await getInflationFromFRED();
  if (fredData.length > 0) {
    return fredData;
  }
  
  // 3. Fallback sur données existantes
  if (existingData?.indices?.inflation?.historique?.length > 0) {
    console.log(`  ⚠️ Inflation France: utilisation des données existantes (APIs indisponibles)`);
    return existingData.indices.inflation.historique;
  }
  
  console.log(`  ❌ Inflation France: aucune source disponible`);
  return [];
}

// 3. Yahoo Finance - Historique maximum avec données hybrides (hebdo historique + quotidien récent)
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

// 3a. Récupérer les données quotidiennes récentes (derniers 30 jours) pour mise à jour
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

// 3b. Yahoo Finance avec fallback et mise à jour quotidienne récente
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
  
  // Ajouter les données quotidiennes récentes pour avoir les derniers jours
  const recentDaily = await fetchYahooRecentDaily(ticker);
  if (recentDaily.length > 0 && history.length > 0) {
    // Trouver la dernière date dans l'historique hebdo
    const lastHistoDate = history[history.length - 1].date;
    
    // Ajouter les données quotidiennes plus récentes que la dernière hebdo
    const newDailyData = recentDaily.filter(d => d.date > lastHistoDate);
    
    if (newDailyData.length > 0) {
      history = [...history, ...newDailyData];
      console.log(`  + ${ticker}: ajout de ${newDailyData.length} points quotidiens récents jusqu'au ${newDailyData[newDailyData.length - 1].date}`);
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
    { date: "2026-01-01", value: 4.58 }, // Estimation prévisionnelle
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

  // Fonction pour calculer la performance annualisée sur une période donnée
  const calculateAnnualizedPerformance = (historique, years) => {
    if (!historique || historique.length < 2) return null;
    
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setFullYear(targetDate.getFullYear() - years);
    
    // Trouver le point le plus proche de la date cible
    const currentValue = historique[historique.length - 1]?.value;
    let pastValue = null;
    
    for (let i = historique.length - 1; i >= 0; i--) {
      const pointDate = new Date(historique[i].date);
      if (pointDate <= targetDate) {
        pastValue = historique[i].value;
        break;
      }
    }
    
    // Si on n'a pas trouvé de point assez ancien, prendre le premier
    if (pastValue === null && historique.length > 0) {
      const firstPoint = historique[0];
      const firstDate = new Date(firstPoint.date);
      const actualYears = (now - firstDate) / (365.25 * 24 * 60 * 60 * 1000);
      
      if (actualYears < years * 0.5) return null; // Pas assez de données
      
      pastValue = firstPoint.value;
      years = actualYears; // Utiliser la période réelle
    }
    
    if (!pastValue || !currentValue || pastValue <= 0 || currentValue <= 0) return null;
    
    // Formule performance annualisée: (Vfinal/Vinitial)^(1/n) - 1
    const performance = (Math.pow(currentValue / pastValue, 1 / years) - 1) * 100;
    
    return parseFloat(performance.toFixed(2));
  };

  // Fonction pour créer les données d'un indice avec performances
  const createIndexData = (titre, valeur, suffixe, historique) => {
    const data = {
      titre,
      valeur,
      suffixe,
      historique
    };
    
    // Calculer les performances annualisées pour les indices non-taux
    if (suffixe !== '%' && historique && historique.length > 0) {
      const perf1an = calculateAnnualizedPerformance(historique, 1);
      const perf3ans = calculateAnnualizedPerformance(historique, 3);
      const perf5ans = calculateAnnualizedPerformance(historique, 5);
      
      data.performances = {
        annualisee_1an: perf1an,
        annualisee_3ans: perf3ans,
        annualisee_5ans: perf5ans
      };
    }
    
    return data;
  };

  const nouvellesDonnees = {
    date_mise_a_jour: new Date().toISOString(),
    indices: {
      // Taux (pas de performance annualisée)
      oat: { titre: "OAT 10 ans", valeur: getLast(historyOat), suffixe: "%", historique: historyOat },
      inflation: { titre: "Inflation France", valeur: getLast(historyInflation), suffixe: "%", historique: historyInflation },
      estr: { titre: "€STR", valeur: getLast(historyEstr), suffixe: "%", historique: historyEstr },
      
      // Devises et indices avec performances annualisées
      eurusd: createIndexData("Euro / Dollar", getLast(historyEurUsd), "$", historyEurUsd),

      cac40: createIndexData("CAC 40", getLast(historyCac40), "pts", historyCac40),
      cacmid: createIndexData("CAC Mid 60", getLast(historyCacMid), "pts", historyCacMid),
      stoxx50: createIndexData("Euro Stoxx 50", getLast(historyStoxx50), "pts", historyStoxx50),

      sp500: createIndexData("S&P 500", getLast(historySP500), "pts", historySP500),
      nasdaq: createIndexData("Nasdaq 100", getLast(historyNasdaq), "pts", historyNasdaq),
      world: createIndexData("MSCI World", getLast(historyWorld), "$", historyWorld),
      emerging: createIndexData("Émergents", getLast(historyEmerging), "$", historyEmerging),

      brent: createIndexData("Pétrole (Brent)", getLast(historyBrent), "$", historyBrent),
      gold: createIndexData("Or (Once)", getLast(historyGold), "$", historyGold),
      btc: createIndexData("Bitcoin", getLast(historyBtc), "$", historyBtc),
      
      // SCPI (taux, pas de performance)
      scpi: { titre: "Moyenne SCPI", valeur: getLast(historyScpi), suffixe: "%", historique: historyScpi },
    }
  };

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
  console.log("Fichier JSON généré avec succès.");
}

main();
