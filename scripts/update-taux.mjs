import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

// 1. Récupération FRED (Taux & Macro)
async function fetchFredSeries(seriesId) {
  if (!FRED_API_KEY) return [];
  try {
    const timestamp = new Date().getTime();
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=2020-01-01&_t=${timestamp}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    if (data.observations) {
      return data.observations
        .map(obs => ({
          date: obs.date,
          value: parseFloat(parseFloat(obs.value).toFixed(2)),
          timestamp: new Date(obs.date).getTime()
        }))
        .filter(item => !isNaN(item.value))
        .sort((a, b) => a.timestamp - b.timestamp);
    }
  } catch (error) { console.error(`Erreur FRED (${seriesId}):`, error.message); }
  return [];
}

// 2. Récupération Inflation (Calcul IPCH)
async function getInflationFromIndex() {
  const indices = await fetchFredSeries('CP0000FRM086NEST'); // HICP France
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
  return inflationHistory;
}

// 3. Récupération YAHOO FINANCE
async function fetchYahooHistory(ticker) {
  try {
    const timestamp = new Date().getTime();
    // interval=1d (donnée journalière)
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2y&_t=${timestamp}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (result && result.timestamp && result.indicators.quote[0].close) {
      const dates = result.timestamp;
      const prices = result.indicators.quote[0].close;
      const history = [];
      for (let i = 0; i < dates.length; i++) {
        if (prices[i] != null) {
          history.push({
            date: new Date(dates[i] * 1000).toISOString().split('T')[0],
            value: parseFloat(prices[i].toFixed(2))
          });
        }
      }
      return history;
    }
  } catch (error) { console.error(`Erreur Yahoo (${ticker}):`, error.message); }
  return [];
}

// 4. SCPI (Données Annuelles manuelles)
function getScpiHistory() {
  return [
    { date: "2021-01-01", value: 4.49 },
    { date: "2022-01-01", value: 4.53 },
    { date: "2023-01-01", value: 4.52 },
    { date: "2024-01-01", value: 4.52 }, 
    { date: "2025-01-01", value: 4.55 },
  ];
}

// --- EXÉCUTION PRINCIPALE ---
async function main() {
  console.log("Début de la mise à jour complète...");

  // A. MACRO & TAUX
  const historyOat = await fetchFredSeries('IRLTLT01FRM156N'); 
  const historyInflation = await getInflationFromIndex();
  const historyEstr = await fetchFredSeries('ECBESTRVOLWGTTRMDMNRT');
  const historyEurUsd = await fetchYahooHistory('EURUSD=X');

  // B. ACTIONS FRANCE / EUROPE
  const historyCac40 = await fetchYahooHistory('%5EFCHI'); 
  // CHANGEMENT ICI : Utilisation de l'ETF Amundi (C6E.PA) au lieu de l'indice ^CM60
  const historyCacMid = await fetchYahooHistory('C6E.PA'); 
  const historyStoxx50 = await fetchYahooHistory('%5ESTOXX50E'); 

  // C. ACTIONS INTERNATIONALES
  const historySP500 = await fetchYahooHistory('%5EGSPC'); 
  const historyNasdaq = await fetchYahooHistory('%5ENDX'); 
  const historyWorld = await fetchYahooHistory('URTH'); 
  const historyEmerging = await fetchYahooHistory('EEM'); 

  // D. DIVERSIFICATION
  const historyBrent = await fetchYahooHistory('BZ=F'); 
  const historyGold = await fetchYahooHistory('GC=F'); 
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
      scpi: { titre: "Moyenne SCPI", valeur: getLast(historyScpi), suffixe: "%", historique: historyScpi },
    }
  };

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
  console.log("Fichier JSON généré avec succès.");
}

main();
