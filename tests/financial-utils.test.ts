import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SAVINGS_KEYS,
  calculateAllStats,
  calculateAnnualizedReturn,
  calculateCorrelation,
  calculateVolatility,
  computeCapitalizedSeries,
  computeOvernightCompoundedIndex,
  convertPriceSeriesToEuro,
  inferPeriodsPerYear,
} from '../lib/financial-utils.ts';
import {
  getInstrumentKind,
  getRequiredFxKeys,
  isPerformanceSeries,
} from '../lib/instrument-config.ts';

const weekly = [
  { date: '2026-01-02', value: 100 },
  { date: '2026-01-09', value: 102 },
  { date: '2026-01-16', value: 101 },
  { date: '2026-01-23', value: 104 },
];

test('annualise selon la fréquence réellement observée', () => {
  assert.equal(inferPeriodsPerYear(weekly), 52);
  const volatility = calculateVolatility(weekly);
  assert.ok(volatility > 10 && volatility < 20);
});

test('refuse un rendement annualisé lorsque la série traverse zéro', () => {
  assert.ok(Number.isNaN(calculateAnnualizedReturn(-0.5, 2, 365)));
});

test('aligne les corrélations sur les clôtures mensuelles', () => {
  const first = [
    { date: '2026-01-30', value: 100 },
    { date: '2026-02-27', value: 102 },
    { date: '2026-03-31', value: 99 },
    { date: '2026-04-30', value: 104 },
  ];
  const second = [
    { date: '2026-01-29', value: 200 },
    { date: '2026-02-26', value: 204 },
    { date: '2026-03-30', value: 198 },
    { date: '2026-04-29', value: 208 },
  ];
  assert.ok(calculateCorrelation(first, second) > 0.999);
});

test('exclut les points interpolés des statistiques', () => {
  const stats = calculateAllStats([
    { date: '2025-01-01', value: 100 },
    { date: '2025-06-01', value: 500, quality: 'interpolated' },
    { date: '2026-01-01', value: 110 },
  ]);
  assert.equal(stats.startValue, 100);
  assert.equal(stats.endValue, 110);
  assert.ok(Math.abs(stats.totalReturn - 10) < 1e-10);
});

test('ne capitalise que les placements réellement simulables', () => {
  assert.deepEqual(SAVINGS_KEYS, ['livreta', 'pel', 'fondsEuros', 'scpi']);
  assert.deepEqual(computeCapitalizedSeries(weekly, 'oat', 100), []);
});

test('capitalise les distributions annuelles des SCPI sur le bon exercice', () => {
  const capitalized = computeCapitalizedSeries([
    { date: '2023-12-31', value: 4.52 },
    { date: '2024-12-31', value: 4.72 },
    { date: '2025-12-31', value: 4.91 },
  ], 'scpi', 100);

  assert.deepEqual(capitalized, [
    { date: '2023-12-31', value: 100 },
    { date: '2024-12-31', value: 104.72 },
    { date: '2025-12-31', value: 109.8618 },
  ]);
});

test('capitalise l’€STR en ACT/360, week-end compris', () => {
  const compounded = computeOvernightCompoundedIndex([
    { date: '2026-01-02', value: 3.6 },
    { date: '2026-01-05', value: 3.6 },
    { date: '2026-01-06', value: 3.6 },
  ]);

  assert.deepEqual(compounded, [
    { date: '2026-01-02', value: 100 },
    { date: '2026-01-05', value: 100.03 },
    { date: '2026-01-06', value: 100.040003 },
  ]);
});

test('convertit un actif en euros sans utiliser de change futur', () => {
  const converted = convertPriceSeriesToEuro([
    { date: '2026-01-02', value: 120 },
    { date: '2026-01-03', value: 132 },
    { date: '2026-01-06', value: 143 },
  ], [
    { date: '2026-01-02', value: 1.2 },
    { date: '2026-01-05', value: 1.3 },
  ]);

  assert.deepEqual(converted, [
    { date: '2026-01-02', value: 100 },
    { date: '2026-01-03', value: 110 },
    { date: '2026-01-06', value: 110 },
  ]);
});

test('distingue placements, benchmarks et indicateurs', () => {
  assert.equal(getInstrumentKind('livreta'), 'placement');
  assert.equal(getInstrumentKind('estrCapitalise'), 'benchmark');
  assert.equal(getInstrumentKind('estr'), 'indicator');
  assert.equal(isPerformanceSeries('inflationCumulee'), true);
  assert.equal(isPerformanceSeries('inflation'), false);
  assert.deepEqual(getRequiredFxKeys(['cac40', 'sp500', 'gold', 'ftse']), ['eurusd', 'eurgbp']);
});
