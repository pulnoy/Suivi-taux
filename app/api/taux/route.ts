import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { HISTORICAL_DATA } from '@/lib/historical-data';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'taux.json');

  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    // Merge hard-coded historical data for indices lacking early history.
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

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Erreur lecture taux.json:', error);
    return NextResponse.json(
      { error: "Erreur lors de la lecture des taux" },
      { status: 500 }
    );
  }
}
