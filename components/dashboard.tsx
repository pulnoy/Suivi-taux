'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Activity, Clock, LayoutDashboard, Loader2 } from 'lucide-react';
import { Comparator } from '@/components/comparator';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { getIndexStatus } from '@/lib/staleness';
import { getRequiredFxKeys } from '@/lib/instrument-config';
import type { TauxData } from '@/lib/taux-types';

const StatusPanel = dynamic(() => import('@/components/status-panel').then(mod => mod.StatusPanel));
const TimelineCrises = dynamic(() => import('@/components/timeline-crises').then(mod => mod.TimelineCrises));

type MainTab = 'comparator' | 'timeline' | 'status';

export function Dashboard({ initialData }: { initialData: TauxData }) {
  const [data, setData] = useState(initialData);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('comparator');
  const [comparatorKeys, setComparatorKeys] = useState<string[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const pendingKeys = useRef(new Set<string>());

  const statusSummary = useMemo(() => {
    const statuses = Object.entries(data.indices).map(([key, indicator]) => {
      const history = indicator.historique ?? [];
      const lastDate = indicator.metadata?.lastObservationDate ?? history.at(-1)?.date ?? null;
      return getIndexStatus(key, indicator.nombre_points ?? history.length, indicator.valeur, lastDate);
    });
    return {
      hasFail: statuses.some(status => status === 'fail'),
      hasStale: statuses.some(status => status === 'stale'),
    };
  }, [data.indices]);

  const loadHistories = useCallback(async (keys: string[]) => {
    const missing = keys.filter(key => {
      const indicator = data.indices[key];
      const expectedPoints = indicator?.nombre_points ?? 0;
      return expectedPoints > (indicator?.historique.length ?? 0) && !pendingKeys.current.has(key);
    });
    if (missing.length === 0) return;

    missing.forEach(key => pendingKeys.current.add(key));
    setLoadingKeys(current => [...new Set([...current, ...missing])]);
    setHistoryError(null);

    try {
      const response = await fetch(`/api/taux?keys=${encodeURIComponent(missing.join(','))}`);
      if (!response.ok) throw new Error('Chargement impossible');
      const loaded = await response.json() as TauxData;
      setData(current => ({
        ...current,
        date_mise_a_jour: loaded.date_mise_a_jour,
        indices: { ...current.indices, ...loaded.indices },
      }));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Chargement impossible');
    } finally {
      missing.forEach(key => pendingKeys.current.delete(key));
      setLoadingKeys(current => current.filter(key => !missing.includes(key)));
    }
  }, [data.indices]);

  const handleKeysChange = useCallback((keys: string[]) => {
    setComparatorKeys(keys);
    void loadHistories([...keys, ...getRequiredFxKeys(keys)]);
  }, [loadHistories]);

  const dotClass = statusSummary.hasFail
    ? 'bg-red-400'
    : statusSummary.hasStale
      ? 'bg-orange-400'
      : 'bg-green-400';

  return (
    <main className="min-h-screen bg-background">
      <header className="app-header sticky top-0 z-50 w-full relative">
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-white/30 to-transparent dark:hidden pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl md:text-2xl font-extrabold text-white dark:text-blue-400 whitespace-nowrap">
              Suivi-Taux
            </h1>
            <button
              type="button"
              onClick={() => setActiveMainTab(activeMainTab === 'status' ? 'comparator' : 'status')}
              className="hidden sm:inline text-xs text-white/60 dark:text-muted-foreground whitespace-nowrap hover:text-white dark:hover:text-foreground transition-colors"
              aria-label="Voir le statut des indices"
            >
              {new Date(data.date_mise_a_jour).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/[0.12] dark:bg-muted rounded-lg p-0.5" role="tablist" aria-label="Navigation principale">
              <NavTab active={activeMainTab === 'comparator'} onClick={() => setActiveMainTab('comparator')} icon={<LayoutDashboard className="h-4 w-4" />} label="Tableau de bord" />
              <NavTab active={activeMainTab === 'timeline'} onClick={() => setActiveMainTab('timeline')} icon={<Clock className="h-4 w-4" />} label="Timeline" />
              <NavTab active={activeMainTab === 'status'} onClick={() => setActiveMainTab('status')} icon={<Activity className="h-4 w-4" />} label="Statut">
                <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
                <span className="sr-only">{statusSummary.hasFail ? 'Indices en échec' : statusSummary.hasStale ? 'Indices périmés' : 'Tous les indices sont à jour'}</span>
              </NavTab>
            </div>
            <div className="[&>button]:text-white/80 dark:[&>button]:text-foreground [&>button]:hover:text-white dark:[&>button]:hover:text-foreground">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-3">
        {activeMainTab === 'comparator' ? (
          <div className="bg-card rounded-xl border border-border shadow-lbp-md p-4">
            {loadingKeys.length > 0 ? (
              <div className="mb-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Chargement de l'historique
              </div>
            ) : null}
            {historyError ? <p className="mb-2 text-right text-xs text-destructive" role="alert">{historyError}</p> : null}
            <Comparator indices={data.indices} selectedKeys={comparatorKeys} onKeysChange={handleKeysChange} />
          </div>
        ) : null}

        {activeMainTab === 'status' ? <StatusPanel indices={data.indices} dateMiseAJour={data.date_mise_a_jour} /> : null}

        {activeMainTab === 'timeline' ? (
          <div className="bg-card rounded-xl border border-border shadow-lbp-md p-4">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground">Timeline des crises financières</h2>
              <p className="text-sm text-muted-foreground">Principales crises économiques et leur impact sur les marchés</p>
            </div>
            <TimelineCrises />
          </div>
        ) : null}
      </div>

      <footer className="border-t border-border mt-6">
        <div className="max-w-7xl mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          <p>Données : FRED, BCE, Banque de France, Yahoo Finance, INSEE et ASPIM • Gillian Noësen</p>
        </div>
      </footer>
    </main>
  );
}

function NavTab({ active, onClick, icon, label, children }: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-label={label}
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
        active
          ? 'bg-white/25 dark:bg-background text-white dark:text-foreground shadow-sm'
          : 'text-white/70 dark:text-muted-foreground hover:text-white dark:hover:text-foreground'
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {children}
    </button>
  );
}
