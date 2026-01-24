import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

// Récupère l'historique FRED (paramètre rangeInYears pour la durée)
async function fetchFredHistory(seriesId, rangeInYears = 1, extraParams = '') {
  if (!FRED_API_KEY) return [];
  
  const today = new Date();
  const startDate = new Date();
  startDate.setFullYear(today.getFullYear() - rangeInYears);
  const dateStr = startDate.toISOString().split('T')[0];

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${dateStr}${extraParams}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.observations) {
      return data.observations.map(obs => ({
        date: obs.date,
        value: parseFloat(parseFloat(obs.value).toFixed(2))
      })).filter(item => !isNaN(item.value));
    }
  } catch (error) {
    console.error(`Erreur historique FRED (${seriesId}):`, error.message);
  }
  return [];
}

async function fetchYahooHistory(ticker) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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

// Fonction spéciale pour les SCPI (Données ASPIM Annuelles)
function getScpiHistory() {
  // Il n'y a pas d'API pour ça, on met les chiffres officiels du Taux de Distribution Moyen
  // Source : ASPIM / France SCPI
  return [
    { date: "2020-01-01", value: 4.18 },
    { date: "2021-01-01", value: 4.49 },
    { date: "2022-01-01", value: 4.53 },
    { date: "2023-01-01", value: 4.52 },
    { date: "2024-01-01", value: 4.52 }, // Estimation stable en attendant 2024 consolidé
  ];
}

async function fetchCac40Perf5Ans() {
  const ticker = '%5EFCHI'; 
  const now = new Date();
  const endDate = Math.floor(now.getTime() / 1000); 
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(now.getFullYear() - 5);
  const startDate = Math.floor(fiveYearsAgo.getTime() / 1000); 

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json();
    const result = data.chart?.result?.[0];
    const prices = result?.indicators?.quote?.[0]?.close;

    if (prices && prices.length > 0) {
      const validPrices = prices.filter(p => p != null && p > 0);
      if (validPrices.length > 0) {
        const currentPrice = validPrices[validPrices.length - 1];
        const startPrice = validPrices[0];
        const totalPerf = ((currentPrice - startPrice) / startPrice) * 100;
        return parseFloat((totalPerf / 5).toFixed(2));
      }
    }
  } catch (error) { return null; }
  return null;
}

// --- MAIN ---

async function main() {
  console.log("Début de la mise à jour...");

  // 1. Récupérations
  const historyOat = await fetchFredHistory('IRLTLT01FRM156N', 1); // OAT 1 an
  const historyInflation = await fetchFredHistory('FRACPIALLMINMEI', 5, '&units=pc1'); // Inflation 5 ans !
  const historyEstr = await fetchFredHistory('ECBESTRVOLWGTTRMDMNRT', 1); // ESTR 1 an
  const historyCacPrice = await fetchYahooHistory('%5EFCHI'); // Graphique CAC 1 an
  const historyScpi = getScpiHistory(); // SCPI 5 ans (Fixe)

  // 2. Valeurs actuelles
  const valOat = historyOat.length ? historyOat[historyOat.length - 1].value : null;
  const valInflation = historyInflation.length ? historyInflation[historyInflation.length - 1].value : null;
  const valEstr = historyEstr.length ? historyEstr[historyEstr.length - 1].value : null;
  const valCacPerf = await fetchCac40Perf5Ans();
  const valScpi = historyScpi[historyScpi.length - 1].value;

  const nouvellesDonnees = {
    date_mise_a_jour: new Date().toISOString(),
    indices: {
      oat: {
        titre: "OAT 10 ans",
        valeur: valOat,
        suffixe: "%",
        historique: historyOat
      },
      inflation: {
        titre: "Inflation (5 ans)",
        valeur: valInflation,
        suffixe: "%",
        historique: historyInflation
      },
      estr: {
        titre: "€STR",
        valeur: valEstr,
        suffixe: "%",
        historique: historyEstr
      },
      cac40: {
        titre: "CAC 40 (Moy. 5 ans)",
        valeur: valCacPerf,
        suffixe: "%",
        historique: historyCacPrice
      },
      scpi: {
        titre: "Moyenne SCPI (5 ans)",
        valeur: valScpi,
        suffixe: "%",
        historique: historyScpi
      }
    }
  };

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
  console.log("Mise à jour terminée.");
}

main();
