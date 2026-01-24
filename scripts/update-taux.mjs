import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

// Récupère une donnée FRED
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

// Calcule le CAGR (Croissance annuelle moyenne) sur 5 ans
async function calculateCAGR(ticker) {
  try {
    // On passe en '1wk' (hebdo) pour avoir plus de fiabilité que '1mo' sur les indices exotiques
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1wk&range=5y`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
    });
    
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    const prices = result?.indicators?.quote?.[0]?.close;

    if (prices && prices.length > 0) {
      // Filtrer les valeurs nulles (fréquent sur Yahoo)
      const cleanPrices = prices.filter(p => p != null && p > 0);

      if (cleanPrices.length > 10) { // On s'assure d'avoir assez de données
        const currentPrice = cleanPrices[cleanPrices.length - 1]; // Dernier prix
        const startPrice = cleanPrices[0]; // Premier prix (il y a 5 ans)

        // Formule CAGR : ((Fin / Début) ^ (1/n)) - 1
        const n = 5; 
        const cagr = (Math.pow(currentPrice / startPrice, 1 / n) - 1) * 100;
        
        console.log(`Succès ${ticker}: Début=${startPrice}, Fin=${currentPrice}, CAGR=${cagr.toFixed(2)}%`);
        return parseFloat(cagr.toFixed(2));
      }
    }
  } catch (error) {
    console.error(`Erreur calcul CAGR pour ${ticker}:`, error.message);
  }
  return null;
}

// Fonction principale pour le CAC qui gère le fallback
async function fetchCac40Strategy() {
  // 1. Tentative avec Dividendes Réinvestis (Gross Return)
  console.log("Tentative récupération CAC 40 GR (Dividendes réinvestis)...");
  let cac = await calculateCAGR('%5EPX1GR'); // ^PX1GR
  
  // 2. Si échec, repli sur le CAC 40 Standard
  if (cac === null) {
    console.log("Échec CAC 40 GR, tentative sur CAC 40 Standard...");
    cac = await calculateCAGR('%5EFCHI'); // ^FCHI
  }
  
  return cac;
}

// --- MAIN ---

async function main() {
  console.log("Début de la mise à jour des taux...");

  // 1. OAT 10 ans France
  const oat10 = await fetchFredData('IRLTLT01FRM156N');
  
  // 2. Inflation France (Variation sur 1 an glissant => units=pc1)
  // Cela correspond à la définition : variation de l'IPC sur 12 mois
  const inflation = await fetchFredData('FRACPIALLMINMEI', '&units=pc1');
  
  // 3. €STR
  const estr = await fetchFredData('ECBESTRVOLWGTTRMDMNRT');
  
  // 4. CAC 40 (Perf annuelle 5 ans)
  const cac40 = await fetchCac40Strategy();

  // Création de l'objet
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
