import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchCAC40, fetchSCPI, fetchInflation } from '@/lib/financial-apis';

export const dynamic = 'force-dynamic';

const RATE_DESCRIPTIONS: Record<string, { description: string; source: string }> = {
  ESTR: {
    description: 'Taux interbancaire au jour le jour de la zone euro',
    source: 'Banque Centrale Européenne (BCE)',
  },
  OAT10: {
    description: 'Rendement des obligations du Trésor français à 10 ans',
    source: 'FRED API / Banque de France',
  },
  CAC40: {
    description: 'Performance annualisée de l\'indice CAC40 sur 5 ans',
    source: 'Alpha Vantage / Euronext',
  },
  SCPI: {
    description: 'Taux de distribution moyen des SCPI',
    source: 'ASPIM-IEIF (données officielles)',
  },
  INFLATION: {
    description: 'Inflation annuelle France (IPC)',
    source: 'FRED API (World Bank)',
  },
};

// Données annuelles par défaut
const DEFAULT_YEARLY_DATA: Record<string, { year: number; value: number; isYTD?: boolean }[]> = {
  CAC40: [
    { year: 2021, value: 29.00 },
    { year: 2022, value: -9.50 },
    { year: 2023, value: 16.50 },
    { year: 2024, value: -2.15 },
    { year: 2025, value: 10.00 },
    { year: 2026, value: 3.50, isYTD: true },
  ],
  SCPI: [
    { year: 2021, value: 4.45 },
    { year: 2022, value: 4.53 },
    { year: 2023, value: 4.52 },
    { year: 2024, value: 4.72 },
    { year: 2025, value: 4.70 },
  ],
  INFLATION: [
    { year: 2020, value: 0.48 },
    { year: 2021, value: 1.64 },
    { year: 2022, value: 5.22 },
    { year: 2023, value: 4.88 },
    { year: 2024, value: 2.00 },
  ],
};

interface RateItem {
  type: string;
  value: number;
  previousValue: number | null;
  date: string;
  lastUpdate: string;
  history: { date: string; value: number }[];
  yearlyData?: { year: number; value: number; isYTD?: boolean }[];
  description: string;
  source: string;
}

export async function GET() {
  try {
    // Récupérer les données annuelles pour CAC40, SCPI et Inflation
    const [cac40Data, scpiData, inflationData] = await Promise.all([
      fetchCAC40().catch(() => null),
      fetchSCPI().catch(() => null),
      fetchInflation().catch(() => null),
    ]);

    // Récupérer les derniers taux pour chaque type
    const rateTypes = ['ESTR', 'OAT10', 'CAC40', 'SCPI', 'INFLATION'];
    const rates: RateItem[] = [];

    for (const type of rateTypes) {
      // Récupérer les 30 derniers enregistrements pour l'historique
      const history = await prisma?.financialRate?.findMany?.({
        where: { type },
        orderBy: { date: 'desc' },
        take: 30,
      }) ?? [];

      if (history?.length > 0) {
        const latest = history?.[0];
        const previous = history?.[1] ?? null;

        const rateItem: RateItem = {
          type,
          value: latest?.value ?? 0,
          previousValue: previous?.value ?? null,
          date: latest?.date?.toISOString?.() ?? new Date().toISOString(),
          lastUpdate: latest?.updatedAt?.toISOString?.() ?? new Date().toISOString(),
          history: (history ?? [])?.reverse?.()?.map?.((h: any) => ({
            date: h?.date?.toISOString?.() ?? '',
            value: h?.value ?? 0,
          })) ?? [],
          description: RATE_DESCRIPTIONS?.[type]?.description ?? '',
          source: RATE_DESCRIPTIONS?.[type]?.source ?? '',
        };

        // Ajouter les données annuelles pour CAC40, SCPI et Inflation
        if (type === 'CAC40') {
          rateItem.yearlyData = cac40Data?.yearlyPerformances ?? DEFAULT_YEARLY_DATA.CAC40;
        } else if (type === 'SCPI') {
          rateItem.yearlyData = scpiData?.yearlyPerformances ?? DEFAULT_YEARLY_DATA.SCPI;
        } else if (type === 'INFLATION') {
          rateItem.yearlyData = inflationData?.yearlyData ?? DEFAULT_YEARLY_DATA.INFLATION;
        }

        rates?.push?.(rateItem);
      } else {
        // Si pas de données, retourner une valeur par défaut
        const rateItem: RateItem = {
          type,
          value: 0,
          previousValue: null,
          date: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          history: [],
          description: RATE_DESCRIPTIONS?.[type]?.description ?? '',
          source: RATE_DESCRIPTIONS?.[type]?.source ?? '',
        };

        // Ajouter les données annuelles pour CAC40, SCPI et Inflation
        if (type === 'CAC40') {
          rateItem.yearlyData = cac40Data?.yearlyPerformances ?? DEFAULT_YEARLY_DATA.CAC40;
        } else if (type === 'SCPI') {
          rateItem.yearlyData = scpiData?.yearlyPerformances ?? DEFAULT_YEARLY_DATA.SCPI;
        } else if (type === 'INFLATION') {
          rateItem.yearlyData = inflationData?.yearlyData ?? DEFAULT_YEARLY_DATA.INFLATION;
        }

        rates?.push?.(rateItem);
      }
    }

    return NextResponse.json({
      rates,
      lastRefresh: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
}
