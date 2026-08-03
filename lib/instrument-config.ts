export type InstrumentKind = 'placement' | 'benchmark' | 'indicator';

const PLACEMENT_KEYS = new Set([
  'livreta',
  'pel',
  'fondsEuros',
  'scpi',
  'btc',
  'eth',
  'sol',
  'xrp',
  'gold',
]);

const INDICATOR_KEYS = new Set([
  'oat',
  'tec10',
  'estr',
  'tauxDepotBCE',
  'inflation',
  'tauxImmo',
  'prixImmo',
  'us10y',
  'bund',
  'jgb',
  'gilt',
  'eurusd',
  'eurgbp',
  'eurjpy',
  'eurchf',
  'eurcny',
]);

const THEORETICAL_BENCHMARK_KEYS = new Set(['estrCapitalise', 'inflationCumulee']);

const FX_KEY_BY_FOREIGN_ASSET: Record<string, string> = {
  sp500: 'eurusd',
  nasdaq: 'eurusd',
  world: 'eurusd',
  emerging: 'eurusd',
  brent: 'eurusd',
  gold: 'eurusd',
  btc: 'eurusd',
  eth: 'eurusd',
  sol: 'eurusd',
  xrp: 'eurusd',
  ftse: 'eurgbp',
  nikkei: 'eurjpy',
};

export function getInstrumentKind(key: string): InstrumentKind {
  if (INDICATOR_KEYS.has(key)) return 'indicator';
  if (PLACEMENT_KEYS.has(key)) return 'placement';
  return 'benchmark';
}

export function getInstrumentKindLabel(key: string): string {
  const kind = getInstrumentKind(key);
  if (kind === 'placement') return 'Placement';
  if (kind === 'indicator') return 'Indicateur';
  return THEORETICAL_BENCHMARK_KEYS.has(key) ? 'Benchmark théorique' : 'Benchmark';
}

export function isPerformanceSeries(key: string): boolean {
  return getInstrumentKind(key) !== 'indicator';
}

export function getFxKeyForAsset(key: string): string | null {
  return FX_KEY_BY_FOREIGN_ASSET[key] ?? null;
}

export function getRequiredFxKeys(keys: string[]): string[] {
  return [...new Set(keys.map(getFxKeyForAsset).filter((key): key is string => Boolean(key)))];
}
