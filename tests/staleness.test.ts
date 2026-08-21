import assert from 'node:assert/strict';
import test from 'node:test';
import { getIndexStatus, UPDATE_FREQUENCY } from '../lib/staleness.ts';

test('tolère le calendrier de publication mensuel de l’IPC', () => {
  const originalNow = Date.now;
  Date.now = () => new Date('2026-08-21T12:00:00Z').getTime();

  try {
    assert.equal(UPDATE_FREQUENCY.inflation.maxDays, 80);
    assert.equal(UPDATE_FREQUENCY.inflationCumulee.maxDays, 80);
    assert.equal(getIndexStatus('inflation', 319, 2.12, '2026-07-01'), 'ok');
    assert.equal(getIndexStatus('inflationCumulee', 319, 156.8592, '2026-07-01'), 'ok');
    assert.equal(getIndexStatus('inflation', 318, 1.76, '2026-06-01'), 'stale');
  } finally {
    Date.now = originalNow;
  }
});
