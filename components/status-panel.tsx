'use client';

type DataPoint = { date: string; value: number };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[] };

interface StatusPanelProps {
  indices: Record<string, Indicateur>;
  dateMiseAJour: string;
}

export function StatusPanel({ indices, dateMiseAJour }: StatusPanelProps) {
  const rows = Object.entries(indices).map(([key, idx]) => {
    const h = idx.historique ?? [];
    const lastValueDate = h.length > 0 ? h[h.length - 1].date : null;
    const ok = h.length > 0 && idx.valeur !== 0;
    return { key, titre: idx.titre, lastValueDate, ok, pts: h.length };
  });

  const updateStr = new Date(dateMiseAJour).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">Statut des indices</h2>
        <p className="text-xs text-muted-foreground">Dernière mise à jour du fichier : {updateStr}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Indice</th>
              <th className="pb-2 pr-4 font-medium">Clé</th>
              <th className="pb-2 pr-4 font-medium">Dernière valeur</th>
              <th className="pb-2 pr-4 font-medium">Points</th>
              <th className="pb-2 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-2 pr-4 font-medium text-foreground">{r.titre}</td>
                <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{r.key}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {r.lastValueDate ?? <span className="text-destructive">—</span>}
                </td>
                <td className="py-2 pr-4 text-muted-foreground">{r.pts}</td>
                <td className="py-2">
                  {r.ok ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                      OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive inline-block" />
                      Échec
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
