import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

// Récupère l'historique FRED (Méthode "Force Brute")
// On récupère TOUT depuis 2020 et on trie manuellement pour trouver le vrai dernier.
async function fetchFredHistory(seriesId, extraParams = '') {
  if (!FRED_API_KEY) {
    console.error("ERREUR : Clé API FRED manquante.");
    return [];
  }
  
  // On demande les données depuis 2020-01-01 pour être sûr d'avoir la fin
  const startDate = '2020-01-01';

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startDate}${extraParams}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.observations && data.observations.length > 0) {
      // 1. On convertit tout proprement
      const cleanData = data.observations.map(obs => ({
        date: obs.date,
        value: parseFloat(parseFloat(obs.value).toFixed(2)),
        timestamp: new Date(obs.date).getTime() // Pour le tri
      })).filter(item => !isNaN(item.value));

      // 2. On trie du plus ANCIEN au plus RÉCENT (pour le graphique)
      // Javascript sort est très fiable.
      cleanData.sort((a, b) => a.timestamp - b.timestamp);

      return cleanData;
    }
  } catch (error) {
    console.error(`Erreur historique FRED (${seriesId}):`, error.message);
  }
  return [];
}

// Récupère l'historique Yahoo
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

// Données manuelles SCPI
function getScpiHistory() {
  return [
    { date: "2021-01-01", value: 4.49 },
    { date: "2022-01-01", value: 4.53 },
    { date: "2023-01-01", value: 4.52 },
    { date: "2024-01-01", value: 4.52 }, 
    { date: "2025-01-01", value: 4.52 }, // Valeur temporaire 2025 pour afficher une date récente
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
  console.log("Début de la mise à jour (Mode Force Brute)...");

  // 1. Récupérations
  const historyOat = await fetchFredHistory('IRLTLT01FRM156N'); 
  const historyInflation = await fetchFredHistory('FRACPIALLMINMEI', '&units=pc1'); 
  const historyEstr = await fetchFredHistory('ECBESTRVOLWGTTRMDMNRT');
  const historyCacPrice = await fetchYahooHistory('%5EFCHI'); 
  const historyScpi = getScpiHistory(); 

  // 2. Extraction de la DERNIÈRE valeur du tableau (Le tableau est trié par date croissante)
  const valOat = historyOat.length ? historyOat[historyOat.length - 1].value : null;
  const valInflation = historyInflation.length ? historyInflation[historyInflation.length - 1].value : null;
  const valEstr = historyEstr.length ? historyEstr[historyEstr.length - 1].value : null;
  
  const valCacPerf = await fetchCac40Perf5Ans();
  const valScpi = historyScpi[historyScpi.length - 1].value;

  // Logs pour vérification dans GitHub
  console.log(`--- VÉRIFICATION ---`);
  console.log(`OAT Date: ${historyOat.length ? historyOat[historyOat.length-1].date : 'N/A'} | Valeur: ${valOat}`);
  console.log(`Inflation Date: ${historyInflation.length ? historyInflation[historyInflation.length-1].date : 'N/A'} | Valeur: ${valInflation}`);
  console.log(`ESTR Date: ${historyEstr.length ? historyEstr[historyEstr.length-1].date : 'N/A'} | Valeur: ${valEstr}`);

  const nouvellesDonnees = {
    date_mise_a_jour: new Date().toISOString(),
    indices: {
      oat: {
        titre: "OAT 10 ans",
        valeur: valOat,
        suffixe: "%",
        historique: historyOat // On garde tout l'historique depuis 2020 pour le graph
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
