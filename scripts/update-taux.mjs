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

async function calculateTotalReturnCAGR(ticker) {
  try {
    // On utilise interval=1mo pour lisser et range=5y
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&range=5y&events=div|split`;
    const response = await fetch(url, {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
        }
    });
    
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    
    const data = await response.json();
    const result = data.chart?.result?.[0];

    // C'EST ICI LA CLÉ : On cherche 'adjclose' (Prix ajusté des dividendes) et non 'close' (Prix pur)
    const adjClose = result?.indicators?.adjclose?.[0]?.adjclose;

    if (adjClose && adjClose.length > 0) {
      // Nettoyage des données nulles
      const validPrices = adjClose.filter(p => p != null && p > 0);

      if (validPrices.length > 12) { // Au moins 1 an de données
        const currentPrice = validPrices[validPrices.length - 1]; // Prix ajusté actuel
        const startPrice = validPrices[0]; // Prix ajusté d'il y a 5 ans

        // Calcul du CAGR
        const n = 5; 
        const cagr = (Math.pow(currentPrice / startPrice, 1 / n) - 1) * 100;
        
        console.log(`Calcul CAGR pour ${ticker} (basé sur AdjClose): Début=${startPrice.toFixed(2)}, Fin=${currentPrice.toFixed(2)}, Taux=${cagr.toFixed(2)}%`);
        return parseFloat(cagr.toFixed(2));
      }
    }
  } catch (error) {
    console.error(`Erreur calcul CAGR pour ${ticker}:`, error.message);
  }
  return null;
}

// --- MAIN ---

async function main() {
  console.log("Début de la mise à jour des taux...");

  // 1. OAT 10 ans France
  const oat10 = await fetchFredData('IRLTLT01FRM156N');
  
  // 2. Inflation France (Variation 1 an glissant)
  const inflation = await fetchFredData('FRACPIALLMINMEI', '&units=pc1');
  
  // 3. €STR
  const estr = await fetchFredData('ECBESTRVOLWGTTRMDMNRT');
  
  // 4. CAC 40 (Dividendes Réinvestis)
  // On utilise C40.PA (Amundi CAC 40) en mode "Adjusted Close" qui intègre les dividendes.
  // C'est la méthode la plus fiable sur Yahoo pour simuler le "Gross Return".
  let cac40 = await calculateTotalReturnCAGR('C40.PA');

  // Fallback si C40.PA échoue : on tente l'indice Gross Return officiel
  if (cac40 === null) {
      console.log("Fallback sur ^PX1GR...");
      cac40 = await calculateTotalReturnCAGR('%5EPX1GR');
  }

  const nouvellesDonnees = {
    date_mise_a_jour: new Date().toISOString(),
    donnees: {
      oat_10_ans: oat10,
      inflation: inflation,
      estr: estr,
      cac_40_perf_5ans: cac40
    }
  };

  console.log("Données finales :", nouvellesDonnees);

  // Sauvegarde
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
}

main();
