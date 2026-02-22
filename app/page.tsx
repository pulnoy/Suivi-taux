'use client';

import { useState, useEffect } from 'react';
import { Comparator } from '@/components/comparator';
import { TimelineCrises } from '@/components/timeline-crises';
import { ThemeToggle } from '@/components/theme-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutDashboard, 
  Clock,
  RefreshCw
} from 'lucide-react';

// --- TYPES ---
type DataPoint = { date: string; value: number; timestamp?: number };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[] };
type JsonData = { date_mise_a_jour: string; indices: Record<string, Indicateur> };

// --- LOADING SKELETON ---
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <Skeleton className="h-10 w-80 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
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
  
  const [activeMainTab, setActiveMainTab] = useState('comparator');
  
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
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
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#003A7A] dark:text-blue-400 tracking-tight">
              Suivi-Taux
            </h1>
            <p className="text-xs text-muted-foreground">
              Mise à jour : {new Date(data.date_mise_a_jour).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="comparator" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Tableau de bord</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline Crises</span>
            </TabsTrigger>
          </TabsList>

          {/* Tableau de bord (anciennement Comparator) */}
          <TabsContent value="comparator">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground mb-2">Tableau de bord</h2>
                <p className="text-sm text-muted-foreground">
                  Comparez jusqu'à 5 indices
                </p>
              </div>
              <Comparator
                indices={data.indices}
                selectedKeys={comparatorKeys}
                onKeysChange={setComparatorKeys}
              />
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground mb-2">Timeline des Crises Financières</h2>
                <p className="text-sm text-muted-foreground">
                  Découvrez les principales crises économiques et leur impact sur les marchés financiers
                </p>
              </div>
              <TimelineCrises />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground">
          <p>
            Données fournies par FRED API, Yahoo Finance et ASPIM. 
            Mise à jour automatique quotidienne.
          </p>
          <p className="mt-1">
            Gillian Noësen
          </p>
        </div>
      </footer>
    </main>
  );
}
