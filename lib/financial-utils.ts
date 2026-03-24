// Financial calculation utilities

export interface DataPoint {
  date: string;
  value: number;
  timestamp?: number;
}

export interface FinancialStats {
  startValue: number;
  endValue: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

/**
 * Calculate total return percentage
 */
export function calculateReturn(startValue: number, endValue: number): number {
  if (startValue === 0) return 0;
  return ((endValue - startValue) / Math.abs(startValue)) * 100;
}

/**
 * Calculate annualized return
 */
export function calculateAnnualizedReturn(
  startValue: number,
  endValue: number,
  days: number
): number {
  if (startValue === 0 || days <= 0) return 0;
  const totalReturn = endValue / startValue;
  const years = days / 365;
  return (Math.pow(totalReturn, 1 / years) - 1) * 100;
}

/**
 * Calculate volatility (standard deviation of returns)
 */
export function calculateVolatility(data: DataPoint[]): number {
  if (data.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1].value !== 0) {
      returns.push((data[i].value - data[i - 1].value) / Math.abs(data[i - 1].value));
    }
  }
  
  if (returns.length === 0) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
  
  // Annualized volatility (assuming daily data)
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

/**
 * Calculate maximum drawdown
 */
export function calculateMaxDrawdown(data: DataPoint[]): number {
  if (data.length < 2) return 0;
  
  let maxDrawdown = 0;
  let peak = data[0].value;
  
  for (const point of data) {
    if (point.value > peak) {
      peak = point.value;
    }
    const drawdown = ((peak - point.value) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

/**
 * Calculate Sharpe Ratio (simplified, assuming 0% risk-free rate)
 */
export function calculateSharpeRatio(data: DataPoint[]): number {
  if (data.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1].value !== 0) {
      returns.push((data[i].value - data[i - 1].value) / Math.abs(data[i - 1].value));
    }
  }
  
  if (returns.length === 0) return 0;
  
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.map(r => Math.pow(r - meanReturn, 2)).reduce((a, b) => a + b, 0) / returns.length
  );
  
  if (stdDev === 0) return 0;
  
  // Annualized Sharpe ratio
  return (meanReturn * 252) / (stdDev * Math.sqrt(252));
}

/**
 * Calculate correlation between two series
 */
export function calculateCorrelation(data1: DataPoint[], data2: DataPoint[]): number {
  // Align data by date
  const map1 = new Map(data1.map(d => [d.date, d.value]));
  const map2 = new Map(data2.map(d => [d.date, d.value]));
  
  const commonDates = [...map1.keys()].filter(date => map2.has(date));
  
  if (commonDates.length < 2) return 0;
  
  const values1 = commonDates.map(d => map1.get(d)!);
  const values2 = commonDates.map(d => map2.get(d)!);
  
  // Calculate returns
  const returns1: number[] = [];
  const returns2: number[] = [];
  
  for (let i = 1; i < values1.length; i++) {
    if (values1[i - 1] !== 0 && values2[i - 1] !== 0) {
      returns1.push((values1[i] - values1[i - 1]) / Math.abs(values1[i - 1]));
      returns2.push((values2[i] - values2[i - 1]) / Math.abs(values2[i - 1]));
    }
  }
  
  if (returns1.length < 2) return 0;
  
  const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
  const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;
  
  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;
  
  for (let i = 0; i < returns1.length; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }
  
  if (denom1 === 0 || denom2 === 0) return 0;
  
  return numerator / Math.sqrt(denom1 * denom2);
}

/**
 * Calculate all financial statistics for a data series
 */
