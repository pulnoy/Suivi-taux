// APIs pour récupérer les données financières en temps réel

const FRED_API_KEY = process.env.FRED_API_KEY || '';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

/**
 * Récupère le taux €STR depuis l'API de la BCE
 */
export async function fetchESTR(): Promise<{ value: number; date: string } | null> {
  try {
    const response = await fetch('https://api.estr.dev/latest', {
      next: { revalidate: 0 },
    });
    if (response?.ok) {
      const data = await response.json();
      return {
        value: data?.rate ?? 1.93,
        date: data?.date ?? new Date().toISOString().split('T')[0],
      };
    }
  } catch (error) {
    console.error('Erreur fetch €STR:', error);
  }
  return null;
}

/**
 * Récupère le taux OAT 10 ans depuis FRED API
 * Série: IRLTLT01FRM156N (France 10-Year Government Bond Yield)
 */
export async function fetchOAT10(): Promise<{ value: number; date: string } | null> {
  if (!FRED_API_KEY) {
    console.warn('FRED_API_KEY non configurée - utilisation valeur par défaut OAT');
    return null;
  }
  
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=IRLTLT01FRM156N&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    const response = await fetch(url, { next: { revalidate: 0 } });
    
    if (response?.ok) {
      const data = await response.json();
      const observation = data?.observations?.[0];
      if (observation && observation.value !== '.') {
        return {
          value: parseFloat(observation.value),
          date: observation.date,
        };
      }
    }
  } catch (error) {
    console.error('Erreur fetch OAT 10 ans:', error);
  }
  return null;
}

/**
 * Récupère les données CAC40 via Alpha Vantage
 * Calcule le YTD en temps réel + performances historiques
 */
export async function fetchCAC40(): Promise<{
  currentValue: number;
  annualizedReturn: number;
  yearlyPerformances: { year: number; value: number; isYTD?: boolean }[];
} | null> {
  // Performances annuelles CAC40 historiques (données figées, ne changent plus)
  const historicalPerformances = [
    { year: 2021, value: 29.00 },
    { year: 2022, value: -9.50 },
    { year: 2023, value: 16.50 },
    { year: 2024, value: -2.15 },
    { year: 2025, value: 10.00 },
  ];
  
  let ytd2026 = 3.50; // Valeur par défaut
  let currentValue = 8150;
  
  // Récupérer le YTD via Alpha Vantage (ETF CAC.PAR = Amundi CAC 40)
  if (ALPHA_VANTAGE_API_KEY) {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=CAC.PAR&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const response = await fetch(url, { next: { revalidate: 0 } });
      
      if (response?.ok) {
        const data = await response.json();
        const timeSeries = data?.['Time Series (Daily)'];
        
        if (timeSeries) {
          const dates = Object.keys(timeSeries).sort().reverse();
          const latestDate = dates[0];
          const latestClose = parseFloat(timeSeries[latestDate]?.['4. close'] ?? '0');
          
          // Trouver la valeur au 31 décembre 2025 (ou dernière valeur de 2025)
          const dec2025Date = dates.find(d => d.startsWith('2025-12')) ?? dates.find(d => d.startsWith('2025'));
          // Valeur de référence fin 2025 pour l'ETF CAC.PAR (environ 78.50€)
          const dec2025Close = dec2025Date ? parseFloat(timeSeries[dec2025Date]?.['4. close'] ?? '0') : 78.50;
          
          if (latestClose > 0 && dec2025Close > 0) {
            ytd2026 = Math.round(((latestClose - dec2025Close) / dec2025Close) * 10000) / 100;
            // Convertir la valeur ETF en valeur CAC40 approximative (ETF ~1/100 du CAC)
            currentValue = Math.round(latestClose * 100);
          }
        }
      }
    } catch (error) {
      console.error('Erreur fetch CAC40 Alpha Vantage:', error);
    }
  }
  
  const yearlyPerformances = [
    ...historicalPerformances,
    { year: 2026, value: ytd2026, isYTD: true },
  ];
  
  // Calcul du rendement annualisé sur 5 ans (2021-2025)
  const returns5Y = historicalPerformances.map(p => 1 + p.value / 100);
  const totalReturn = returns5Y.reduce((acc, r) => acc * r, 1);
  const annualizedReturn = (Math.pow(totalReturn, 1 / 5) - 1) * 100;
  
  return {
    currentValue,
    annualizedReturn: Math.round(annualizedReturn * 100) / 100,
    yearlyPerformances,
  };
}

/**
 * Données SCPI - Taux de distribution moyen du marché
 * Source: ASPIM-IEIF (données officielles)
 */
export async function fetchSCPI(): Promise<{
  value: number;
  yearlyPerformances: { year: number; value: number }[];
} | null> {
  // Taux de distribution moyen des SCPI (source: ASPIM-IEIF)
  const yearlyPerformances = [
    { year: 2021, value: 4.45 },
    { year: 2022, value: 4.53 },
    { year: 2023, value: 4.52 },
    { year: 2024, value: 4.72 },
    { year: 2025, value: 4.70 },  // Estimation basée sur Q1 2025
  ];
  
  // Moyenne sur 5 ans
  const avg5Y = yearlyPerformances.reduce((sum, p) => sum + p.value, 0) / yearlyPerformances.length;
  
  return {
    value: Math.round(avg5Y * 100) / 100,
    yearlyPerformances,
  };
}

/**
 * Récupère l'inflation française via FRED API
 * Série: FPCPITOTLZGFRA (Inflation, consumer prices for France)
 */
export async function fetchInflation(): Promise<{
  value: number;
  yearlyData: { year: number; value: number }[];
} | null> {
  if (!FRED_API_KEY) {
    console.warn('FRED_API_KEY non configurée - utilisation valeur par défaut Inflation');
    return null;
  }
  
  try {
    // Récupérer les 6 dernières années
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=FPCPITOTLZGFRA&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=6`;
    const response = await fetch(url, { next: { revalidate: 0 } });
    
    if (response?.ok) {
      const data = await response.json();
      const observations = data?.observations ?? [];
      
      if (observations.length > 0) {
        const yearlyData: { year: number; value: number }[] = [];
        
        for (const obs of observations) {
          if (obs.value !== '.') {
            const year = parseInt(obs.date.substring(0, 4));
            const value = Math.round(parseFloat(obs.value) * 100) / 100;
            yearlyData.push({ year, value });
          }
        }
        
        // Trier par année croissante
        yearlyData.sort((a, b) => a.year - b.year);
        
        // Dernière valeur = inflation actuelle
        const latestValue = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1].value : 2.0;
        
        return {
          value: latestValue,
          yearlyData,
        };
      }
    }
  } catch (error) {
    console.error('Erreur fetch Inflation France:', error);
  }
  return null;
}

/**
 * Récupère toutes les données financières
 */
export async function fetchAllRates() {
  const [estr, oat10, cac40, scpi, inflation] = await Promise.all([
    fetchESTR(),
    fetchOAT10(),
    fetchCAC40(),
    fetchSCPI(),
    fetchInflation(),
  ]);
  
  return { estr, oat10, cac40, scpi, inflation };
}
