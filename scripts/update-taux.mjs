import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

// Récupère une donnée FRED. 
// params optionnels : '&units=pc1' pour avoir le % sur 1 an glissant
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
      // On garde 2 décimales
      return parseFloat(parseFloat(data.observations[0].value).toFixed(2));
    }
  } catch (error) {
    console.error(`Erreur récupération FRED (${seriesId}):`, error.message);
  }
  return null;
}

// Récupère le CAGR (Taux de croissance annuel moyen) sur 5 ans via Yahoo
async function fetchYahoo5YearCAGR(ticker) {
  try {
    // On demande 5 ans d'historique avec un intervalle mensuel
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&range=5y`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await response.json();
    const result = data.chart?.result?.[0];

    // Vérification des données
    const prices = result?.indicators?.quote?.[0]?.close;
    
    if (prices && prices.length > 0) {
      // Prix actuel (le dernier disponible)
      const currentPrice = result.meta.regularMarketPrice || prices[prices.length - 1];
      
      // Prix d'il y a 5 ans (le premier disponible dans la plage demandée)
      // On cherche le premier prix non-null
      const startPrice = prices.find(p => p != null);

      if (currentPrice && startPrice) {
        // Formule du CAGR : ((Fin / Début) ^ (1/n années)) - 1
        const n = 5;
        const cagr = (Math.pow(currentPrice / startPrice, 1 / n) - 1) * 100;
        
        return parseFloat(cagr.toFixed(2)); // Retourne le % avec 2 décimales
      }
    }
  } catch (error) {
    console.error(`Erreur récupération Yahoo (${ticker}):`, error.message);
  }
  return null;
}

// --- MAIN ---

async function main() {
  console.log("Début de la mise à jour des taux...");

  // 1. OAT 10 ans France (Taux brut)
  const oat10 = await fetchFredData('IRLTLT01FRM156N');
  
  // 2. Inflation France (Sur 1 an glissant en %)
  // On ajoute &units=pc1 pour demander à FRED de calculer le % d'évolution sur 1 an
  const inflation = await fetchFredData('FRACPIALLMINMEI', '&units=pc1');
  
  // 3. €STR (Taux brut)
  const estr = await fetchFredData('ECBESTRVOLWGTTRMDMNRT');
  
  // 4. CAC 40 (Performance annuelle 5 ans, dividendes réinvestis)
  // Utilisation du ticker ^PX1GR (CAC 40 Gross Return) au lieu de ^FCHI
  const cac40 = await fetchYahoo5YearCAGR('%5EPX1GR');

  // Création de l'objet de données
  const nouvellesDonnees = {
    date_mise_a_jour: new Date().toISOString(),
    donnees: {
      oat_10_ans: oat10,       // %
      inflation: inflation,    // % (1 an glissant)
      estr: estr,             // %
      cac_40_perf_5ans: cac40  // % (Annuel moyen)
    }
  };

  console.log("Données récupérées :", nouvellesDonnees);

  // Sauvegarde
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
  console.log(`Fichier sauvegardé avec succès : ${FILE_PATH}`);
}

main();
