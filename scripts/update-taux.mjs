import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FRED_API_KEY = process.env.FRED_API_KEY;
// Note: Alpha Vantage est souvent limité, on utilise Yahoo (gratuit/rapide) pour le CAC40
// et la FED (FRED) pour les données économiques officielles.

const FILE_PATH = path.join(process.cwd(), 'public', 'taux.json');

// --- FONCTIONS UTILITAIRES ---

async function fetchFredData(seriesId) {
  if (!FRED_API_KEY) {
    console.error("ERREUR: Clé API FRED manquante.");
    return null;
  }
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.observations && data.observations.length > 0) {
      return parseFloat(data.observations[0].value);
    }
  } catch (error) {
    console.error(`Erreur récupération FRED (${seriesId}):`, error.message);
  }
  return null;
}

async function fetchYahooData(ticker) {
  try {
    // Yahoo Finance API non-officielle (souvent plus fiable que Alpha Vantage gratuit)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' } // Important pour ne pas être bloqué
    });
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (result?.meta?.regularMarketPrice) {
      return result.meta.regularMarketPrice;
    }
  } catch (error) {
    console.error(`Erreur récupération Yahoo (${ticker}):`, error.message);
  }
  return null;
}

// --- MAIN ---

async function main() {
  console.log("Début de la mise à jour des taux...");

  // 1. Récupération des données
  // OAT 10 ans France (Série FRED: IRLTLT01FRM156N - Taux long terme)
  const oat10 = await fetchFredData('IRLTLT01FRM156N');
  
  // Inflation France (Série FRED: FRACPIALLMINMEI - CPI)
  const inflation = await fetchFredData('FRACPIALLMINMEI');
  
  // €STR (Série FRED: ECBESTRVOLWGTTRMDMNRT - Taux court terme Euro)
  const estr = await fetchFredData('ECBESTRVOLWGTTRMDMNRT');
  
  // CAC 40 (Yahoo Ticker: ^FCHI)
  const cac40 = await fetchYahooData('%5EFCHI');

  // 2. Création de l'objet de données
  const nouvellesDonnees = {
    date_mise_a_jour: new Date().toISOString(),
    donnees: {
      oat_10_ans: oat10 || "Non disponible",
      inflation: inflation || "Non disponible",
      estr: estr || "Non disponible",
      cac_40: cac40 || "Non disponible"
    }
  };

  console.log("Données récupérées :", nouvellesDonnees);

  // 3. Sauvegarde dans le fichier public/taux.json
  // On s'assure que le dossier 'public' existe (requis pour Next.js/Vercel)
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(nouvellesDonnees, null, 2));
  console.log(`Fichier sauvegardé avec succès : ${FILE_PATH}`);
}

main();
