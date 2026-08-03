import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import { computeOvernightCompoundedIndex } from '@/lib/financial-utils';
import type { DataPoint, Indicateur, TauxData } from '@/lib/taux-types';

let cache: { mtimeMs: number; data: TauxData } | null = null;

export async function readTauxData(): Promise<TauxData> {
  const filePath = path.join(process.cwd(), 'public', 'taux.json');
  const stat = await fs.stat(filePath);

  if (cache?.mtimeMs === stat.mtimeMs) return cache.data;

  const fileContents = await fs.readFile(filePath, 'utf8');
  const data = withDerivedIndices(JSON.parse(fileContents) as TauxData);
  cache = { mtimeMs: stat.mtimeMs, data };
  return data;
}

function withDerivedIndices(data: TauxData): TauxData {
  const estr = data.indices.estr;
  if (!estr) return data;

  const historique = computeOvernightCompoundedIndex(estr.historique);
  const lastPoint = historique.at(-1);
  const estrCapitalise: Indicateur = {
    titre: 'Monétaire €STR capitalisé',
    valeur: lastPoint?.value ?? null,
    suffixe: 'pts',
    historique,
    nombre_points: historique.length,
    metadata: {
      source: 'BCE, calcul ACT/360',
      fetchedAt: estr.metadata?.fetchedAt ?? data.date_mise_a_jour,
      lastObservationDate: lastPoint?.date ?? null,
      status: estr.metadata?.status ?? (lastPoint ? 'ok' : 'error'),
      fallbackUsed: estr.metadata?.fallbackUsed ?? false,
      ...(estr.metadata?.error ? { error: estr.metadata.error } : {}),
    },
  };

  return {
    ...data,
    indices: { ...data.indices, estrCapitalise },
  };
}

function sortedHistory(indicator: Indicateur): DataPoint[] {
  return [...(indicator.historique ?? [])]
    .filter(point => point && Number.isFinite(point.value) && /^\d{4}-\d{2}-\d{2}$/.test(point.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function summarizeTauxData(data: TauxData): TauxData {
  const indices = Object.fromEntries(
    Object.entries(data.indices).map(([key, indicator]) => {
      const history = sortedHistory(indicator);
      const lastPoint = history.at(-1);
      return [key, {
        ...indicator,
        historique: lastPoint ? [lastPoint] : [],
        nombre_points: history.length,
      }];
    })
  );

  return { ...data, indices };
}

export function selectTauxData(
  data: TauxData,
  keys: string[],
  from?: string | null,
  to?: string | null
): TauxData {
  const uniqueKeys = [...new Set(keys)].filter(key => key in data.indices).slice(0, 5);
  const indices = Object.fromEntries(
    uniqueKeys.map(key => {
      const indicator = data.indices[key];
      const completeHistory = sortedHistory(indicator);
      const historique = completeHistory.filter(point => {
        if (from && point.date < from) return false;
        if (to && point.date > to) return false;
        return point.quality !== 'interpolated';
      });
      return [key, { ...indicator, historique, nombre_points: completeHistory.length }];
    })
  );

  return { ...data, indices };
}
