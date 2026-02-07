import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

// Fonction générique avec "CACHE BUSTING" (timestamp dans l'URL pour forcer la fraîcheur)
async function fetchFredSeries(seriesId) {
  if (!FRED_API_KEY) return [];
  try {
    // On ajoute un paramètre aléatoire (&_t=...) pour empêcher Vercel de donner une vieille version en cache
    const timestamp = new Date().getTime();
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=2020-01-01&_t=${timestamp}`;
    
    const response = await fetch(url, { cache: 'no-store' }); // Force le réseau
    const data = await response.json();
    
    if (data.observations) {
      return data.observations
        .map(obs => ({
          date: obs.date,
          value: parseFloat(parseFloat(obs.value).toFixed(2)),
          timestamp: new Date(obs.date).getTime()
        }))
        .filter(item => !isNaN(item.value))
        .sort((a, b) => a.timestamp - b.timestamp); // Tri Vieux -> Récent
    }
  } catch (error) {
    console.error(`Erreur FRED (${seriesId}):`, error.message);
  }
  return [];
}

// NOUVELLE MÉTHODE INFLATION (Source: HICP Europe)
// Plus fiable que l'OCDE
async function getInflationFromIndex() {
  // Série: Harmonized Index of Consumer Prices: All Items for France
  const indices = await fetchFredSeries('CP0000FRM086NEST');
  
  if (!indices || indices.length < 13) return [];

  const inflationHistory = [];
  
  // Calcul du glissement annuel : (Prix ce mois / Prix il y a 12 mois) - 1
  for (let i = 12; i < indices.length; i++) {
    const current = indices[i];
    const old = indices[i - 12]; 
    
    if (old.value !== 0) {
      const inflationRate = ((current.value - old.value) / old.value) * 100;
      inflationHistory.push({
        date: current.date,
        value: parseFloat(inflationRate.toFixed(2))
      });
    }
  }
  return inflationHistory;
}

async function fetchYahooHistory(ticker) {
  try {
    // Cache busting ici aussi
    const timestamp = new Date().getTime();
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

function getScpiHistory() {
  // Données annuelles "dures"
  return [
    { date: "2021-01-01", value: 4.49 },
    { date: "2022-01-01", value: 4.53 },
    { date: "2023-01-01", value: 4.52 },
    { date: "2024-01-01", value: 4.52 }, 
    { date: "2025-01-01", value: 4.55 }, // Estimation
  ];
}

async function fetchCac40Perf5Ans() {
  const ticker = '%5EFCHI'; 
  const now = new Date();
  const endDate = Math.floor(now.getTime() / 1000); 
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(now.getFullYear() - 5);
  const startDate = Math.floor(fiveYearsAgo.getTime() / 1000); 
  const timestamp = new Date().getTime();

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d&_t=${timestamp}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
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
  console.log("Début de la mise à jour (Version Anti-Cache)...");

  // 1. OAT 10 ANS (Série Mensuelle Officielle)
  // Utilisation de la série de référence. Attention : la donnée officielle a toujours 1 mois de retard.
  const historyOat = await fetchFredSeries('IRLTLT01FRM156N'); 
  
  // 2. INFLATION (Source changée : HICP Europe)
  const historyInflation = await getInflationFromIndex();
  
  // 3. ESTR (Série Journalière/Hebdo)
  const historyEstr = await fetchFredSeries('ECBESTRVOLWGTTRMDMNRT');

  // 4. CAC 40 (Yahoo)
  const historyCacPrice = await fetchYahooHistory('%5EFCHI'); 
  
  // 5. SCPI (Manuel)
  const historyScpi = getScpiHistory(); 

  // --- VALEURS FINALES ---
  const valOat = historyOat.length ? historyOat[historyOat.length - 1].value : 0;
  // Fallback si l'inflation échoue : on met une valeur par défaut cohérente pour ne pas casser le site
  const valInflation = historyInflation && historyInflation.length ? historyInflation[historyInflation.length - 1].value : 0;
  const valEstr = historyEstr.length ? historyEstr[historyEstr.length - 1].value : 0;
  const valCacPerf = await fetchCac40Perf5Ans();
  const valScpi = historyScpi[historyScpi.length - 1].value;

  console.log("--- RÉSULTATS RÉCUPÉRÉS ---");
  if(historyInflation.length) console.log(`Inflation Date: ${historyInflation[historyInflation.length-1].date}`);
  if(historyOat.length) console.log(`OAT Date: ${historyOat[historyOat.length-1].date}`);

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
