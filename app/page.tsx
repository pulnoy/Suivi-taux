'use client';

import { useState, useEffect } from 'react';
import { Comparator } from '@/components/comparator';
import { TimelineCrises } from '@/components/timeline-crises';
import { ThemeToggle } from '@/components/theme-toggle';
import { PresentationClient } from '@/components/presentation-client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutDashboard, 
  Clock,
  RefreshCw,
  Presentation
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPES ---
type DataPoint = { date: string; value: number; timestamp?: number };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[] };
type JsonData = { date_mise_a_jour: string; indices: Record<string, Indicateur> };

// --- LOADING SKELETON ---
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function Dashboard() {
  const [data, setData] = useState<JsonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeMainTab, setActiveMainTab] = useState<'comparator' | 'timeline'>('comparator');
  const [showPresentation, setShowPresentation] = useState(false);
  
  // Comparator state
  const [comparatorKeys, setComparatorKeys] = useState<string[]>([]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/taux.json');
        if (!res.ok) throw new Error('Erreur lors du chargement des données');
        const jsonData = await res.json();
        setData(jsonData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive text-lg mb-4">{error || 'Données non disponibles'}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Mode présentation client (plein écran) */}
      {showPresentation && (
        <PresentationClient
          indices={data.indices}
          selectedKeys={comparatorKeys}
          dateMAJ={data.date_mise_a_jour}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {/* Header compact avec onglets intégrés */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          {/* Logo et date de mise à jour */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl md:text-2xl font-extrabold text-[#003A7A] dark:text-blue-400 tracking-tight whitespace-nowrap">
              Suivi-Taux
            </h1>
            <span className="hidden sm:inline text-xs text-muted-foreground whitespace-nowrap">
              {new Date(data.date_mise_a_jour).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
          
          {/* Onglets de navigation + bouton présentation */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setActiveMainTab('comparator')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  activeMainTab === 'comparator'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Tableau de bord</span>
              </button>
              <button
                onClick={() => setActiveMainTab('timeline')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  activeMainTab === 'timeline'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </button>
            </div>

            {/* Bouton Présentation client */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPresentation(true)}
              className="flex items-center gap-1.5 border-[#003A7A] text-[#003A7A] hover:bg-[#003A7A] hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-white transition-colors"
            >
              <Presentation className="h-4 w-4" />
              <span className="hidden sm:inline">Présentation</span>
            </Button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Tableau de bord */}
        {activeMainTab === 'comparator' && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <Comparator
              indices={data.indices}
              selectedKeys={comparatorKeys}
              onKeysChange={setComparatorKeys}
            />
          </div>
        )}

        {/* Timeline Tab */}
        {activeMainTab === 'timeline' && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground">Timeline des Crises Financières</h2>
              <p className="text-sm text-muted-foreground">
                Principales crises économiques et leur impact sur les marchés
              </p>
            </div>
            <TimelineCrises />
          </div>
        )}
      </div>

      {/* Footer compact */}
      <footer className="border-t border-border mt-6">
        <div className="max-w-7xl mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          <p>
            Données: FRED API, BCE, Yahoo Finance, INSEE, ASPIM • Mise à jour quotidienne • Gillian Noësen
          </p>
        </div>
      </footer>
    </main>
  );
}
