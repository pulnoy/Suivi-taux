// scripts/update-taux.mjs
// Récupère les taux depuis les APIs sources et met à jour route.ts

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const FRED_API_KEY = process.env.FRED_API_KEY || '';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

// Fonction générique pour fetch HTTPS
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function formatDateFR() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Récupère €STR depuis l'API BCE
async function fetchESTR() {
  try {
    const data = await fetchJson('https://api.estr.dev/latest');
    console.log('€STR brut:', data);
    return data?.rate ?? data?.value ?? 1.93;
  } catch (e) {
    console.error('Erreur €STR:', e.message);
    return 1.93;
  }
}

// Récupère OAT 10 ans depuis FRED API
async function fetchOAT10() {
  if (!FRED_API_KEY) {
    console.warn('FRED_API_KEY non configurée, utilisation valeur par défaut OAT10');
    return 3.54;
  }
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=IRLTLT01FRM156N&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    const data = await fetchJson(url);
    const obs = data?.observations?.[0];
    console.log('OAT10 brut:', obs);
    if (obs && obs.value !== '.') {
      return parseFloat(obs.value);
    }
  } catch (e) {
    console.error('Erreur OAT10:', e.message);
  }
  return 3.54;
}

// Récupère l'inflation française depuis FRED API
async function fetchInflation() {
  if (!FRED_API_KEY) {
    console.warn('FRED_API_KEY non configurée, utilisation valeur par défaut Inflation');
    return 2.0;
  }
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=FPCPITOTLZGFRA&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    const data = await fetchJson(url);
    const obs = data?.observations?.[0];
    console.log('Inflation brut:', obs);
    if (obs && obs.value !== '.') {
      return parseFloat(obs.value);
    }
  } catch (e) {
    console.error('Erreur Inflation:', e.message);
  }
  return 2.0;
}

// Récupère CAC40 annualisé 5 ans via Alpha Vantage
async function fetchCAC5() {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.warn('ALPHA_VANTAGE_API_KEY non configurée, utilisation valeur par défaut CAC5');
    return 7.92;
  }
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=CAC.PAR&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const data = await fetchJson(url);
    const timeSeries = data?.['Monthly Time Series'];
    
    if (timeSeries) {
      const dates = Object.keys(timeSeries).sort().reverse();
      
      // Valeur actuelle (dernier mois disponible)
      const latestDate = dates[0];
      const latestClose = parseFloat(timeSeries[latestDate]?.['4. close'] ?? '0');
      
      // Valeur il y a 5 ans (60 mois)
      // Chercher la date la plus proche de 5 ans en arrière
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const targetDate = fiveYearsAgo.toISOString().slice(0, 7); // YYYY-MM
      
      // Trouver la date la plus proche dans les données
      let oldDate = dates.find(d => d.startsWith(targetDate)) || dates.find(d => d < targetDate);
      if (!oldDate) oldDate = dates[dates.length - 1];
      
      const oldClose = parseFloat(timeSeries[oldDate]?.['4. close'] ?? '0');
      
      console.log(`CAC40: ${oldDate} (${oldClose}) -> ${latestDate} (${latestClose})`);
      
      if (latestClose > 0 && oldClose > 0) {
        // Calcul du rendement annualisé: ((valeur finale / valeur initiale)^(1/n)) - 1
        const totalReturn = latestClose / oldClose;
        const years = 5;
        const annualized = (Math.pow(totalReturn, 1 / years) - 1) * 100;
        console.log(`CAC40 annualisé 5 ans: ${annualized.toFixed(2)}%`);
        return Math.round(annualized * 100) / 100;
      }
    }
  } catch (e) {
    console.error('Erreur CAC40:', e.message);
  }
  return 7.92;
}

// SCPI moyenne 5 ans (données ASPIM-IEIF - pas d'API disponible)
function getSCPI5() {
  // Taux de distribution moyen des SCPI 2020-2024 (source: ASPIM-IEIF)
  const rates = [4.18, 4.45, 4.53, 4.52, 4.72];
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  return Math.round(avg * 100) / 100;
}

// Template pour route.ts (pour le site Vercel)
const template = (payload) => `// app/api/taux/route.ts
// Mis à jour automatiquement par GitHub Actions
// Dernière mise à jour: ${payload.asof}

export async function GET() {
  const data = ${JSON.stringify(payload, null, 4)};

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
`;

(async () => {
  console.log('🔄 Récupération des taux depuis les APIs...');
  console.log('FRED_API_KEY:', FRED_API_KEY ? '✓ configurée' : '✗ manquante');
  console.log('ALPHA_VANTAGE_API_KEY:', ALPHA_VANTAGE_API_KEY ? '✓ configurée' : '✗ manquante');

  const [estr, oat10, inflation, cac5] = await Promise.all([
    fetchESTR(),
    fetchOAT10(),
    fetchInflation(),
    fetchCAC5(),
  ]);

  const scpi5 = getSCPI5();

  const payload = {
    asof: formatDateFR(),
    estr: Math.round(estr * 100) / 100,
    oat10: Math.round(oat10 * 100) / 100,
    cac5: cac5,
    scpi5: scpi5,
    inflation: Math.round(inflation * 100) / 100
  };

  console.log('\n📊 Taux récupérés:');
  console.log('  €STR:', payload.estr, '%');
  console.log('  OAT 10 ans:', payload.oat10, '%');
  console.log('  CAC40 5 ans ann.:', payload.cac5, '%');
  console.log('  SCPI 5 ans moy.:', payload.scpi5, '%');
  console.log('  Inflation:', payload.inflation, '%');

  const file = path.join(process.cwd(), 'app', 'api', 'taux', 'route.ts');
  fs.writeFileSync(file, template(payload), 'utf8');
  console.log('\n✅ route.ts mis à jour avec succès');
})();