export function calculateAllStats(data: DataPoint[]): FinancialStats {
  if (data.length < 2) {
    return {
      startValue: data[0]?.value ?? 0,
      endValue: data[data.length - 1]?.value ?? 0,
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
    };
  }
  
  const startValue = data[0].value;
  const endValue = data[data.length - 1].value;
  const days = Math.ceil(
    (new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  
  return {
    startValue,
    endValue,
    totalReturn: calculateReturn(startValue, endValue),
    annualizedReturn: calculateAnnualizedReturn(startValue, endValue, days),
    volatility: calculateVolatility(data),
    maxDrawdown: calculateMaxDrawdown(data),
    sharpeRatio: calculateSharpeRatio(data),
  };
}

/**
 * Filter data by date range
 */
export function filterDataByPeriod(
  data: DataPoint[],
  period: '1M' | '3M' | '6M' | '1A' | '5A' | 'YTD' | 'MAX',
  customStart?: Date,
  customEnd?: Date
): DataPoint[] {
  if (period === 'MAX') return data;
  
  const now = new Date();
  let startDate: Date;
  
  if (customStart && customEnd) {
    startDate = customStart;
    const endDate = customEnd;
    return data.filter(d => {
      const date = new Date(d.date);
      return date >= startDate && date <= endDate;
    });
  }
  
  switch (period) {
    case '1M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6M':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case '1A':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case '5A':
      startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      break;
    case 'YTD':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return data;
  }
  
  return data.filter(d => new Date(d.date) >= startDate);
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(data: DataPoint[], period: number): DataPoint[] {
  if (data.length < period) return [];
  
  const result: DataPoint[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.value, 0);
    result.push({
      date: data[i].date,
      value: sum / period,
    });
  }
  
  return result;
}

/**
 * Normalize data to base 100
 */
export function normalizeToBase100(data: DataPoint[]): DataPoint[] {
  if (data.length === 0) return [];
  
  const baseValue = data[0].value;
  if (baseValue === 0) return data;
  
  return data.map(d => ({
    ...d,
    value: (d.value / baseValue) * 100,
  }));
}

/**
 * Format number for display
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage change
 */
export function formatChange(value: number, withSign: boolean = true): string {
  const formatted = formatNumber(Math.abs(value));
  if (withSign) {
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  }
  return `${formatted}%`;
}

/**
 * Get variation between two values
 */
export function getVariation(current: number, previous: number, isRate: boolean = false): number {
  if (isRate) {
    return current - previous;
  }
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calculate linear regression for scatter plot
 */
export function calculateLinearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R²
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  
  for (const p of points) {
    const yPred = slope * p.x + intercept;
    ssRes += Math.pow(p.y - yPred, 2);
    ssTot += Math.pow(p.y - yMean, 2);
  }
  
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  
  return { slope, intercept, rSquared };
}



// ─── Constants for savings products ───

export const SAVINGS_KEYS = ['livreta', 'pel', 'fondsEuros', 'scpi', 'oat', 'tec10', 'tauxImmo', 'tauxDepotBCE', 'estr'];

export const COMPOUNDING_RULES: Record<string, 'annual' | 'quarterly' | 'monthly'> = {
  livreta: 'annual',
  pel: 'annual',
  fondsEuros: 'annual',
  scpi: 'quarterly',
  oat: 'monthly',
  tec10: 'monthly',
  tauxImmo: 'monthly',
  tauxDepotBCE: 'monthly',
  estr: 'monthly',
};

/**
 * Compute capitalized series for savings products.
 * Takes a rate history and returns a DataPoint[] of capital values starting from baseAmount.
 */
export function computeCapitalizedSeries(
  rateHistory: DataPoint[],
  productKey: string,
  baseAmount: number = 100
): DataPoint[] {
  const rule = COMPOUNDING_RULES[productKey];
  if (!rule || rateHistory.length === 0) return [];

  const sorted = [...rateHistory].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = new Date(sorted[0].date);
  const endDate = new Date(sorted[sorted.length - 1].date);

  const getRateAt = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0];
    let rate = sorted[0].value;
    for (const pt of sorted) {
      if (pt.date <= dateStr) rate = pt.value;
      else break;
    }
    return rate;
  };

  let capital = baseAmount;
  const result: DataPoint[] = [];

  if (rule === 'annual') {
    let pendingInterests = 0;
    let currentYear = startDate.getFullYear();
    const cursor = new Date(startDate);
    result.push({ date: sorted[0].date, value: baseAmount });

    while (cursor <= endDate) {
      const year = cursor.getFullYear();
      if (year > currentYear) {
        capital += pendingInterests;
        pendingInterests = 0;
        currentYear = year;
      }
      const dailyRate = getRateAt(cursor) / 100 / 365;
      pendingInterests += capital * dailyRate;
      if (cursor.getDate() === 1) {
        const dateStr = cursor.toISOString().split('T')[0];
        if (!result.some(r => r.date === dateStr)) {
          result.push({ date: dateStr, value: parseFloat((capital + pendingInterests).toFixed(4)) });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    capital += pendingInterests;
    const lastDate = sorted[sorted.length - 1].date;
    if (!result.some(r => r.date === lastDate)) {
      result.push({ date: lastDate, value: parseFloat(capital.toFixed(4)) });
    }
  } else if (rule === 'quarterly') {
    const cursor = new Date(startDate);
    let quarter = Math.floor(cursor.getMonth() / 3);
    result.push({ date: sorted[0].date, value: baseAmount });
    cursor.setMonth(cursor.getMonth() + 1);
    while (cursor <= endDate) {
      const currentQuarter = Math.floor(cursor.getMonth() / 3);
      if (currentQuarter !== quarter) {
        const rate = getRateAt(cursor) / 100 / 4;
        capital = capital * (1 + rate);
        quarter = currentQuarter;
      }
      const dateStr = cursor.toISOString().split('T')[0];
      result.push({ date: dateStr, value: parseFloat(capital.toFixed(4)) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    // monthly
    const cursor = new Date(startDate);
    result.push({ date: sorted[0].date, value: baseAmount });
    cursor.setMonth(cursor.getMonth() + 1);
    while (cursor <= endDate) {
      const monthlyRate = getRateAt(cursor) / 100 / 12;
      capital = capital * (1 + monthlyRate);
      const dateStr = cursor.toISOString().split('T')[0];
      result.push({ date: dateStr, value: parseFloat(capital.toFixed(4)) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return result;
}
