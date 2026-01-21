
// scripts/update-taux.mjs
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const SOURCE_URL = process.env.SOURCE_URL || 'https://suivi-taux.vercel.app/api/taux'; // à adapter si besoin

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
  // asof au format JJ/MM/AAAA
  const pad = (n) => String(n).padStart(2,'0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

const tpl = (payload) => `import { NextResponse } from 'next/server';
export const revalidate = 0; // pas de cache ISR côté serveur
export async function GET() {
  return NextResponse.json(${JSON.stringify(payload, null, 2)});
}
`;

(async () => {
  const src = await fetchJson(SOURCE_URL);
  // Harmonise la forme renvoyée (asof en JJ/MM/AAAA)
  const payload = {
    asof: src.asof || formatDateFR(),
    estr: +src.estr,
    oat10: +src.oat10,
    cac5: +src.cac5,
    scpi5: +src.scpi5
  };

  const file = path.join(process.cwd(), 'app', 'api', 'taux', 'route.ts');
  fs.writeFileSync(file, tpl(payload), 'utf8');
  console.log('route.ts mis à jour avec', payload);
})();
``
