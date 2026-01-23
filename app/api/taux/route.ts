
// app/api/taux/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const estr = await fetch('https://www.global-rates.com/fr/taux-de-interet/ester.aspx', { cache: 'no-store' })
      .then(res => res.text())
      .then(html => {
        const match = html.match(/(\d{1,2},\d{2})\s*%/);
        return match ? parseFloat(match[1].replace(',', '.')) : null;
      });

    const oat10 = await fetch('https://fr.tradingeconomics.com/france/government-bond-yield', { cache: 'no-store' })
      .then(res => res.text())
      .then(html => {
        const match = html.match(/3,5[0-9]\s*%/); // Ajuster si besoin
        return match ? parseFloat(match[0].replace(',', '.')) : null;
      });

    const cac5 = 11.41; // À remplacer par un calcul dynamique si possible
    const scpi5 = 4.48; // Peut rester statique ou mis à jour manuellement

    const now = new Date();
    const asof = now.toLocaleDateString('fr-FR');

    return NextResponse.json({ estr, oat10, cac5, scpi5, asof });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des taux' }, { status: 500 });
  }
}
