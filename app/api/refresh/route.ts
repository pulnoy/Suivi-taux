import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchESTR, fetchOAT10, fetchCAC40, fetchSCPI, fetchInflation } from '@/lib/financial-apis';

export const dynamic = 'force-dynamic';

// Valeurs par défaut si les APIs échouent
const DEFAULT_RATES: Record<string, number> = {
  ESTR: 1.93,
  OAT10: 3.52,
  CAC40: 8.00,
  SCPI: 4.58,
  INFLATION: 2.00,
};

export async function POST() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Récupérer les données depuis les APIs
    const [estrData, oat10Data, cac40Data, scpiData, inflationData] = await Promise.all([
      fetchESTR(),
      fetchOAT10(),
      fetchCAC40(),
      fetchSCPI(),
      fetchInflation(),
    ]);

    // Préparer les mises à jour avec les valeurs réelles ou par défaut
    const rateUpdates = [
      { 
        type: 'ESTR', 
        value: estrData?.value ?? DEFAULT_RATES.ESTR,
        source: estrData ? 'API BCE (estr.dev)' : 'Valeur par défaut',
      },
      { 
        type: 'OAT10', 
        value: oat10Data?.value ?? DEFAULT_RATES.OAT10,
        source: oat10Data ? 'API FRED (St. Louis Fed)' : 'Valeur par défaut',
      },
      { 
        type: 'CAC40', 
        value: cac40Data?.annualizedReturn ?? DEFAULT_RATES.CAC40,
        source: cac40Data ? 'Alpha Vantage / Euronext' : 'Valeur par défaut',
      },
      { 
        type: 'SCPI', 
        value: scpiData?.value ?? DEFAULT_RATES.SCPI,
        source: 'ASPIM-IEIF (données officielles)',
      },
      { 
        type: 'INFLATION', 
        value: inflationData?.value ?? DEFAULT_RATES.INFLATION,
        source: inflationData ? 'FRED API (World Bank)' : 'Valeur par défaut',
      },
    ];

    const results: { type: string; value: number; source: string; updated: boolean }[] = [];

    for (const rate of rateUpdates) {
      try {
        await prisma?.financialRate?.upsert?.({
          where: {
            type_date: {
              type: rate.type,
              date: today,
            },
          },
          update: {
            value: rate.value,
            updatedAt: new Date(),
          },
          create: {
            type: rate.type,
            value: rate.value,
            date: today,
          },
        });

        // Mettre à jour les métadonnées
        await prisma?.rateMetadata?.upsert?.({
          where: { type: rate.type },
          update: { 
            lastUpdate: new Date(),
            source: rate.source,
          },
          create: {
            type: rate.type,
            lastUpdate: new Date(),
            description: '',
            source: rate.source,
          },
        });

        results.push({ ...rate, updated: true });
      } catch (err) {
        console.error(`Erreur mise à jour ${rate.type}:`, err);
        results.push({ ...rate, updated: false });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Données mises à jour avec succès',
      updatedAt: new Date().toISOString(),
      details: results,
      apiStatus: {
        estr: !!estrData,
        oat10: !!oat10Data,
        cac40: !!cac40Data,
        scpi: !!scpiData,
        inflation: !!inflationData,
      },
    });
  } catch (error) {
    console.error('Erreur refresh rates:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des données' },
      { status: 500 }
    );
  }
}
