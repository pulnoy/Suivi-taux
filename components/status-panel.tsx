'use client';

import { INDEX_EDUCATION } from '@/lib/educational-data';
import { UPDATE_FREQUENCY, getIndexStatus, type IndexStatus } from '@/lib/staleness';

type DataPoint = { date: string; value: number };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[] };

interface StatusPanelProps {
  indices: Record<string, Indicateur>;
  dateMiseAJour: string;
}

const DOT: Record<IndexStatus, string> = {
  ok:    'bg-green-500',
  stale: 'bg-orange-400',
  fail:  'bg-destructive',
};

const LABEL: Record<IndexStatus, string> = {
  ok:    'OK',
  stale: 'Périmé',
  fail:  'Échec',
};

export function StatusPanel({ indices, dateMiseAJour }: StatusPanelProps) {
  const rows = Object.entries(indices).map(([key, idx]) => {
    const h = idx.historique ?? [];
    const lastValueDate = h.length > 0 ? h[h.length - 1].date : null;
    const status = getIndexStatus(key, h.length, idx.valeur, lastValueDate);
    const edu = INDEX_EDUCATION[key];
    const freq = UPDATE_FREQUENCY[key];
    return {
      key,
      titre: idx.titre,
      lastValueDate,
      status,
      pts: h.length,
      source: edu?.source ?? '—',
      sourceUrl: edu?.sourceUrl,
      freqLabel: freq?.label ?? '—',
      maxDays: freq?.maxDays,
    };
  });

  const okCount     = rows.filter(r => r.status === 'ok').length;
  const staleCount  = rows.filter(r => r.status === 'stale').length;
  const failCount   = rows.filter(r => r.status === 'fail').length;

  const updateStr = new Date(dateMiseAJour).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Statut des indices</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Dernière mise à jour : {updateStr}</p>
        </div>
        <div className="flex items-center gap-3 text-sm flex-wrap justify-end">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
            <span className="text-muted-foreground">{okCount} OK</span>
          </span>
          {staleCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block" />
              <span className="text-muted-foreground">{staleCount} Périmé</span>
            </span>
          )}
          {failCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive inline-block" />
              <span className="text-muted-foreground">{failCount} Échec</span>
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 w-6" />
              <th className="pb-2 pr-4 font-medium">Indice</th>
              <th className="pb-2 pr-4 font-medium">Clé</th>
              <th className="pb-2 pr-4 font-medium">Source</th>
              <th className="pb-2 pr-4 font-medium">Fréquence cible</th>
              <th className="pb-2 pr-4 font-medium">Dernière valeur</th>
              <th className="pb-2 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-2 pr-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full inline-block ${DOT[r.status]}`}
                    title={LABEL[r.status]}
                  />
                </td>
                <td className="py-2 pr-4 font-medium text-foreground">{r.titre}</td>
                <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{r.key}</td>
                <td className="py-2 pr-4 text-xs text-muted-foreground">
                  {r.sourceUrl ? (
                    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="hover:text-foreground hover:underline transition-colors">
                      {r.source}
                    </a>
                  ) : r.source}
                </td>
                <td className="py-2 pr-4 text-xs text-muted-foreground">
                  <span className={r.status === 'stale' ? 'text-orange-500 font-medium' : ''}>
                    {r.freqLabel}
                    {r.maxDays != null && (
                      <span className="text-muted-foreground/60 ml-1">(max {r.maxDays}j)</span>
                    )}
                  </span>
                </td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {r.lastValueDate ? (
                    <span className={r.status === 'stale' ? 'text-orange-500 font-medium' : ''}>
                      {r.lastValueDate}
                    </span>
                  ) : (
                    <span className="text-destructive">—</span>
                  )}
                </td>
                <td className="py-2 text-muted-foreground">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
