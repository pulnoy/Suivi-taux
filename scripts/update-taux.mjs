import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

// Récupère l'historique FRED via la méthode "LIMIT" (plus robuste que les dates)
// On demande les X dernières valeurs, triées de la plus récente à la plus ancienne.
async function fetchFredHistory(seriesId, limit = 12, extraParams = '') {
  if (!FRED_API_KEY) {
    console.error("ERREUR : Clé API FRED manquante.");
    return [];
  }
  
  try {
    // sort_order=desc : On veut les plus récentes en premier
    // limit : On limite le nombre de points (ex: 60 pour 5 ans de données mensuelles)
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}${extraParams}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.observations) {
      // FRED renvoie du plus récent au plus vieux (desc).
      // Pour les graphiques, on a besoin de l'inverse (Chronologique : Vieux -> Récent).
      // On map d'abord, puis on reverse.
      return data.observations.map(obs => ({
        date: obs.date,
        value: parseFloat(parseFloat(obs.value).toFixed(2))
      })).filter(item => !isNaN(item.value)).reverse(); 
    }
  } catch (error) {
    console.error(`Erreur historique FRED (${seriesId}):`, error.message);
  }
  return [];
}

// Récupère l'historique Yahoo (Méthode exacte)
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

// Données manuelles SCPI (Mise à jour annuelle)
function getScpiHistory() {
  return [
    { date: "2021-01-01", value: 4.49 },
    { date: "2022-01-01", value: 4.53 },
    { date: "2023-01-01", value: 4.52 },
    { date: "2024-01-01", value: 4.52 }, 
    { date: "2025-01-01", value: 4.60 }, // Estimation/Projection pour lisser le graph
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
  console.log("Début de la mise à jour (Mode LIMIT)...");

  // 1. Récupérations via FRED (Limit 12 pour 1 an, 60 pour 5 ans)
  // OAT : IRLTLT01FRM156N est une série MENSUELLE. Limit 12 = 12 derniers mois.
  const historyOat = await fetchFredHistory('IRLTLT01FRM156N', 12); 
  
  // Inflation : FRACPIALLMINMEI (Inflation Consumer Prices for France). 
  // Limit 60 = 5 ans. units=pc1 donne le % sur 1 an glissant.
  const historyInflation = await fetchFredHistory('FRACPIALLMINMEI', 60, '&units=pc1'); 
  
  // ESTR : Série journalière/mensuelle. Limit 12 suffisant pour le graph court terme ou 300 pour journalier
  // ECBESTRVOLWGTTRMDMNRT est souvent mensuelle ou hebdo.
  const historyEstr = await fetchFredHistory('ECBESTRVOLWGTTRMDMNRT', 12);

  const historyCacPrice = await fetchYahooHistory('%5EFCHI'); 
  const historyScpi = getScpiHistory(); 

  // 2. Extraction des dernières valeurs (La dernière du tableau est la plus récente car on a fait reverse())
  const valOat = historyOat.length ? historyOat[historyOat.length - 1].value : null;
  const valInflation = historyInflation.length ? historyInflation[historyInflation.length - 1].value : null;
  const valEstr = historyEstr.length ? historyEstr[historyEstr.length - 1].value : null;
  
  const valCacPerf = await fetchCac40Perf5Ans();
  const valScpi = historyScpi[historyScpi.length - 1].value;

  // Logs pour vérification dans GitHub Actions
  console.log(`OAT récupéré : ${valOat}% (Dernière date: ${historyOat.length ? historyOat[historyOat.length-1].date : 'N/A'})`);
  console.log(`Inflation récupérée : ${valInflation}% (Dernière date: ${historyInflation.length ? historyInflation[historyInflation.length-1].date : 'N/A'})`);

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
  console.log("Fichier JSON généré avec succès.");
}

main();
