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

// Calcul précis jour par jour sur 5 ans
async function fetchCac40Precise() {
  const ticker = '%5EFCHI'; // ^FCHI
  try {
    // Changement ici : interval=1d (Journalier) au lieu de 1mo (Mensuel)
    // Cela permet de prendre le prix EXACT d'il y a 5 ans jour pour jour
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5y`;
    
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    const prices = result?.indicators?.quote?.[0]?.close;

    if (prices && prices.length > 0) {
      // On nettoie les valeurs nulles
      const validPrices = prices.filter(p => p != null && p > 0);

      if (validPrices.length > 0) {
        const currentPrice = validPrices[validPrices.length - 1]; // Prix de clôture d'hier
        const startPrice = validPrices[0]; // Prix d'ouverture de la plage (il y a 5 ans exactement)

        // Calcul de la performance totale
        const totalPerf = ((currentPrice - startPrice) / startPrice) * 100;
        
        // Division simple par 5 (Moyenne arithmétique)
        const annualSimple = totalPerf / 5;

        console.log(`CAC 40 (Précision jour) : Début=${startPrice.toFixed(2)}, Fin=${currentPrice.toFixed(2)}`);
        console.log(`Perf Totale=${totalPerf.toFixed(2)}%, Annuelle=${annualSimple.toFixed(2)}%`);
        
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
  console.log("Début de la mise à jour des taux...");

  const oat10 = await fetchFredData('IRLTLT01FRM156N');
  const inflation = await fetchFredData('FRACPIALLMINMEI', '&units=pc1');
  const estr = await fetchFredData('ECBESTRVOLWGTTRMDMNRT');
  
  // Appel de la nouvelle fonction précise
  const cac40 = await fetchCac40Precise();

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

  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
}

main();
