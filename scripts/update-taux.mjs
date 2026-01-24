import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

async function fetchFredData(seriesId, extraParams = '') {
  if (!FRED_API_KEY) {
    console.error("ERREUR: Clé API FRED manquante.");
    return null;
  }
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1${extraParams}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.observations && data.observations.length > 0) {
      return parseFloat(parseFloat(data.observations[0].value).toFixed(2));
    }
  } catch (error) {
    console.error(`Erreur récupération FRED (${seriesId}):`, error.message);
  }
  return null;
}

// Calcul CAC 40 avec DATES EXACTES (Timestamps)
async function fetchCac40ExactTimestamp() {
  const ticker = '%5EFCHI'; 
  
  // 1. Calcul des Timestamps exacts
  const now = new Date();
  const endDate = Math.floor(now.getTime() / 1000); // Aujourd'hui en secondes
  
  // Date exacte il y a 5 ans
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(now.getFullYear() - 5);
  const startDate = Math.floor(fiveYearsAgo.getTime() / 1000); // Il y a 5 ans en secondes

  console.log(`Période demandée : du ${fiveYearsAgo.toISOString().split('T')[0]} au ${now.toISOString().split('T')[0]}`);

  try {
    // Utilisation de period1 et period2 pour forcer la plage exacte
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d`;
    
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json();
    const result = data.chart?.result?.[0];
    const prices = result?.indicators?.quote?.[0]?.close;
    const timestamps = result?.timestamp;

    if (prices && prices.length > 0) {
      // Trouver le premier prix NON NULL
      let startPrice = null;
      let startIndex = 0;
      
      for (let i = 0; i < prices.length; i++) {
        if (prices[i] != null && prices[i] > 0) {
          startPrice = prices[i];
          startIndex = i;
          break;
        }
      }
      
      // Trouver le dernier prix NON NULL
      let currentPrice = null;
      for (let i = prices.length - 1; i >= 0; i--) {
        if (prices[i] != null && prices[i] > 0) {
          currentPrice = prices[i];
          break;
        }
      }

      if (startPrice && currentPrice) {
        // Date réelle des prix trouvés (pour vérification dans les logs)
        const dateDebutReelle = new Date(timestamps[startIndex] * 1000).toISOString().split('T')[0];
        
        console.log(`Données trouvées -> Début (${dateDebutReelle}): ${startPrice.toFixed(2)}, Fin: ${currentPrice.toFixed(2)}`);

        // Calcul Performance
        const totalPerf = ((currentPrice - startPrice) / startPrice) * 100;
        const annualSimple = totalPerf / 5;

        console.log(`Résultat : Total=${totalPerf.toFixed(2)}% -> Annuel=${annualSimple.toFixed(2)}%`);
        
        return parseFloat(annualSimple.toFixed(2));
      }
    }
  } catch (error) {
    console.error(`Erreur calcul CAC 40:`, error.message);
  }
  return null;
}

// --- MAIN ---

async function main() {
  console.log("Début de la mise à jour...");

  const oat10 = await fetchFredData('IRLTLT01FRM156N');
  const inflation = await fetchFredData('FRACPIALLMINMEI', '&units=pc1');
  const estr = await fetchFredData('ECBESTRVOLWGTTRMDMNRT');
  
  // Appel de la fonction "Timestamps Exacts"
  const cac40 = await fetchCac40ExactTimestamp();

  const nouvellesDonnees = {
    date_mise_a_jour: new Date().toISOString(),
    donnees: {
      oat_10_ans: oat10,
      inflation: inflation,
      estr: estr,
      cac_40_perf_5ans: cac40
    }
  };

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
}

main();
