import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // Le chemin vers le fichier généré par notre script automatique
  const filePath = path.join(process.cwd(), 'public', 'taux.json');

  try {
    // On essaie de lire le fichier
    if (fs.existsSync(filePath)) {
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContents);
      
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
