import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { HISTORICAL_DATA } from '@/lib/historical-data';

export async function GET() {
  // Le chemin vers le fichier généré par notre script automatique
  const filePath = path.join(process.cwd(), 'public', 'taux.json');

  try {
    // On essaie de lire le fichier
    if (fs.existsSync(filePath)) {
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContents);

      // Merge hard-coded historical data for indices lacking early history.
      // Live data always takes precedence: we only prepend dates not already present.
      for (const key of Object.keys(HISTORICAL_DATA)) {
        if (data.indices[key]) {
          const existingDates = new Set(
            data.indices[key].historique.map((p: { date: string }) => p.date)
          );
          const newPoints = HISTORICAL_DATA[key]
            .filter(p => !existingDates.has(p.date))
            .map(p => ({ date: p.date, value: p.value }));
          if (newPoints.length > 0) {
            data.indices[key].historique = [
              ...newPoints,
              ...data.indices[key].historique,
            ].sort((a: { date: string }, b: { date: string }) =>
              a.date.localeCompare(b.date)
            );
          }
        }
      }

      // On renvoie les données au format JSON
      return NextResponse.json(data, { status: 200 });
    } else {
      // Si le fichier n'existe pas encore (première fois)
      return NextResponse.json(
        { message: "Les données sont en cours de génération..." },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la lecture des taux" },
      { status: 500 }
    );
  }
}
