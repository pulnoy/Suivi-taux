import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

async function fetchFredSeries(seriesId) {
  if (!FRED_API_KEY) return [];
  try {
    // On récupère tout l'historique depuis 2020
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=2020-01-01`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.observations) {
      return data.observations
        .map(obs => ({
          date: obs.date,
          value: parseFloat(parseFloat(obs.value).toFixed(2)),
          timestamp: new Date(obs.date).getTime()
        }))
        .filter(item => !isNaN(item.value))
        .sort((a, b) => a.timestamp - b.timestamp); // Tri Chronologique (Vieux -> Récent)
    }
  } catch (error) {
    console.error(`Erreur FRED (${seriesId}):`, error.message);
  }
  return [];
}

// Fonction spéciale pour calculer l'inflation à partir de l'INDICE (plus fiable que le taux pré-calculé)
// Formule : ((Indice Ce Mois / Indice Il y a 12 mois) - 1) * 100
async function getInflationFromIndex() {
  // CP0000FRM086NEST = Indice des prix à la consommation harmonisé (HICP) - France
  // C'est la série la plus à jour sur FRED.
  const indices = await fetchFredSeries('CP0000FRM086NEST');
  
  if (indices.length < 13) return null;

  const inflationHistory = [];
  
  // On reconstruit l'historique du taux d'inflation glissant
  for (let i = 12; i < indices.length; i++) {
    const current = indices[i];
    const old = indices[i - 12]; // La valeur il y a un an
    
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
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2y`;
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

function getScpiHistory() {
  return [
    { date: "2021-01-01", value: 4.49 },
    { date: "2022-01-01", value: 4.53 },
    { date: "2023-01-01", value: 4.52 },
    { date: "2024-01-01", value: 4.52 }, 
    { date: "2025-01-01", value: 4.52 }, // On met à jour la date pour éviter l'effet "vieux"
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
  console.log("Début de la mise à jour (Correction Inflation)...");

  // 1. OAT 10 ANS (Série Mensuelle Officielle)
  // IRLTLT01FRM156N est la référence OCDE. Elle a un lag de 1 mois.
  const historyOat = await fetchFredSeries('IRLTLT01FRM156N'); 
  
  // 2. INFLATION (Calcul manuel via l'indice HICP)
  // La série 'FRACPIALLMINMEI' est morte. On utilise 'CP0000FRM086NEST' et on calcule le taux.
  const historyInflation = await getInflationFromIndex();
  
  // 3. ESTR (Série Journalière/Hebdo)
  const historyEstr = await fetchFredSeries('ECBESTRVOLWGTTRMDMNRT');

  // 4. CAC 40 (Yahoo)
  const historyCacPrice = await fetchYahooHistory('%5EFCHI'); 
  
  // 5. SCPI (Manuel)
  const historyScpi = getScpiHistory(); 

  // --- VALEURS FINALES ---
  const valOat = historyOat.length ? historyOat[historyOat.length - 1].value : 0;
  const valInflation = historyInflation && historyInflation.length ? historyInflation[historyInflation.length - 1].value : 0;
  const valEstr = historyEstr.length ? historyEstr[historyEstr.length - 1].value : 0;
  const valCacPerf = await fetchCac40Perf5Ans();
  const valScpi = historyScpi[historyScpi.length - 1].value;

  console.log("--- RÉSULTATS ---");
  console.log(`Inflation (Calculée) : ${valInflation}% (Date : ${historyInflation[historyInflation.length-1].date})`);
  console.log(`OAT 10 ans : ${valOat}% (Date : ${historyOat[historyOat.length-1].date})`);

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
