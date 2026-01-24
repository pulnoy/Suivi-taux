import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

// Récupère l'historique FRED sur 1 an
async function fetchFredHistory(seriesId, extraParams = '') {
  if (!FRED_API_KEY) return [];
  
  // Date d'il y a 1 an
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const dateStr = oneYearAgo.toISOString().split('T')[0];

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${dateStr}${extraParams}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.observations) {
      return data.observations.map(obs => ({
        date: obs.date,
        value: parseFloat(obs.value)
      })).filter(item => !isNaN(item.value));
    }
  } catch (error) {
    console.error(`Erreur historique FRED (${seriesId}):`, error.message);
  }
  return [];
}

// Récupère l'historique Yahoo sur 1 an (Journalier)
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
  } catch (error) {
    console.error(`Erreur historique Yahoo (${ticker}):`, error.message);
  }
  return [];
}

// Recalcule le CAC 40 Perf 5 ans (méthode exacte timestamp)
// Note: Pour le graphique, on affichera l'évolution du PRIX du CAC, 
// mais la valeur "Dernier Taux" restera ta perf 5 ans.
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
  console.log("Début de la mise à jour complète (Valeurs + Historiques)...");

  // 1. Récupération des historiques (pour les graphiques)
  const historyOat = await fetchFredHistory('IRLTLT01FRM156N');
  const historyInflation = await fetchFredHistory('FRACPIALLMINMEI', '&units=pc1');
  const historyEstr = await fetchFredHistory('ECBESTRVOLWGTTRMDMNRT');
  const historyCacPrice = await fetchYahooHistory('%5EFCHI'); // Historique du prix pour le graph

  // 2. Récupération des valeurs "Phare" (Dernière valeur connue ou calculée)
  // Pour FRED, on prend la dernière valeur de l'historique
  const valOat = historyOat.length ? historyOat[historyOat.length - 1].value : null;
  const valInflation = historyInflation.length ? historyInflation[historyInflation.length - 1].value : null;
  const valEstr = historyEstr.length ? historyEstr[historyEstr.length - 1].value : null;
  
  // Pour le CAC, on garde ton calcul spécifique 5 ans
  const valCacPerf = await fetchCac40Perf5Ans();

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
        titre: "Inflation (1 an)",
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
        titre: "CAC 40 (Perf 5 ans/an)",
        valeur: valCacPerf, // Ta valeur calculée (ex: 9.76)
        suffixe: "%",
        historique: historyCacPrice // L'évolution du prix de l'indice pour le graph
      }
    }
  };

  console.log("Données générées avec historiques.");

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
}

main();
